import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { PipelineProcessor } from './pipeline.processor';
import { PipelineService } from './pipeline.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { GitHubModule } from '../github/github.module';
import { AiFixModule } from '../ai-fix/ai-fix.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    CryptoModule,
    GitHubModule,
    AiFixModule,
    NotificationsModule,
    BullModule.registerQueueAsync({
      name: 'pipeline',
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const isUpstash = redisUrl.includes('upstash.io');
        const finalUrl = isUpstash
          ? redisUrl.replace('redis://', 'rediss://')
          : redisUrl;

        const url = new URL(finalUrl);

        console.log('🔗 Bull queue Redis:', `${url.hostname}:${url.port}`);

        return {
          redis: {
            host: url.hostname,
            port: parseInt(url.port) || (isUpstash ? 6380 : 6379),
            password: url.password || undefined,
            username: url.username || undefined,
            tls: isUpstash ? { rejectUnauthorized: false } : undefined,
            // Required for Bull against hosted Redis (Upstash): Bull uses
            // blocking commands, and the readiness check hangs on Upstash —
            // which stalls app.init()/app.listen() and prevents the port from
            // opening. Disabling both lets the queue connect without blocking boot.
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          settings: {
            stalledInterval: 30 * 1000,
            maxStalledCount: 1,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 10000,
            },
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [PipelineProcessor, PipelineService],
  exports: [PipelineService, BullModule],
})
export class PipelineModule {}