const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

const apiId = parseInt(process.env.API_ID); // из .env
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.SESSION || ""); // сохранение сессии

(async () => {
  console.log("Запуск Telegram-клиента...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text("Введите номер телефона: "),
    password: async () => await input.text("Пароль от Telegram (если есть): "),
    phoneCode: async () => await input.text("Введите код из Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("✅ Авторизовались!");
  console.log("Сессия (сохрани для деплоя):", client.session.save());

  // получаем канал
  const channel = await client.getEntity("https://t.me/your_channel_username");
  const messages = await client.getMessages(channel, { limit: 100 });

  let stats = { text: 0, photo: 0, video: 0 };

  for (const msg of messages) {
    if (msg.message) stats.text++;
    if (msg.media?.photo) stats.photo++;
    if (msg.media?.document?.mimeType?.startsWith("video")) stats.video++;
  }

  console.log("📊 Статистика за последние 100 постов:");
  console.log(stats);

  process.exit();
})();
