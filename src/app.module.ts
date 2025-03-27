import { Module } from '@nestjs/common';
import { BotModule } from './bot/bot.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [BotModule, HealthModule],
})
export class AppModule {}
