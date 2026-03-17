import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
import { sendSuccess, sendCreated } from "../common/utils/response.util.js";
import { PAGINATION_DEFAULTS } from "../common/constants/index.js";

export const transactionsRouter = Router();

const transactionCreateBody = z
  .object({
    amount: z.number().finite().int().positive(),
    type: z.enum(["income", "expense"]),
    category: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(500),
  })
  .strict();

const transactionUpdateBody = transactionCreateBody.partial();

const transactionListQuery = z
  .object({
    page: z.coerce.number().int().positive().optional().default(PAGINATION_DEFAULTS.PAGE),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(PAGINATION_DEFAULTS.MAX_LIMIT)
      .optional()
      .default(PAGINATION_DEFAULTS.LIMIT),
  })
  .strict();

const idParam = z.object({ id: z.string().min(1) });

// GET /api/transactions
transactionsRouter.get(
  "/",
  authMiddleware,
  validate({ query: transactionListQuery }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const { page, limit } = (req.validated?.query ?? transactionListQuery.parse(req.query)) as z.infer<
      typeof transactionListQuery
    >;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.transaction.count({ where: { userId: req.user.sub, deletedAt: null } }),
      prisma.transaction.findMany({
        where: { userId: req.user.sub, deletedAt: null },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          amount: true,
          type: true,
          category: true,
          description: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        page,
        limit,
        total,
        items,
      },
    });
  },
);

// GET /api/transactions/summary
transactionsRouter.get("/summary", authMiddleware, async (req, res) => {
  if (!req.user) throw new AppError(401, "Unauthorized");

  const transactions = await prisma.transaction.findMany({
    where: { userId: req.user.sub, deletedAt: null },
    select: { amount: true, type: true },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  for (const tx of transactions) {
    if (tx.type === "income") totalIncome += tx.amount;
    else totalExpense += tx.amount;
  }

  sendSuccess(res, {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: transactions.length,
  });
});

// POST /api/transactions
transactionsRouter.post(
  "/",
  authMiddleware,
  validate({ body: transactionCreateBody }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const data = transactionCreateBody.parse(req.body);

    const created = await prisma.transaction.create({
      data: {
        userId: req.user.sub,
        amount: data.amount,
        type: data.type,
        category: data.category,
        description: data.description,
      },
      select: {
        id: true,
        amount: true,
        type: true,
        category: true,
        description: true,
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, data: created });
  },
);

// PATCH /api/transactions/:id
transactionsRouter.patch(
  "/:id",
  authMiddleware,
  validate({ params: idParam, body: transactionUpdateBody }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id as string, userId: req.user.sub, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Transaction not found");

    const body = req.body as z.infer<typeof transactionUpdateBody>;
    const data: Record<string, unknown> = {};
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.type !== undefined) data.type = body.type;
    if (body.category !== undefined) data.category = body.category;
    if (body.description !== undefined) data.description = body.description;

    const updated = await prisma.transaction.update({
      where: { id: existing.id },
      data,
      select: {
        id: true,
        amount: true,
        type: true,
        category: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, updated);
  },
);

// DELETE /api/transactions/:id (soft delete)
transactionsRouter.delete(
  "/:id",
  authMiddleware,
  validate({ params: idParam }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id as string, userId: req.user.sub, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Transaction not found");

    await prisma.transaction.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(res, { message: "Transaction deleted" });
  },
);
