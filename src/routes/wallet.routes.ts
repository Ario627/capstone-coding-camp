import { Router } from "express";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { csrfMiddleware } from "../common/middleware/csrf.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { sendSuccess, sendCreated } from "../common/utils/response.util.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
import {
  walletReadRateLimit,
  walletWriteRateLimit,
  walletTransferRateLimit,
  walletCallbackRateLimit,
} from "../common/middleware/rate-limit.middleware.js";
import {
  topUpSchema,
  ppobSchema,
  transferSchema,
  historyQuerySchema,
  transactionIdParam,
} from "../modules/wallet/wallet.schema.js";
import {
  getWalletBalance,
  getWalletHistory,
  getWalletTransactionById,
} from "../modules/wallet/wallet.service.js";
import {
  initiateTopUp,
  handleMidtransCallback,
  simulateWebhook,
} from "../modules/wallet/wallet-midtrans.service.js";
import { processTransfer } from "../modules/wallet/wallet-transfer.service.js";
import {
  processPPOB,
  getPPOBProducts,
} from "../modules/wallet/wallet-ppob.service.js";

import {
  processQRISPayment,
  processBankTransfer,
} from "../modules/wallet/wallet-qris.service.js";
import { lookupUser } from "../modules/wallet/wallet-transfer.service.js";
import {
  lookupQuerySchema,
  qrisPaymentSchema,
  bankTransferSchema,
} from "../modules/wallet/wallet.schema.js";

export const walletRouter = Router();

// GET /api/wallet/balance
walletRouter.get(
  "/balance",
  authMiddleware,
  walletReadRateLimit(),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await getWalletBalance(req.user.sub);
    sendSuccess(res, result);
  },
);

// GET /api/wallet/history
walletRouter.get(
  "/history",
  authMiddleware,
  walletReadRateLimit(),
  validate({ query: historyQuerySchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const query = req.validated?.query ?? historyQuerySchema.parse(req.query);
    const result = await getWalletHistory(req.user.sub, {
      page: query.page,
      limit: query.limit,
      type: query.type,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    sendSuccess(res, result);
  },
);

// GET /api/wallet/transaction/:id
walletRouter.get(
  "/transaction/:id",
  authMiddleware,
  walletReadRateLimit(),
  validate({ params: transactionIdParam }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await getWalletTransactionById(req.user.sub, req.params.id as string);
    sendSuccess(res, result);
  },
);

// POST /api/wallet/top-up
walletRouter.post(
  "/top-up",
  authMiddleware,
  csrfMiddleware,
  walletWriteRateLimit(),
  validate({ body: topUpSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await initiateTopUp(req.user.sub, req.body);
    sendCreated(res, result);
  },
);

// POST /api/wallet/callback
walletRouter.post("/callback", walletCallbackRateLimit(), async (req, res) => {
  const signature = req.headers["x-signature"] as string | undefined;
  const notification = req.body;

  if (signature) {
    notification.signature_key = signature;
  }

  const result = await handleMidtransCallback(notification);
  sendSuccess(res, result);
});

// POST /api/wallet/top-up/simulate (dev only)
walletRouter.post("/top-up/simulate", authMiddleware, async (req, res) => {
  if (!req.user) throw new AppError(401, "Unauthorized");

  const { orderId, status } = req.body;

  if (!orderId) {
    throw new AppError(400, "orderId is required");
  }

  if (!["success", "failed"].includes(status)) {
    throw new AppError(400, 'status must be "success" or "failed"');
  }

  const result = await simulateWebhook(orderId, status);
  sendSuccess(res, result);
});

// GET /api/wallet/ppob/products
walletRouter.get(
  "/ppob/products",
  authMiddleware,
  walletReadRateLimit(),
  async (req, res) => {
    const products = getPPOBProducts();
    sendSuccess(res, products);
  },
);

// POST /api/wallet/ppob/pay
walletRouter.post(
  "/ppob/pay",
  authMiddleware,
  csrfMiddleware,
  walletWriteRateLimit(),
  validate({ body: ppobSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await processPPOB(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);

// POST /api/wallet/transfer
walletRouter.post(
  "/transfer",
  authMiddleware,
  csrfMiddleware,
  walletTransferRateLimit(),
  validate({ body: transferSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await processTransfer({
      senderId: req.user.sub,
      recipientId: req.body.recipientUserId,
      amount: req.body.amount,
      note: req.body.note,
    });

    sendSuccess(res, result);
  },
);



// GET /api/wallet/lookup
walletRouter.get(
  "/lookup",
  authMiddleware,
  walletReadRateLimit(),
  validate({ query: lookupQuerySchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const query = req.validated?.query ?? lookupQuerySchema.parse(req.query);
    const result = await lookupUser(query.identifier);
    sendSuccess(res, result);
  },
);

// POST /api/wallet/qris/pay
walletRouter.post(
  "/qris/pay",
  authMiddleware,
  csrfMiddleware,
  walletWriteRateLimit(),
  validate({ body: qrisPaymentSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await processQRISPayment(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);

// POST /api/wallet/bank-transfer
walletRouter.post(
  "/bank-transfer",
  authMiddleware,
  csrfMiddleware,
  walletWriteRateLimit(),
  validate({ body: bankTransferSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await processBankTransfer(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);