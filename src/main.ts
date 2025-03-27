import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('Starting application...');
  const app = await NestFactory.create(AppModule);

  const defaultPort = Number(process.env.PORT) ?? 3000;
  let port = defaultPort;

  try {
    await app.listen(port, '0.0.0.0');
    console.log(`Application is running on port ${port}`);
  } catch (error: any) {
    if (error?.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying ${port + 1}`);
      port = defaultPort + 1;
      await app.listen(port, '0.0.0.0');
      console.log(`Application is running on port ${port}`);
    } else {
      throw error;
    }
  }
}

bootstrap().catch((error) => {
  console.error('Ошибка при запуске приложения:', error);
  process.exit(1); // Завершаем процесс с кодом ошибки
});
