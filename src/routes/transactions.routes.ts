import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
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

transactionsRouter.get(
  "/transactions",
  authMiddleware,
  validate({ query: transactionListQuery }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const { page, limit } = (req.validated?.query ?? transactionListQuery.parse(req.query)) as z.infer<
      typeof transactionListQuery
    >;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.transaction.count({ where: { userId: req.user.sub } }),
      prisma.transaction.findMany({
        where: { userId: req.user.sub },
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

transactionsRouter.post(
  "/transactions",
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

