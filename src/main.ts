import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

interface SystemError extends Error {
  code?: string;
  syscall?: string;
  address?: string;
  port?: number;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    logger.log('Starting application initialization...');

    const app = await NestFactory.create(AppModule);
    const defaultPort = parseInt(process.env.PORT || '3000', 10);
    const maxPortAttempts = 5;

    await startServerWithPortRetry(app, defaultPort, maxPortAttempts, logger);

    logger.log('Application successfully started');
  } catch (error) {
    handleFatalError(error, logger);
  }
}

async function startServerWithPortRetry(
  app: any,
  initialPort: number,
  maxAttempts: number,
  logger: Logger,
): Promise<void> {
  let attempts = 0;
  let currentPort = initialPort;

  while (attempts < maxAttempts) {
    try {
      await app.listen(currentPort, '0.0.0.0');
      logger.log(`Application running on port ${currentPort}`);
      return;
    } catch (error) {
      if (isSystemError(error) && error.code === 'EADDRINUSE') {
        attempts++;
        currentPort++;
        logger.warn(
          `Port ${currentPort - 1} in use, trying ${currentPort} (attempt ${attempts}/${maxAttempts})...`,
        );
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Could not find available port after ${maxAttempts} attempts`,
  );
}

function isSystemError(error: unknown): error is SystemError {
  return error instanceof Error && 'code' in error;
}

function handleFatalError(error: unknown, logger: Logger): never {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error('Fatal application error', errorMessage, errorStack);
  process.exit(1);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  handleFatalError(error, logger);
});
