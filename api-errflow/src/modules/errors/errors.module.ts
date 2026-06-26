import { Module } from '@nestjs/common';
import { ErrorsController } from './errors.controller';
import { ErrorsService } from './errors.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { GitHubModule } from '../github/github.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CryptoModule } from '../../common/crypto/crypto.module';

@Module({
  imports: [PrismaModule, PipelineModule, GitHubModule, NotificationsModule, CryptoModule],
  controllers: [ErrorsController],
  providers: [ErrorsService],
  exports: [ErrorsService],
})
export class ErrorsModule {}
