import { Controller, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { GitHubService } from './github.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('github')
@UseGuards(JwtAuthGuard)
export class GitHubController {
  constructor(
    private githubService: GitHubService,
    private cryptoService: CryptoService,
    private prisma: PrismaService,
  ) { }

  @Get('repositories')
  async getUserRepositories(@CurrentUser('id') userId: string) {
    try {
      // Get user with GitHub token
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      }) as any;

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (!user.githubAccessTokenEncrypted) {
        throw new HttpException(
          'No GitHub token found. Please log in with GitHub OAuth.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check if token is expired
      if (user.githubTokenExpiresAt && new Date() > user.githubTokenExpiresAt) {
        throw new HttpException(
          'GitHub token has expired. Please log in with GitHub OAuth again.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Decrypt the token
      const decryptedToken = this.cryptoService.decrypt(
        user.githubAccessTokenEncrypted,
        user.githubAccessTokenIv,
      );

      // Fetch repositories
      const repositories = await this.githubService.getUserRepositories(decryptedToken);

      return {
        success: true,
        data: repositories,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch repositories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
