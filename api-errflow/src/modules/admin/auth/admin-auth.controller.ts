import { Controller, Post, Body, HttpCode, HttpStatus, Headers, Ip, Req } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { LoginDto } from '../../auth/dto/login.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { SuperAdmin } from '../../../common/decorators/super-admin.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Request } from 'express';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private authService: AuthService) { }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, true);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @CurrentUser('accessToken') accessToken: string,
  ) {
    return this.authService.logout(userId, accessToken);
  }
}
