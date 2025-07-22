require('dotenv').config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const prompt = require("prompt-sync")({ sigint: true });
const { DateTime } = require("luxon");

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.SESSION || "");

(async () => {
  console.log("Запуск Telegram-клиента...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => prompt("Введите номер телефона: "),
    password: async () => prompt("Введите пароль от Telegram (если включён): "),
    phoneCode: async () => prompt("Введите код из Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("✅ Авторизовались!");
  
  const fromDateInput = prompt("С какой даты начать (ГГГГ-ММ-ДД): ".padEnd(40));
  const toDateInput = prompt("По какую дату включительно (ГГГГ-ММ-ДД): ".padEnd(40));
  
  const channel = await client.getEntity("https://t.me/bmbtg");

  console.log("Анализирую...");
  const messages = await client.getMessages(channel, { limit: 4000 });

  const fromDate = DateTime.fromISO(fromDateInput).startOf('day');
  const toDate = DateTime.fromISO(toDateInput).endOf('day');

  let stats = {
    total: 0,
    text: 0,
    singlePhoto: 0,
    multiPhoto: 0,
    video: 0,
    congrats: 0,
    sport: 0
  };

  let totalViews = 0

  for (const msg of messages) {
    if (!msg.date) continue;
    const msgDate = DateTime.fromJSDate(new Date(msg.date * 1000));
    if (msgDate >= fromDate && msgDate <= toDate) {
      stats.total++
      totalViews = totalViews + (msg.views ?? 0)
    }
  
  }
  const averageViews = stats.total > 0 ? totalViews / stats.total : 0;
   for (const msg of messages) {
    if (!msg.date) continue;
    const msgDate = DateTime.fromJSDate(new Date(msg.date * 1000));
    if (msgDate >= fromDate && msgDate <= toDate) {
      let type = ""

      const text = msg.message?.toLowerCase() || "";
      if (
        text.includes("поздравляем") ||
        text.includes("табрик") ||
        text.includes("қут") ||
        text.includes("kutlaymiz") ||
        text.includes("congratulate")
      ) {
        stats.congrats++;
        type = "Пост-поздравление"
      }

      if (
        text.includes("футбол") ||
        text.includes("шахмат") ||
        text.includes("спорт")
      ) {
        stats.sport++
      }

      if (msg.media?.photo) {
        if (msg.groupedId) {
          stats.multiPhoto++;
          type = "Пост с множеством фотографий"
        } else {
          stats.singlePhoto++;
          type = "Пост с одной фотографией"
        }
      }

      if (msg.media?.document?.mimeType?.startsWith("video")) {
        stats.video++;
        type = "Видео-пост"
      }
      if (msg.action?.className === "MessageActionPinMessage") {
        type = "Пин"
      }
      if (type === "" && msg.message) {
        stats.text++;
        type = "Текстовый пост"
      }
      const formattedDate = msgDate.toFormat("yyyy-MM-dd HH:mm");
      const paddedType = type.padEnd(30, " ");
      const paddedViews = String(msg.views ?? 0).padStart(6, " ");
      const ratio = averageViews > 0 ? (msg.views / averageViews).toFixed(1) : "–".padStart(4, " ");

      if (ratio >= 2.0) {
        console.log(`\x1b[32m📅 ${formattedDate}  |  📌 Тип: ${paddedType} | 👁️ Просмотры: ${paddedViews} | 📊 x${ratio}\x1b[0m`);
      } else {
        console.log(`📅 ${formattedDate}  |  📌 Тип: ${paddedType} | 👁️ Просмотры: ${paddedViews} | 📊 x${ratio}`);
      }

    }
  }

console.log("\n📊 Статистика контента с", fromDate.toFormat('yyyy-MM-dd'), "по", toDate.toFormat('yyyy-MM-dd'));
console.log("\n Среднее количество просмотров в этот период: ", averageViews)
console.table(stats);


  process.exit();
})();
