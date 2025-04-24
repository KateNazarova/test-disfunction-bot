import { Controller, Post, Body, Req, HttpCode } from '@nestjs/common';
import { BotService } from './bot.service';
import { Request } from 'express';
import { Update } from 'telegraf/typings/core/types/typegram';

@Controller('telegraf')
export class BotController {
  constructor(private botService: BotService) {}

  @Post('*')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request,
    @Body() body: Update,
  ): Promise<{ ok: boolean; error?: string }> {
    console.log('Получен webhook:', body);
    try {
      await this.botService.handleUpdate(body);
      return { ok: true };
    } catch (error: unknown) {
      console.error('Ошибка обработки webhook:', error);
      return { ok: false, error: getErrorMessage(error) };
    }
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
