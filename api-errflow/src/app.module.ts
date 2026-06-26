import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.validation";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./modules/auth/auth.module";
import { ApiKeysModule } from "./modules/api-keys/api-keys.module";
import { IngestModule } from "./modules/ingest/ingest.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { PipelineModule } from "./modules/pipeline/pipeline.module";
import { GitHubModule } from "./modules/github/github.module";
import { AiFixModule } from "./modules/ai-fix/ai-fix.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ErrorsModule } from "./modules/errors/errors.module";
import { StatsModule } from "./modules/stats/stats.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { PullRequestsModule } from "./modules/pull-requests/pull-requests.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";
import { CryptoModule } from "./common/crypto/crypto.module";
import { WebsocketModule } from "./websockets/websocket.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    CryptoModule,
    WebsocketModule,
    AuthModule,
    AdminModule,
    ApiKeysModule,
    IngestModule,
    ProjectsModule,
    PipelineModule,
    GitHubModule,
    AiFixModule,
    NotificationsModule,
    ErrorsModule,
    StatsModule,
    OrganizationsModule,
    PullRequestsModule,
    UsersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
