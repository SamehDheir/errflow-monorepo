import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendFixEmailParams {
  to: string;
  errorMessage: string;
  filePath: string;
  prUrl: string;
  prNumber: number;
  explanation: string;
  rootCause: string;
  confidenceScore: number;
  testsPassed: boolean;
}

export interface SendFailureEmailParams {
  to: string;
  errorMessage: string;
  step: string;
  errorDetail: string;
  failureReason?: string;
  manualReviewUrl?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL');
    
    if (!resendApiKey) {
      this.logger.warn('RESEND_API_KEY not configured, emails will not be sent');
    } else {
      this.logger.log('Resend configured successfully');
    }

    this.resend = new Resend(resendApiKey || '');
    this.fromEmail = fromEmail || 'noreply@errflow.dev';
    this.logger.log(`From email configured: ${this.fromEmail}`);
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; emailId?: string; error?: string }> {
    try {
      this.logger.log(`Sending test email to ${to} via Resend`);
      
      const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
      
      if (!resendApiKey) {
        this.logger.warn('RESEND_API_KEY not configured, cannot send test email');
        return { 
          success: false, 
          error: 'Resend not configured. Please set RESEND_API_KEY in your .env file' 
        };
      }

      const subject = '⚡ errflow Test Email - Your notifications are working!';
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>errflow Test Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #10b981; padding: 30px; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">✅ Test Email Successful!</h1>
      <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 14px;">Your errflow notification settings are working correctly</p>
    </div>
    
    <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Hello! This is a test email from <strong>errflow</strong>.
      </p>
      
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
        If you're receiving this email, it means your notification settings are configured correctly. 
        You'll receive similar emails when:
      </p>
      
      <ul style="color: #374151; font-size: 14px; line-height: 1.6; margin: 20px 0;">
        <li>New errors are detected in your projects</li>
        <li>errflow captures and processes error events</li>
        <li>Error details are enriched and sent to dashboard</li>
      </ul>
      
      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #065f46; margin: 0; font-size: 14px;">
          <strong>Configuration Status:</strong> ✅ Active
        </p>
      </div>
      
      <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
        This is an automated test email from errflow. You don't need to reply.
      </p>
    </div>
  </div>
</body>
</html>`;

      const result = await this.resend.emails.send({
        from: `"errflow" <${this.fromEmail}>`,
        to: [to],
        subject,
        html,
      });

      this.logger.log(`Test email sent successfully to ${to}, messageId: ${result.data?.id}`);
      return { 
        success: true, 
        emailId: result.data?.id 
      };
    } catch (error: any) {
      this.logger.error(`Failed to send test email: ${error.message}`);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async sendFixEmail(params: SendFixEmailParams): Promise<void> {
    try {
      this.logger.log(`Preparing to send fix email to ${params.to} for PR #${params.prNumber} via Resend`);
      
      const subject = `errflow: Error captured for ${params.errorMessage.substring(0, 50)}...`;
      const html = this.buildFixEmailHtml(params);

      const result = await this.resend.emails.send({
        from: `"errflow" <${this.fromEmail}>`,
        to: [params.to],
        subject,
        html,
      });

      this.logger.log(`Fix email sent successfully to ${params.to}, messageId: ${result.data?.id || 'unknown'}`);
    } catch (error: any) {
      this.logger.error(`Failed to send fix email to ${params.to}: ${error.message}`);
      // Don't throw error - allow pipeline to continue even if email fails
    }
  }

  async sendFailureEmail(params: SendFailureEmailParams): Promise<void> {
    try {
      this.logger.log(`Preparing to send failure email to ${params.to} via Resend`);
      
      const subject = `errflow: Failed to process ${params.errorMessage.substring(0, 50)}...`;
      const html = this.buildFailureEmailHtml(params);

      const result = await this.resend.emails.send({
        from: `"errflow" <${this.fromEmail}>`,
        to: [params.to],
        subject,
        html,
      });

      this.logger.log(`Failure email sent successfully to ${params.to}, messageId: ${result.data?.id || 'unknown'}`);
    } catch (error: any) {
      this.logger.error(`Failed to send failure email to ${params.to}: ${error.message}`);
      // Don't throw error - allow pipeline to continue even if email fails
    }
  }

  private buildFixEmailHtml(params: SendFixEmailParams): string {
    const confidenceColor = this.getConfidenceColor(params.confidenceScore);
    const confidenceLabel = this.getConfidenceLabel(params.confidenceScore);
    const testBadgeColor = params.testsPassed ? '#10b981' : '#ef4444';
    const testLabel = params.testsPassed ? 'Tests Passed' : 'Tests Failed';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>errflow Error Processed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #1f2937; padding: 30px; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">errflow Error Processed</h1>
      <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 14px;">We've successfully captured and processed your error</p>
    </div>
    
    <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="margin-bottom: 20px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Error Message</p>
        <p style="color: #111827; margin: 0; font-size: 16px; line-height: 1.5;">${this.escapeHtml(params.errorMessage)}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">File</p>
        <p style="color: #111827; margin: 0; font-size: 14px; font-family: monospace; background-color: #f3f4f6; padding: 8px 12px; border-radius: 4px;">${this.escapeHtml(params.filePath)}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Root Cause</p>
        <p style="color: #111827; margin: 0; font-size: 14px; line-height: 1.5;">${this.escapeHtml(params.rootCause)}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Explanation</p>
        <p style="color: #111827; margin: 0; font-size: 14px; line-height: 1.5;">${this.escapeHtml(params.explanation)}</p>
      </div>
      
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <div style="background-color: ${confidenceColor}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">
          ${confidenceLabel} (${Math.round(params.confidenceScore * 100)}%)
        </div>
        <div style="background-color: ${testBadgeColor}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">
          ${testLabel}
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${params.prUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
          View Error Details
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 12px; margin: 30px 0 0 0; text-align: center;">
        Please review the error details and investigate the issue.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private buildFailureEmailHtml(params: SendFailureEmailParams): string {
    const failureReasonLabel = params.failureReason ? this.getFailureReasonLabel(params.failureReason) : 'Test Failure';
    const failureReasonColor = this.getFailureReasonColor(params.failureReason);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>errflow Processing Failed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #dc2626; padding: 30px; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">errflow Processing Failed</h1>
      <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 14px;">We were unable to process this error</p>
    </div>
    
    <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="margin-bottom: 20px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Error Message</p>
        <p style="color: #111827; margin: 0; font-size: 16px; line-height: 1.5;">${this.escapeHtml(params.errorMessage)}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Failed Step</p>
        <p style="color: #dc2626; margin: 0; font-size: 14px; font-weight: 500;">${this.escapeHtml(params.step)}</p>
      </div>
      
      ${params.failureReason ? `
      <div style="margin-bottom: 20px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Failure Type</p>
        <div style="display: inline-block; background-color: ${failureReasonColor}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500;">
          ${failureReasonLabel}
        </div>
      </div>
      ` : ''}
      
      <div style="margin-bottom: 20px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">Error Detail</p>
        <pre style="color: #111827; margin: 0; font-size: 12px; line-height: 1.5; background-color: #f3f4f6; padding: 12px; border-radius: 4px; overflow-x: auto; max-height: 200px; overflow-y: auto;">${this.escapeHtml(params.errorDetail.substring(0, 1000))}</pre>
      </div>
      
      <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin-top: 20px; border-radius: 4px;">
        <p style="color: #1e40af; margin: 0; font-size: 14px; line-height: 1.5;">
          <strong>Information:</strong> The error has been saved and is available for review. You can view the error details and investigate the issue manually.
        </p>
      </div>
      
      ${params.manualReviewUrl ? `
      <div style="text-align: center; margin-top: 30px;">
        <a href="${params.manualReviewUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
          Review Error Details
        </a>
      </div>
      ` : ''}
      
      <p style="color: #6b7280; font-size: 12px; margin: 30px 0 0 0; text-align: center;">
        The error processing failed, but the details have been saved. Please review the error information manually.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private getFailureReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      'SYNTAX_ERROR': 'Syntax Error',
      'IMPORT_ERROR': 'Import/Module Error',
      'TYPE_ERROR': 'Type Error',
      'TIMEOUT': 'Timeout',
      'ASSERTION_FAILURE': 'Test Assertion Failed',
      'UNKNOWN': 'Unknown Error',
    };
    return labels[reason] || reason;
  }

  private getFailureReasonColor(reason: string): string {
    const colors: Record<string, string> = {
      'SYNTAX_ERROR': '#dc2626',
      'IMPORT_ERROR': '#ea580c',
      'TYPE_ERROR': '#ca8a04',
      'TIMEOUT': '#7c3aed',
      'ASSERTION_FAILURE': '#2563eb',
      'UNKNOWN': '#6b7280',
    };
    return colors[reason] || '#6b7280';
  }

  private getConfidenceColor(score: number): string {
    if (score >= 0.7) return '#10b981';
    if (score >= 0.4) return '#f59e0b';
    return '#ef4444';
  }

  private getConfidenceLabel(score: number): string {
    if (score >= 0.7) return 'High Confidence';
    if (score >= 0.4) return 'Medium Confidence';
    return 'Low Confidence';
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
