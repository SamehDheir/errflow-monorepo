import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const frontendUrl = configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
  app.enableCors({
    origin: [frontendUrl, "http://localhost:3000"],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix("api");

  const port = Number(configService.get("PORT")) || 3001;
  // Bind to 0.0.0.0 so hosting platforms (Render, etc.) can detect the open
  // port. Node's default host binding isn't reliably detected there, which
  // makes the service look like it never opened a port.
  await app.listen(port, "0.0.0.0");

  console.log(`Application is running on port ${port}`);
  console.log(`API endpoints available at /api`);
}

bootstrap();
