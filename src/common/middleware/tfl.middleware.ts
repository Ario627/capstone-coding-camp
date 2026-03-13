import type { Request, Response, NextFunction } from "express";
import { hashTransaction, verifyTransactionHash } from "../utils/hash-transaction.util.js";
import { env } from "../../config/env.config.js";

export function tflHash(req: Request, res: Response, next: NextFunction): void {
  (req as unknown as Record<string, unknown>).tflProtected = true;

  next();
}

export function computeTflHash(params: {
  userId: string;
  amount: string;
  type: string;
  category: string;
  transactionDate: string;
  previousHash: string | null;
}): string {
  const secret = env().TFL_HASH_SECRET ?? "32 hmac";
  return hashTransaction({ ...params, secret });
}

export function verifyTflHash(txHash: string, params: {
  userId: string;
  amount: string;
  type: string;
  category: string;
  transactionDate: string;
  previousHash: string | null;
}): boolean {
  const secret = env().TFL_HASH_SECRET ?? "32 hmac";
  return verifyTransactionHash(txHash, { ...params, secret });
}