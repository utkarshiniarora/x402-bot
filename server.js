import { CONFIG } from "./config.js";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { facilitator } from "@payai/facilitator";
import Parser from "rss-parser";

const facilitatorClient = new HTTPFacilitatorClient(facilitator);

const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  new ExactSvmScheme()
);

const app = express();
app.use(express.json());

app.use(
  paymentMiddleware(
    {
      "GET /alpha": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
            payTo: CONFIG.SELLER_ADDRESS,
          },
        ],
        description: "Premium Solana news feed",
        mimeType: "application/json",
      },
      "GET /track": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
            payTo: CONFIG.SELLER_ADDRESS,
          },
        ],
        description: "Paid Solana price feed via Chainstack RPC",
        mimeType: "application/json",
      },
    },
    resourceServer
  )
);

const parser = new Parser();

app.get("/alpha", async (req, res) => {
  try {
    const feed = await parser.parseURL(CONFIG.SOLANA_RSS);
    const articles = feed.items.slice(1, 2).map((item) => ({
      title: item.title,
      link: item.guid,
      description: item.contentSnippet,
      pubDate: item.pubDate,
    }));
    res.json({ articles });
  } catch (err) {
    console.error("Error fetching Solana news RSS feed:", err);
    res.status(500).json({ error: "Failed to fetch Solana news" });
  }
});

app.get("/track", async (req, res) => {
  try {
    const response = await fetch(CONFIG.SOLANA_DATA);

    if (!response.ok) {
      throw new Error("Failed to fetch");
    }

    const data = await response.json();

    const result = {
      price: data.market_data.current_price.usd,
      change24h: data.market_data.price_change_percentage_24h,
      marketCap: data.market_data.market_cap.usd,
      volume24h: data.market_data.total_volume.usd,
      sentimentUp: data.sentiment_votes_up_percentage,
      sentimentDown: data.sentiment_votes_down_percentage,
    };

    res.json(result);
  } catch (err) {
    console.error("Error fetching Solana market data:", err);
    res.status(500).json({ error: "Failed to fetch Solana market data" });
  }
});

app.listen(4021, () => {
  console.log(`Server listening at ${CONFIG.PORT}`);
});
