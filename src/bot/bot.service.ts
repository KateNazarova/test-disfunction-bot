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

// Кастомный тип для контекста с поддержкой match
interface CustomContext extends Context<Update> {
  match: RegExpMatchArray;
}

@Injectable()
export class BotService {
  private bot: Telegraf;
  private userSessions: Record<number, UserSession> = {};

  constructor(private configService: ConfigService) {
    const botToken = this.configService.get<string>('BOT_TOKEN');
    if (!botToken) {
      throw new Error('BOT_TOKEN is not defined in the environment variables.');
    }
    this.bot = new Telegraf(botToken);

    this.setupHandlers().catch((error) => {
      console.error('Ошибка при настройке бота:', error);
    });

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  private async setupHandlers() {
    // Обработка команды /start
    this.bot.start(async (ctx: Context) => {
      const userName = ctx.from?.first_name || 'пользователь';
      await ctx.reply(
        `Привет, ${userName}! Выбери тест:`,
        Markup.inlineKeyboard([
          [Markup.button.callback('На сколько вы осведомлены о МТД', 'test1')],
          [Markup.button.callback('Тест на ДМТД', 'test2')],
        ]),
      );
    });

    // Обработка выбора теста
    this.bot.action('test1', async (ctx: Context) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      this.userSessions[userId] = {
        currentQuestion: 0,
        answers: {},
        testType: 'На сколько вы осведомлены о МТД',
      };
      await this.sendQuestion(ctx);
    });

    this.bot.action('test2', async (ctx: Context) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      this.userSessions[userId] = {
        currentQuestion: 0,
        answers: {},
        testType: 'Тест на ДМТД',
      };
      await this.sendQuestion(ctx);
    });

    // Обработка ответов на вопросы
    this.bot.action(/.*/, async (ctx: CustomContext) => {
      const userId = ctx.from?.id;
      if (!userId || !this.userSessions[userId]) return;

      const userAnswer = ctx.match[0]; // Теперь TypeScript знает, что ctx.match существует
      const session = this.userSessions[userId];

      const currentTest =
        session.testType === 'На сколько вы осведомлены о МТД'
          ? questions
          : questionsTest2;
      const currentQuestion = currentTest[session.currentQuestion];

      session.answers[currentQuestion.text] = userAnswer;
      session.currentQuestion++;

      // Если тест завершен
      if (session.currentQuestion >= currentTest.length) {
        if (session.testType === 'Тест на ДМТД') {
          const yesCount = Object.values(session.answers).filter(
            (answer) => answer.toLowerCase() === 'да',
          ).length;
          await this.sendTest2Result(ctx, yesCount);
        } else {
          await ctx.reply(
            'Если хотя бы один вопрос заставил вас задуматься, уверена: вам будет интересно у меня в тг-канале:',
            Markup.inlineKeyboard([
              [
                Markup.button.url(
                  'Перейти в канал',
                  'https://t.me/softPower_yoga',
                ),
              ],
            ]),
          );

          await ctx.reply(
            'Хотите пройти другой тест?',
            Markup.inlineKeyboard([
              [
                Markup.button.callback(
                  'На сколько вы осведомлены о МТД',
                  'test1',
                ),
              ],
              [Markup.button.callback('Тест на ДМТД', 'test2')],
            ]),
          );
        }
        delete this.userSessions[userId];
        return;
      }

      // Отправляем следующий вопрос
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

    if (yesCount >= 0 && yesCount <= 3) {
      resultMessage +=
        '🔹 0–3 «Да» – Вероятно, у вас нет выраженных проблем, но знания о тазовом дне минимальны. Регулярная профилактика поможет сохранить здоровье.';
    } else if (yesCount >= 4 && yesCount <= 7) {
      resultMessage +=
        '🔹 4–7 «Да» – Возможны начальные нарушения. Рекомендуется уделить внимание укреплению или расслаблению мышц тазового дне.';
    } else if (yesCount >= 8 && yesCount <= 12) {
      resultMessage +=
        '🔹 8–12 «Да» – Высокий риск дисфункции. Важно пройти диагностику у специалиста и подобрать корректные упражнения.';
    } else if (yesCount >= 13) {
      resultMessage +=
        '🔹 13+ «Да» – Вероятны серьёзные нарушения, требующие внимания врача и комплексного подхода.';
    }

    await ctx.reply(resultMessage, Markup.removeKeyboard());

    try {
      await ctx.replyWithPhoto(
        {
          source: './src/assets/card.jpg',
        },
        {
          caption:
            'Если вы хотите узнать больше о профилактике дисфункции мышц тазового дне, рекомендуем приобрести наш гайд:',
          ...Markup.inlineKeyboard([
            [Markup.button.url('Купить гайд', 'https://t.me/k_nazarovaaa')],
          ]),
        },
      );
    } catch (error) {
      console.error('Ошибка при отправке фото:', error);
      await ctx.reply(
        'Извините, произошла ошибка при отправке фото. Пожалуйста, попробуйте позже.',
      );
    }

    await ctx.reply(
      'Хотите пройти другой тест?',
      Markup.inlineKeyboard([
        [Markup.button.callback('На сколько вы осведомлены о МТД', 'test1')],
        [Markup.button.callback('Тест на ДМТД', 'test2')],
      ]),
    );
  }
}
