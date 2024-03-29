import type { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })
  app.useBodyParser('text');
  app.enableCors();
  await app.listen(process.env.HOST_PORT);
}
bootstrap();
