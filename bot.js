import TelegramBot from "node-telegram-bot-api";
import { schedule } from "node-cron";
import {
  subscriptions,
  getWalletBalanceUSD,
  callPaidEndpoint,
} from "./services.js";
import { CONFIG } from "./config.js";

export function initBot(token) {
  const bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    if (!subscriptions.has(chatId)) {
      subscriptions.set(chatId, {
        active: false,
        totalSpent: 0,
        totalCalls: 0,
      });
    }
    await bot.sendMessage(
      chatId,
      `
        *x402SolanaBot*
Get exclusive info that moves the market.

*How it works:*
Activate: type \`alpha\` to activate alpha
Payments auto deducted via x402 on Solana
Pauses if wallet < $10

*Pricing:* 
$0.001 per query 
Unlock alpha with each payment

*Commands:*
\`/start\` – Initialize
\`alpha\` – Activate
\`stop\` – Pause
\`track\` – Activate Solana Insights
\`status\` – Check status and balance`,
      { parse_mode: "Markdown" }
    );
  });

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    const sub = subscriptions.get(chatId);
    if (!sub) return;

    if (text === "alpha") {
      sub.active = true;
      await bot.sendMessage(chatId, "Activated Alpha");
    }
    if (text === "stop") {
      sub.active = false;
      await bot.sendMessage(chatId, "Paused");
    }
    if (text === "status") {
      const balance = await getWalletBalanceUSD();
      await bot.sendMessage(
        chatId,
        `Status
        Active: ${sub.active}
        Total Calls: ${sub.totalCalls}
        Wallet Balance: $${balance.toFixed(2)}`
      );
    }

    if (text === "track") {
      try {
        await bot.sendMessage(chatId, "Activated track");
        const result = await callPaidEndpoint(CONFIG.TRACK_URL);
        const market = result.body;

        const sentimentLabel =
          market.sentimentUp >= 60
            ? "Bullish"
            : market.sentimentUp >= 40
            ? "Neutral"
            : "Bearish";

        const message = `
        *Solana (SOL) Market Snapshot* 

Price: *$${market.price.toFixed(2)}*
24h Change: ${market.change24h.toFixed(2)}%
Market Cap: $${market.marketCap.toLocaleString()}
24h Volume: $${market.volume24h.toLocaleString()}

Market Sentiment
Bullish: ${market.sentimentUp}%
Bearish: ${market.sentimentDown}%

Overall Bias: *${sentimentLabel}*
        `;

        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (err) {
        console.error("Error fetching Solana price:", err);
        await bot.sendMessage(
          chatId,
          `Failed to fetch Solana price:\n${err.message || err}`
        );
      }
    }
  });
  async function runJob(userId) {
    const sub = subscriptions.get(userId);
    if (!sub || !sub.active) return;

    try {
      const balance = await getWalletBalanceUSD();
      if (balance < 10) {
        sub.active = false;
        await bot.sendMessage(
          userId,
          `Paused\n\nWallet balance below $10.\nPlease top up to resume.`
        );
        return;
      }

      const result = await callPaidEndpoint(CONFIG.ALPHA_URL);
      const articles = result.body.articles ?? [];
      const cost = result.payment?.amount ?? 0;

      const message = articles.length
        ? articles
            .map(
              (a) => `JUST IN: ${a.title}\n\n${a.description}\n\n${a.link}\n`
            )
            .join("\n\n") + `\n\n`
        : "No news available at the moment.";

      sub.totalSpent += Number(cost);
      sub.totalCalls += 1;

      await bot.sendMessage(userId, message);
    } catch (err) {
      console.error("Error in cron cycle:", err);
      await bot.sendMessage(userId, `Error fetching:\n${err.message || err}`);
    }
  }

  schedule("0 * * * * *", async () => {
    if (subscriptions.size === 0) return;
    for (const [userId] of subscriptions) {
      await runJob(userId);
    }
  });

  return bot;
}
