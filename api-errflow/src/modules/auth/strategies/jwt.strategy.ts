import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => {
          // Try to get token from Authorization header first
          let token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
          if (token) {
            return token;
          }

          // Fallback to cookies - check for Express-style cookies
          if (request && request.cookies) {
            // Handle both signed cookies and regular cookies
            const cookieToken = request.cookies.adminAccessToken ||
              (request.cookies as any)?.adminAccessToken;
            if (cookieToken) {
              return cookieToken;
            }
          }

          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    // Get the actual token from the request (either header or cookie)
    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req) ||
      req.cookies?.adminAccessToken ||
      (req.cookies as any)?.adminAccessToken;

    if (!accessToken) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const isBlacklisted = await this.redis.get(`blacklist:${accessToken}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    } catch (error) {
      // Redis error shouldn't block authentication
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has admin role for admin routes
    if (req.originalUrl?.includes('/admin') && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Admin access required');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      accessToken,
    };
  }
}
