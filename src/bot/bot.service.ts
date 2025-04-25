import { Injectable } from '@nestjs/common';
import { Telegraf, Markup, Context } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import { ConfigService } from '@nestjs/config';
import { questions } from './questions';
import { questionsTest2 } from './question2';

interface UserSession {
  currentQuestion: number;
  answers: Record<string, string>;
  testType: 'На сколько вы осведомлены о МТД' | 'Тест на ДМТД';
}

interface CustomContext extends Context<Update> {
  match: RegExpMatchArray;
}

@Injectable()
export class BotService {
  private bot: Telegraf;
  private userSessions: Record<number, UserSession> = {};

  constructor(private configService: ConfigService) {
    console.log('Инициализация BotService...');

    const botToken = this.configService.get<string>('BOT_TOKEN');
    if (!botToken) {
      throw new Error('BOT_TOKEN не указан в переменных окружения');
    }
    this.bot = new Telegraf(botToken);

    // Настроим обработчики
    this.setupHandlers();

    // Обработка завершения
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  public async handleUpdate(update: Update): Promise<void> {
    await this.bot.handleUpdate(update);
  }

  private async setupHandlers() {
    // Стартовое сообщение
    this.bot.start(async (ctx: Context) => {
      const userName = ctx.from?.first_name || 'пользователь';
      await ctx.reply(
        `Привет, ${userName}! Выбери тест:`,
        Markup.keyboard([
          ['На сколько вы осведомлены о МТД', 'Тест на ДМТД'],
          ['Купить гайд'],
        ]).resize(),
      );
    });

    // Обработка команды на тест "На сколько вы осведомлены о МТД"
    this.bot.hears('На сколько вы осведомлены о МТД', async (ctx: Context) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      delete this.userSessions[userId];
      this.userSessions[userId] = {
        currentQuestion: 0,
        answers: {},
        testType: 'На сколько вы осведомлены о МТД',
      };
      await this.sendQuestion(ctx);
    });

    // Обработка команды на тест "Тест на ДМТД"
    this.bot.hears('Тест на ДМТД', async (ctx: Context) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      delete this.userSessions[userId];
      this.userSessions[userId] = {
        currentQuestion: 0,
        answers: {},
        testType: 'Тест на ДМТД',
      };
      await this.sendQuestion(ctx);
    });

    // Обработка кнопки "Купить гайд"
    this.bot.hears('Купить гайд', async (ctx: Context) => {
      await this.sendGuide(ctx);
    });

    // Обработка действий пользователя
    this.bot.action(/.*/, async (ctx: CustomContext) => {
      const userId = ctx.from?.id;
      if (!userId || !this.userSessions[userId]) return;

      const userAnswer = ctx.match[0];
      const session = this.userSessions[userId];
      const currentTest =
        session.testType === 'На сколько вы осведомлены о МТД'
          ? questions
          : questionsTest2;
      const currentQuestion = currentTest[session.currentQuestion];

      session.answers[currentQuestion.text] = userAnswer;
      session.currentQuestion++;

      if (session.currentQuestion >= currentTest.length) {
        if (session.testType === 'Тест на ДМТД') {
          const yesCount = Object.values(session.answers).filter(
            (answer) => answer.toLowerCase() === 'да',
          ).length;
          await this.sendTest2Result(ctx, yesCount);
        } else {
          await this.handleTestCompletion(ctx);
        }
        delete this.userSessions[userId];
        return;
      }

      await this.sendQuestion(ctx);
    });

    // Запуск бота
    try {
      await this.bot.launch();
      console.log('Бот запущен!');
    } catch (error) {
      console.error('Ошибка при запуске бота:', error);
    }
  }

  private async sendQuestion(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId || !this.userSessions[userId]) return;

    const session = this.userSessions[userId];
    const currentTest =
      session.testType === 'На сколько вы осведомлены о МТД'
        ? questions
        : questionsTest2;
    const question = currentTest[session.currentQuestion];

    const keyboard = Markup.inlineKeyboard(
      question.options.map((option) => [
        Markup.button.callback(option, option),
      ]),
    );

    await ctx.reply(question.text, keyboard);
  }

  private async sendTest2Result(ctx: Context, yesCount: number) {
    let resultMessage = `Количество ответов "Да": ${yesCount}\n\n`;

    if (yesCount <= 3) {
      resultMessage += '🔹 0–3 «Да» – Всё ок!';
    } else if (yesCount <= 7) {
      resultMessage += '🔹 4–7 «Да» – Возможны начальные нарушения.';
    } else if (yesCount <= 12) {
      resultMessage += '🔹 8–12 «Да» – Высокий риск.';
    } else {
      resultMessage += '🔹 13+ «Да» – Серьёзные нарушения.';
    }

    resultMessage += '\n\nРекомендуем приобрести гайд:';

    await ctx.reply(
      resultMessage,
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            'Купить за 911 рублей',
            'https://t.me/k_nazarovaaa',
          ),
        ],
        [Markup.button.callback('Узнать подробнее', 'show_guide_details')],
      ]),
    );

    await ctx.reply(
      'Хотите пройти тест еще раз?',
      Markup.keyboard([
        ['На сколько вы осведомлены о МТД', 'Тест на ДМТД'],
        ['Купить гайд'],
      ]).resize(),
    );
  }

  private async handleTestCompletion(ctx: Context) {
    await ctx.reply(
      'Если хотя бы один вопрос заставил вас задуматься, уверена: вам будет интересно у меня в тг-канале:',
      Markup.inlineKeyboard([
        [Markup.button.url('Перейти в канал', 'https://t.me/softPower_yoga')],
        [
          Markup.button.url(
            'Купить гайд за 911 рублей',
            'https://t.me/k_nazarovaaa',
          ),
        ],
        [Markup.button.callback('Узнать подробнее', 'show_guide_details')],
      ]),
    );

    await ctx.reply(
      'Хотите пройти тест еще раз?',
      Markup.keyboard([
        ['На сколько вы осведомлены о МТД', 'Тест на ДМТД'],
        ['Купить гайд'],
      ]).resize(),
    );
  }

  private async sendGuide(ctx: Context) {
    const guideText = `ГАЙД «ЖИЗНЬ С ДИСФУНКЦИЯМИ МЫШЦ ТАЗОВОГО ДНА» ...\n\n💰 Стоимость гайда: 911 рублей`;

    try {
      await ctx.replyWithPhoto(
        { source: './src/assets/card.jpg' },
        {
          caption: guideText,
          ...Markup.inlineKeyboard([
            [
              Markup.button.url(
                'Купить за 911 рублей',
                'https://t.me/k_nazarovaaa',
              ),
            ],
          ]),
        },
      );
    } catch (error) {
      console.error('Ошибка при отправке фото:', error);
      await ctx.reply(guideText);
    }
  }

  // Метод для установки webhook
  public async setWebhook(url: string): Promise<void> {
    try {
      await this.bot.telegram.setWebhook(url);
      console.log(`Webhook установлен на: ${url}`);
    } catch (error) {
      console.error('Ошибка при установке webhook:', error);
    }
  }
}
