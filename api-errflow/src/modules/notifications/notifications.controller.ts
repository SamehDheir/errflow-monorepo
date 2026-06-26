import { Controller, Post, Body, UseGuards, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class TestEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
  async sendTestEmail(@Body() data: TestEmailDto, @Request() req) {
    try {
      const result = await this.notificationsService.sendTestEmail(data.email);
      
      if (!result.success) {
        return { 
          message: 'Email configuration issue', 
          warning: result.error,
          details: 'The email service is not properly configured. Please check RESEND_API_KEY in your backend .env file.'
        };
      }
      
      return { 
        message: 'Test email sent successfully',
        emailId: result.emailId 
      };
    } catch (error) {
      return { 
        message: 'Failed to send test email',
        error: error.message,
        details: 'Please check your email service configuration'
      };
    }
  }
}
