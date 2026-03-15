import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { prisma } from "../lib/prisma.js";
import { verifyTflHash } from "../common/middleware/tfl.middleware.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
import { sendSuccess } from "../common/utils/response.util.js";

export const tflRouter = Router();
tflRouter.use(authMiddleware);

const idParam = z.object({
    id: z.string().min(1),
});

tflRouter.get("/verify/:id", validate({params: idParam}), async (req, res) => {
    if(!req.user) throw new AppError(401, 'Unauthorized');

    const tx = await prisma.transaction.findUnique({
        where: {id: req.params.id as string, userId: req.user.sub, deletedAt: null},
    });

    if(!tx) throw new AppError(404, 'Transaction not found');

    const isHashValid = verifyTflHash(tx.txHash, {
        userId: tx.userId,
        amount: tx.amount.toString(),
        type: tx.type,
        category: tx.category,
        transactionDate: tx.createdAt.toISOString().split("T")[0]!,
        previousHash: tx.previousHash,
    });

    let isChainValid = true;
    let previousTransaction = null;

    if(tx.previousHash) {
        const prev = await prisma.transaction.findFirst({
            where: {userId: tx.userId, txHash: tx.previousHash, deletedAt: null},
            select: {id: true, txHash: true, createdAt: true},
        });
        if(prev) {
            previousTransaction = prev;
        } else {
            isChainValid = false;
        }
    }

    const isFully = isHashValid && isChainValid;
    let verdict: string;

    if(isFully) {
        verdict = "Terverifikasi";
    } else if(!isHashValid) {
        verdict = "Hash tidak valid - kemungkinan data telah diubah";
    } else {
        verdict = "Rantai transaksi terputus - kemungkinan ada transaksi yang dihapus atau rusak";
    }

    sendSuccess(res, {
        transactionId: tx.id,
        txHash: tx.txHash,
        previousHash: tx.previousHash,
        isHashValid,
        isChainValid,
        isFullyVerified: isFully,
        previousTransaction,
        verifiedAt: new Date().toISOString(),
        verdict,
    });
});

tflRouter.get("/chain-audit", async (req, res) => {
    if(!req.user) throw new AppError(401, 'Unauthorized');

    const transcations = await prisma.transaction.findMany({
        where: {userId: req.user.sub, deletedAt: null},
        orderBy: {createdAt: "asc"},
        select: {id: true, txHash: true, previousHash: true, amount: true, type: true, category: true, createdAt: true},
    });

    let brokenLinks = 0;
    let invalidHashes = 0;
    const results = transcations.map((tx: typeof transcations[number], index: number) => {
        const isHashValid = verifyTflHash(tx.txHash, {
            userId: req.user!.sub,
            amount: tx.amount.toString(),
            type: tx.type,
            category: tx.category,
            transactionDate: tx.createdAt.toISOString().split("T")[0]!,
            previousHash: tx.previousHash,
        });

        let isChainValid = true;
        if(index === 0) {
            isChainValid = tx.previousHash === null;
        } else {
            isChainValid = tx.previousHash === transcations[index - 1]!.txHash;
        }

        if(!isHashValid) invalidHashes++;
        if(!isChainValid) brokenLinks++;

        return {
            id: tx.id,
            isHashValid,
            isChainValid,
            isVerified: isHashValid && isChainValid,
        };
    });

    sendSuccess(res, {
        totalTransactions: transcations.length,
        validHashes: transcations.length - invalidHashes,
        invalidHashes,
        brokenLinks,
        chain: invalidHashes === 0 && brokenLinks === 0 ? "Utuh" : "Rusak",
        details: results,
    });
});