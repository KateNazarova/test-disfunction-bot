import { Injectable } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import questions from './questions';
import questionsTest2 from './question2';

@Injectable()
export class BotService {
  private bot: Telegraf;
  private userSessions: Record<number, any> = {};

  constructor(private configService: ConfigService) {
    const botToken = this.configService.get<string>('BOT_TOKEN');
    if (!botToken) {
      throw new Error('BOT_TOKEN is not defined in the environment variables.');
    }
    this.bot = new Telegraf(botToken);

    this.bot.start(async (ctx) => {
      const userName = ctx.from.first_name || 'пользователь';
      await ctx.reply(
        `Привет, ${userName}! Выбери тест:`,
        Markup.keyboard([['Тест 1', 'Тест 2']]) // Кнопки для выбора теста
          .oneTime()
          .resize(),
      );
    });

    this.bot.on('text', async (ctx) => {
      const userId = ctx.from.id;
      const userText = ctx.message.text.toLowerCase();

      // Если пользователь выбирает тест
      if (['тест 1', 'тест 2'].includes(userText)) {
        if (!this.userSessions[userId]) {
          this.userSessions[userId] = {
            currentQuestion: 0,
            answers: {},
            testType: userText === 'тест 1' ? 'test1' : 'test2', // Сохраняем тип теста
          };
          return this.sendQuestion(ctx);
        }
      }

      // Если сессия существует
      if (this.userSessions[userId]) {
        const session = this.userSessions[userId];
        const currentTest =
          session.testType === 'test1' ? questions : questionsTest2;
        const currentQuestion = currentTest[session.currentQuestion];

        // Сохраняем ответ
        session.answers[currentQuestion.text] = ctx.message.text;
        session.currentQuestion++;

        // Если тест завершен
        if (session.currentQuestion >= currentTest.length) {
          if (session.testType === 'test2') {
            // Подсчет ответов "Да" для второго теста
            const yesCount = Object.values(session.answers).filter(
              (answer) => (answer as string).toLowerCase() === 'да',
            ).length;
            await this.sendTest2Result(ctx, yesCount); // Отправляем результат
          } else {
            await ctx.reply(
              'Спасибо за участие в опросе!',
              Markup.removeKeyboard(),
            );
          }
          delete this.userSessions[userId];
          return;
        }

        // Отправляем следующий вопрос
        return this.sendQuestion(ctx);
      }
    });

    this.bot.launch().then(() => {
      console.log('Бот запущен!');
    });

    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  private async sendQuestion(ctx) {
    const userId = ctx.from.id;
    const session = this.userSessions[userId];

    if (!session) return;

    const currentTest =
      session.testType === 'test1' ? questions : questionsTest2;

    const question = currentTest[session.currentQuestion];
    const keyboard = Markup.keyboard(question.options).oneTime().resize();

    await ctx.reply(question.text, keyboard);
  }

  private async sendTest2Result(ctx, yesCount) {
    let resultMessage = `Количество ответов "Да": ${yesCount}\n\n`;

    if (yesCount >= 0 && yesCount <= 3) {
      resultMessage +=
        '🔹 0–3 «Да» – Вероятно, у вас нет выраженных проблем, но знания о тазовом дне минимальны. Регулярная профилактика поможет сохранить здоровье.';
    } else if (yesCount >= 4 && yesCount <= 7) {
      resultMessage +=
        '🔹 4–7 «Да» – Возможны начальные нарушения. Рекомендуется уделить внимание укреплению или расслаблению мышц тазового дна.';
    } else if (yesCount >= 8 && yesCount <= 12) {
      resultMessage +=
        '🔹 8–12 «Да» – Высокий риск дисфункции. Важно пройти диагностику у специалиста и подобрать корректные упражнения.';
    } else if (yesCount >= 13) {
      resultMessage +=
        '🔹 13+ «Да» – Вероятны серьёзные нарушения, требующие внимания врача и комплексного подхода.';
    }

    await ctx.reply(resultMessage, Markup.removeKeyboard());
  }
}
