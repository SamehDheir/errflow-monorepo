import { Module } from '@nestjs/common';
import { AiFixService } from './ai-fix.service';
import { ConfigModule } from '@nestjs/config';
import { WebsocketModule } from '../../websockets/websocket.module';

@Module({
  imports: [ConfigModule, WebsocketModule],
  providers: [AiFixService],
  exports: [AiFixService],
})
export class AiFixModule { }
