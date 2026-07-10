import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

// FRONTEND_URL may hold a comma-separated list of allowed origins; the socket
// CORS must accept each of them (mirrors the HTTP CORS config in main.ts).
const wsAllowedOrigins = Array.from(
  new Set([
    ...(process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
    'http://localhost:3000',
  ]),
);

@WebSocketGateway({
  cors: {
    origin: wsAllowedOrigins,
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      client.data.organizationId = decoded.organizationId;
      client.data.userId = decoded.sub;

      // Room assignment happens here — clients cannot request additional rooms
      await client.join(`org:${decoded.organizationId}`);

      this.logger.log(`Client ${client.id} connected to org:${decoded.organizationId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  async sendNotification(organizationId: string, notification: any) {
    this.server.to(`org:${organizationId}`).emit('notification', notification);
  }

  async sendErrorUpdate(organizationId: string, error: any) {
    this.server.to(`org:${organizationId}`).emit('error-update', error);
  }

  async sendPrUpdate(organizationId: string, pr: any) {
    this.server.to(`org:${organizationId}`).emit('pr-update', pr);
  }
}
