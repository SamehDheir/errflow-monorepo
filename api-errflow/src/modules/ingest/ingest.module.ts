import { Module } from '@nestjs/common';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { WebsocketModule } from '../../websockets/websocket.module';

@Module({
  imports: [PrismaModule, CryptoModule, PipelineModule, ApiKeysModule, WebsocketModule],
  controllers: [IngestController],
  providers: [IngestService],
})
export class IngestModule {}
