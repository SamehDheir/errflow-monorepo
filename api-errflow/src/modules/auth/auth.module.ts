import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaModule } from '../../prisma/prisma.module';
import Redis from 'ioredis';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    LocalStrategy,
   {
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    const isUpstash = redisUrl.includes('upstash.io');
    const finalUrl = isUpstash
      ? redisUrl.replace('redis://', 'rediss://')
      : redisUrl;

    const url = new URL(finalUrl);

    const redis = new Redis({
      host: url.hostname,
      port: parseInt(url.port) || (isUpstash ? 6380 : 6379),
      password: url.password || undefined,
      username: url.username || undefined,
      tls: isUpstash ? { rejectUnauthorized: false } : undefined,
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => console.log('✅ Redis connected successfully for Auth module'));
    redis.on('ready', () => console.log('✅ Redis ready for operations (Auth module)'));
    redis.on('error', (err) => console.warn('❌ Redis error:', err.message));
    redis.on('close', () => console.log('🔌 Redis connection closed (Auth module)'));

    redis.connect().catch(err => console.warn('❌ Redis connect failed:', err.message));

    return redis;
  },
  inject: [ConfigService],
},
  ],
  exports: [AuthService],
})
export class AuthModule {}
