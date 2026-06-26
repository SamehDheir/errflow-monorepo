import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { CryptoService } from '../../common/crypto/crypto.service';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cryptoService: CryptoService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) return null;

    if (user.isSuspended) {
      throw new UnauthorizedException('Account is suspended');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return null;

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto, isAdmin: boolean = false) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (isAdmin && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Access denied. Admin privileges required.');
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.organizationId,
    );

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
            slug: user.organization.slug,
            plan: user.organization.plan,
          }
        : null,
    };

    if (isAdmin) {
      return { admin: userData, ...tokens };
    }

    return { user: userData, ...tokens };
  }

  async register(
    email: string,
    password: string,
    name: string,
    organizationName?: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new UnauthorizedException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const orgSlug = `${email.split('@')[0]}-${Date.now()}`;
    const organization = await this.prisma.organization.create({
      data: {
        name: organizationName || `${name}'s Organization`,
        slug: orgSlug,
        plan: 'FREE',
        fixesUsedThisMonth: 0,
        fixesLimit: 10,
        billingCycleStart: new Date(),
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'OWNER',
        organizationId: organization.id,
      },
      include: { organization: true },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.organizationId,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          plan: user.organization.plan,
        },
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { organization: true },
      });

      if (!user) throw new UnauthorizedException();
      if (user.isSuspended) throw new UnauthorizedException('Account is suspended');

      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        user.organizationId,
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organization: user.organization
            ? {
                id: user.organization.id,
                name: user.organization.name,
                slug: user.organization.slug,
                plan: user.organization.plan,
              }
            : null,
        },
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    organizationId: string,
  ) {
    const payload = { sub: userId, email, role, organizationId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    await this.redis.set(
      `refresh_token:${userId}`,
      refreshToken,
      'EX',
      7 * 24 * 60 * 60,
    );

    return { accessToken, refreshToken };
  }

  async logout(userId: string, accessToken: string) {
    await this.redis.del(`refresh_token:${userId}`);

    try {
      const decoded = this.jwtService.decode(accessToken) as any;
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.set(`blacklist:${accessToken}`, '1', 'EX', ttl);
      }
    } catch (error) {}

    return { message: 'Logged out successfully' };
  }

  async isRefreshTokenBlocked(userId: string, refreshToken: string): Promise<boolean> {
    const storedToken = await this.redis.get(`refresh_token:${userId}`);
    return !storedToken || storedToken !== refreshToken;
  }

  async githubLogin(code: string) {
    const clientId     = this.configService.get<string>('GITHUB_OAUTH_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GITHUB_OAUTH_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('GitHub OAuth not configured');
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new UnauthorizedException('Failed to exchange code for access token');
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const githubUser = await userResponse.json();

    let user = await this.prisma.user.findUnique({
      where: { email: githubUser.email },
      include: { organization: true },
    });

    const encryptedToken = this.cryptoService.encrypt(tokenData.access_token);
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (!user) {
      const orgSlug = `${githubUser.login.toLowerCase()}-${Date.now()}`;
      const organization = await this.prisma.organization.create({
        data: {
          name: `${githubUser.login}'s Organization`,
          slug: orgSlug,
          plan: 'FREE',
          fixesUsedThisMonth: 0,
          fixesLimit: 10,
          billingCycleStart: new Date(),
        },
      });

      user = await this.prisma.user.create({
        data: {
          email: githubUser.email,
          name: githubUser.name || githubUser.login,
          passwordHash: '',
          role: 'OWNER',
          organizationId: organization.id,
        } as any,
        include: { organization: true },
      });
    }

    user = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        githubAccessTokenEncrypted: encryptedToken.encrypted,
        githubAccessTokenIv: encryptedToken.iv,
        githubAccessTokenKeyVersion: encryptedToken.keyVersion,
        githubUsername: githubUser.login,
        githubId: githubUser.id.toString(),
        githubTokenExpiresAt: tokenExpiresAt,
      } as any,
      include: { organization: true },
    });

    const tokens = await this.generateTokens(
      user.id, user.email, user.role, user.organizationId,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          plan: user.organization.plan,
        },
      },
      ...tokens,
    };
  }

  async githubOAuthLogin(body: {
    email: string;
    name: string;
    githubId: string;
    accessToken?: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { email: body.email },
      include: { organization: true },
    });

    let encryptedToken = null;
    let tokenExpiresAt = null;
    if (body.accessToken) {
      encryptedToken = this.cryptoService.encrypt(body.accessToken);
      tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    if (!user) {
      const orgSlug = `${body.githubId.toLowerCase()}-${Date.now()}`;
      const organization = await this.prisma.organization.create({
        data: {
          name: `${body.githubId}'s Organization`,
          slug: orgSlug,
          plan: 'FREE',
          fixesUsedThisMonth: 0,
          fixesLimit: 10,
          billingCycleStart: new Date(),
        },
      });

      const userData: any = {
        email: body.email,
        name: body.name,
        passwordHash: '',
        role: 'OWNER',
        organizationId: organization.id,
        githubUsername: body.githubId,
        githubId: body.githubId,
        ...(encryptedToken && {
          githubAccessTokenEncrypted: encryptedToken.encrypted,
          githubAccessTokenIv: encryptedToken.iv,
          githubAccessTokenKeyVersion: encryptedToken.keyVersion,
          githubTokenExpiresAt: tokenExpiresAt,
        }),
      };

      user = await this.prisma.user.create({
        data: userData,
        include: { organization: true },
      });
    } else if (encryptedToken) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          githubAccessTokenEncrypted: encryptedToken.encrypted,
          githubAccessTokenIv: encryptedToken.iv,
          githubAccessTokenKeyVersion: encryptedToken.keyVersion,
          githubUsername: body.githubId,
          githubId: body.githubId,
          githubTokenExpiresAt: tokenExpiresAt,
        } as any,
        include: { organization: true },
      });
    }

    const tokens = await this.generateTokens(
      user.id, user.email, user.role, user.organizationId,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          plan: user.organization.plan,
        },
      },
      ...tokens,
    };
  }
}