import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((error) => {
  console.error('Ошибка при запуске приложения:', error);
  process.exit(1); // Завершаем процесс с кодом ошибки
});
