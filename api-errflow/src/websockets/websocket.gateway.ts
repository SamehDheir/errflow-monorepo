import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

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
      client.data.userId = decoded.id;

      // Join organization-specific room
      const room = `org:${decoded.organizationId}`;
      await client.join(room);

      console.log(`Client connected: ${client.id} to org: ${decoded.organizationId}`);
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Send notification to specific organization
  async sendNotification(organizationId: string, notification: any) {
    const room = `org:${organizationId}`;
    this.server.to(room).emit('notification', notification);
  }

  // Send error update to specific organization
  async sendErrorUpdate(organizationId: string, error: any) {
    const room = `org:${organizationId}`;
    this.server.to(room).emit('error-update', error);
  }

  // Send PR update to specific organization
  async sendPrUpdate(organizationId: string, pr: any) {
    const room = `org:${organizationId}`;
    this.server.to(room).emit('pr-update', pr);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.join(room);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.leave(room);
    return { event: 'left', room };
  }
}
