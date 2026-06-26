import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}
  
  @Public()
  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
      registerDto.organizationName,
    );
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser("id") userId: string,
    @CurrentUser("accessToken") accessToken: string,
  ) {
    return this.authService.logout(userId, accessToken);
  }

  @Public()
  @Get("github/callback")
  async githubCallback(@Query("code") code: string) {
    return this.authService.githubLogin(code);
  }

  @Public()
  @Post("github/oauth")
  async githubOAuth(
    @Body() body: { email: string; name: string; githubId: string },
  ) {
    console.log("[Auth Controller] GitHub OAuth request received:", body);
    try {
      const result = await this.authService.githubOAuthLogin(body);
      console.log("[Auth Controller] GitHub OAuth success");
      return result;
    } catch (error) {
      console.error("[Auth Controller] GitHub OAuth error:", error);
      throw error;
    }
  }
}
