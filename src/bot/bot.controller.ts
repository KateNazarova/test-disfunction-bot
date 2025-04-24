import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BotService {
  private bot: Telegraf;

  constructor(private configService: ConfigService) {
    console.log('Инициализация BotService...');

    const botToken = this.configService.get<string>('BOT_TOKEN');
    if (!botToken) {
      throw new Error('BOT_TOKEN не указан в переменных окружения');
    }
    this.bot = new Telegraf(botToken);
  }

  // Этот метод нужно будет вызывать для настройки webhook
  public async setWebhook(url: string): Promise<void> {
    try {
      await this.bot.telegram.setWebhook(url);
      console.log('Webhook успешно настроен на:', url);
    } catch (error) {
      console.error('Ошибка настройки webhook:', error);
    }
  }

  // Метод для обработки обновлений
  public async handleUpdate(update: any): Promise<void> {
    await this.bot.handleUpdate(update);
  }
}
