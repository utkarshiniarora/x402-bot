import "dotenv/config";

export const CONFIG = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  SVM_PRIVATE_KEY: process.env.SVM_PRIVATE_KEY,
  SELLER_ADDRESS: process.env.SELLER_ADDRESS,
  SOLANA_RPC: process.env.SOLANA_RPC,
  SOLANA_RSS: process.env.SOLANA_RSS,
  SOLANA_DATA: process.env.SOLANA_DATA,
  SOLANA_PRICE: process.env.SOLANA_PRICE,
  ALPHA_URL: "http://localhost:4021/alpha",
  TRACK_URL: "http://localhost:4021/track",
  PORT: process.env.PORT || 4021,
};