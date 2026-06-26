import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';

export interface NotificationPayload {
  type: 'error' | 'pr' | 'fix' | 'system';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
}

@Injectable()
export class WebsocketService {
  constructor(private websocketGateway: WebsocketGateway) {}

  sendNotification(organizationId: string, payload: NotificationPayload) {
    this.websocketGateway.sendNotification(organizationId, payload);
  }

  sendErrorNotification(organizationId: string, error: any) {
    this.websocketGateway.sendErrorUpdate(organizationId, {
      type: 'error',
      id: error.id,
      message: error.message,
      severity: error.severity,
      status: error.status,
      timestamp: new Date(),
    });
  }

  sendPrNotification(organizationId: string, pr: any) {
    this.websocketGateway.sendPrUpdate(organizationId, {
      type: 'pr',
      id: pr.id,
      number: pr.githubPrNumber,
      title: pr.title,
      status: pr.status,
      url: pr.githubPrUrl,
      timestamp: new Date(),
    });
  }

  sendFixNotification(organizationId: string, fixAttempt: any) {
    this.websocketGateway.sendNotification(organizationId, {
      type: 'fix',
      title: 'Fix Generated',
      message: `AI has generated a fix with ${fixAttempt.confidenceScore ? Math.round(fixAttempt.confidenceScore * 100) : 0}% confidence`,
      data: {
        fixAttemptId: fixAttempt.id,
        errorId: fixAttempt.errorEventId,
        confidence: fixAttempt.confidenceScore,
      },
      timestamp: new Date(),
    });
  }
}
