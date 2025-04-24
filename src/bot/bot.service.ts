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
    console.log('Инициализация BotService...');

    const botToken = this.configService.get<string>('BOT_TOKEN');
    if (!botToken) {
      throw new Error('BOT_TOKEN не указан в переменных окружения');
    }

    console.log(
      'Токен получен, первые 5 символов:',
      botToken.substring(0, 5) + '...',
    );
    this.bot = new Telegraf(botToken);

    // Настраиваем обработчики
    this.setupHandlers();

    // Запускаем бота сразу
    this.bot
      .launch()
      .then(() => console.log('Бот успешно запущен'))
      .catch((error) => console.error('Ошибка запуска бота:', error));

    // Обработка завершения
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  private async setupHandlers() {
    // Обработка команды /start
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

    // Обработка выбора теста
    this.bot.hears('На сколько вы осведомлены о МТД', async (ctx: Context) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      // Очищаем предыдущую сессию, если она есть
      delete this.userSessions[userId];

      this.userSessions[userId] = {
        currentQuestion: 0,
        answers: {},
        testType: 'На сколько вы осведомлены о МТД',
      };
      await this.sendQuestion(ctx);
    });

    this.bot.hears('Тест на ДМТД', async (ctx: Context) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      // Очищаем предыдущую сессию, если она есть
      delete this.userSessions[userId];

      this.userSessions[userId] = {
        currentQuestion: 0,
        answers: {},
        testType: 'Тест на ДМТД',
      };
      await this.sendQuestion(ctx);
    });

    // Обработка кнопки "Узнать подробнее"
    this.bot.action('show_guide_details', async (ctx: Context) => {
      console.log('Кнопка show_guide_details нажата');
      const guideText = `ГАЙД «ЖИЗНЬ С ДИСФУНКЦИЯМИ МЫШЦ ТАЗОВОГО ДНА»

Почему этот гайд – must-have для каждой женщины?
🔹 Понятные объяснения, как контролировать внутрибрюшное давление
🔹 Практичные советы на каждый день
🔹 Упражнение после, которого вы почувствуете мышцы тазового дна 

💡 Для кого это?
— Молодые мамы, которые хотят восстановиться после родов
— Женщины, заметившие «первые звоночки» (недержание мочи, боли внизу живота)
— Те, кто устал от "пукающих звуков" из влагалища


📌 «Это не про стыд, это про заботу о себе. Ваше тело заслуживает комфорта!»

💰 Стоимость гайда: 911 рублей`;

      try {
        await ctx.replyWithPhoto(
          {
            source: './src/assets/card.jpg',
          },
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
        await ctx.reply(
          guideText,
          Markup.inlineKeyboard([
            [
              Markup.button.url(
                'Купить за 911 рублей',
                'https://t.me/k_nazarovaaa',
              ),
            ],
          ]),
        );
      }
    });

    // Обработка кнопки "Купить гайд" в клавиатуре
    this.bot.hears('Купить гайд', async (ctx: Context) => {
      const guideText = `ГАЙД «ЖИЗНЬ С ДИСФУНКЦИЯМИ МЫШЦ ТАЗОВОГО ДНА»

Почему этот гайд – must-have для каждой женщины?
🔹 Понятные объяснения, как контролировать внутрибрюшное давление
🔹 Практичные советы на каждый день
🔹 Упражнение после, которого вы почувствуете мышцы тазового дна 

💡 Для кого это?
— Молодые мамы, которые хотят восстановиться после родов
— Женщины, заметившие «первые звоночки» (недержание мочи, боли внизу живота)
— Те, кто устал от "пукающих звуков" из влагалища


📌 «Это не про стыд, это про заботу о себе. Ваше тело заслуживает комфорта!»

💰 Стоимость гайда: 911 рублей`;

      try {
        await ctx.replyWithPhoto(
          {
            source: './src/assets/card.jpg',
          },
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
        await ctx.reply(
          guideText,
          Markup.inlineKeyboard([
            [
              Markup.button.url(
                'Купить за 911 рублей',
                'https://t.me/k_nazarovaaa',
              ),
            ],
          ]),
        );
      }
    });

    // Обработка кнопки "Купить за 911 рублей"
    this.bot.action('buy_guide', async (ctx) => {
      console.log('Кнопка buy_guide нажата');
      // Ваш код для обработки оплаты
      ctx.reply('Обработка платежа...');
    });

    // Регистрируем обработчик с регулярным выражением ПОСЛЕ конкретных обработчиков
    this.bot.action(
      /(?!buy_guide|show_guide_details).*/,
      async (ctx: CustomContext) => {
        console.log('Сработал общий обработчик action:', ctx.match[0]);
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
                [
                  Markup.button.url(
                    'Купить гайд за 911 рублей',
                    'https://t.me/k_nazarovaaa',
                  ),
                ],
                [
                  Markup.button.callback(
                    'Узнать подробнее',
                    'show_guide_details',
                  ),
                ],
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
          delete this.userSessions[userId];
          return;
        }

        // Отправляем следующий вопрос
        await this.sendQuestion(ctx);
      },
    );
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

    resultMessage +=
      '\n\nЕсли вы хотите узнать больше о профилактике дисфункции мышц тазового дне, рекомендуем приобрести наш гайд за 911 рублей:';

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
}
