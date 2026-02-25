
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { base58 } from "@scure/base";
import { CONFIG } from "./config.js";

export const subscriptions = new Map();

async function getSigner() {
  return await createKeyPairSignerFromBytes(
    base58.decode(CONFIG.SVM_PRIVATE_KEY)
  );
}

const connection = new Connection(CONFIG.SOLANA_RPC);

export async function getWalletBalanceUSD() {
  const signer = await getSigner();
  const pubkey = new PublicKey(signer.address);

  const balanceLamports = await connection.getBalance(pubkey);
  const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;

  const SOL_PRICE_USD = 82.98;

  return balanceSOL * SOL_PRICE_USD;
}

export async function callPaidEndpoint(url) {
  try {
    const signer = await getSigner();

    const client = new x402Client();
    client.register("solana:*", new ExactSvmScheme(signer));

    const fetchWithPayment = wrapFetchWithPayment(fetch, client);

    const response = await fetchWithPayment(url, {
      method: "GET",
    });

    const body = await response.json();

    let payment = null;

    if (response.ok) {
      payment = new x402HTTPClient(client).getPaymentSettleResponse((name) =>
        response.headers.get(name)
      );

    } else {
      console.warn(`Request failed with status ${response.status}`);
    }

    return { body, payment };
  } catch (err) {
    console.error("Paid endpoint error:", err);
    throw err;
  }
}