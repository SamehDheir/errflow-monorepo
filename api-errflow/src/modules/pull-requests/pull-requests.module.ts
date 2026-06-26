import { Module } from '@nestjs/common';
import { PullRequestsController } from './pull-requests.controller';
import { PullRequestsService } from './pull-requests.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { GitHubModule } from '../github/github.module';
import { CryptoModule } from '../../common/crypto/crypto.module';

@Module({
  imports: [PrismaModule, GitHubModule, CryptoModule],
  controllers: [PullRequestsController],
  providers: [PullRequestsService],
  exports: [PullRequestsService],
})
export class PullRequestsModule {}
