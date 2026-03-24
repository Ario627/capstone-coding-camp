import { Router } from "express";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { csrfMiddleware } from "../common/middleware/csrf.middleware.js";
import { tflHash } from "../common/middleware/tfl.middleware.js";

import { sendSuccess, sendCreated } from "../common/utils/response.util.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
import * as businessService from "../modules/umkm/business.service.js";
import * as transactionService from "../modules/umkm/business-transaction.service.js";
import * as inventoryService from "../modules/umkm/inventory.service.js";
import * as reportService from "../modules/umkm/umkm-report.service.js";
import {
  umkmRateLimit,
  umkmWriteRateLimit,
} from "../common/middleware/rate-limit.middleware.js";
import {
  createBusinessSchema,
  updateBusinessSchema,
  createBusinessTransactionSchema,
  updateBusinessTransactionSchema,
  createInventoryItemSchema,
  updateInventorySchema,
  adjustStockSchema,
  businessListQuerySchema,
  businessTransactionListQuerySchema,
  inventoryListQuerySchema,
  reportPeriodSchema,
  idParamSchema,
  businessIdParamSchema,
  dateRangeSchema,
  type BusinessListQuery,
  type BusinessTransactionListQuery,
  type InventoryListQuery,
} from "../modules/umkm/umkm.schema.js";

export const umkmRouter = Router();

umkmRouter.use(authMiddleware);
umkmRouter.use(umkmRateLimit());


// POST /api/umkm/businesses <-> Create business
umkmRouter.post(
  "/businesses",
  csrfMiddleware,
  umkmWriteRateLimit(),
  tflHash,
  validate({ body: createBusinessSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const business = await businessService.createBusiness(
      req.user.sub,
      req.body,
    );
    sendCreated(res, business);
  },
);

// GET /api/umkm/businesses <-> llist all businesses
umkmRouter.get(
  "/businesses",
  validate({ query: businessListQuerySchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const query = (req.validated?.query as BusinessListQuery | undefined) ??
      businessListQuerySchema.parse(req.query);
    const businesses = await businessService.listBusinesses(
      req.user.sub,
      query,
    );
    sendSuccess(res, businesses);
  },
);

// GET /api/umkm/businesses/stats <-> Get aggregated stats 
umkmRouter.get("/businesses/stats", async (req, res) => {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const businesses = await businessService.listBusinesses(req.user.sub, {
    page: 1,
    limit: 1000,
  });
  const totalBusinesses = businesses.total;
  const totalInventory = businesses.items.reduce(
    (sum, b) => sum + (b.inventoryCount ?? 0),
    0,
  );
  const totalTransactions = businesses.items.reduce(
    (sum, b) => sum + (b.transactionCount ?? 0),
    0,
  );
  sendSuccess(res, {
    totalBusinesses,
    totalInventory,
    totalTransactions,
    businesses: businesses.items,
  });
});

// GET /api/umkm/businesses/:id 
umkmRouter.get(
  "/businesses/:id",
  validate({ params: idParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const business = await businessService.getBusiness(
      req.user.sub,
      String(req.params.id),
    );
    sendSuccess(res, business);
  },
);

// PATCH /api/umkm/businesses/:id 
umkmRouter.patch(
  "/businesses/:id",
  csrfMiddleware,
  umkmWriteRateLimit(),
  validate({ params: idParamSchema, body: updateBusinessSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const business = await businessService.updateBusiness(
      req.user.sub,
      String(req.params.id),
      req.body,
    );
    sendSuccess(res, business);
  },
);

// DELETE /api/umkm/businesses/:id - Delete business
umkmRouter.delete(
  "/businesses/:id",
  csrfMiddleware,
  umkmWriteRateLimit(),
  validate({ params: idParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await businessService.deleteBusiness(
      req.user.sub,
      String(req.params.id),
    );
    sendSuccess(res, result);
  },
);



// GET /api/umkm/businesses/:businessId/transactions/summary 
umkmRouter.get(
  "/businesses/:businessId/transactions/summary",
  validate({ params: businessIdParamSchema, query: dateRangeSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const { startDate, endDate } = req.validated?.query ?? {};
    const summary = await transactionService.getBusinessTransactionSummary(
      req.user.sub,
      String(req.params.businessId),
      startDate,
      endDate,
    );
    sendSuccess(res, summary);
  },
);

// GET /api/umkm/businesses/:businessId/transactions/trend
umkmRouter.get(
  "/businesses/:businessId/transactions/trend",
  validate({ params: businessIdParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const months = req.query.months
      ? parseInt(req.query.months as string, 10)
      : 6;
    const trend = await transactionService.getBusinessTransactionTrend(
      req.user.sub,
      String(req.params.businessId),
      months,
    );
    sendSuccess(res, trend);
  },
);

// POST /api/umkm/businesses/:businessId/transactions - Create transaction
umkmRouter.post(
  "/businesses/:businessId/transactions",
  csrfMiddleware,
  umkmWriteRateLimit(),
  validate({
    params: businessIdParamSchema,
    body: createBusinessTransactionSchema,
  }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const data = { ...req.body, businessId: String(req.params.businessId) };
    const transaction = await transactionService.createBusinessTransaction(
      req.user.sub,
      String(req.params.businessId),
      data,
    );
    sendCreated(res, transaction);
  },
);

// GET /api/umkm/businesses/:businessId/transactions - List transactions
umkmRouter.get(
  "/businesses/:businessId/transactions",
  validate({
    params: businessIdParamSchema,
    query: businessTransactionListQuerySchema,
  }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const query = (req.validated?.query as BusinessTransactionListQuery | undefined) ??
      businessTransactionListQuerySchema.parse(req.query);
    const transactions = await transactionService.listBusinessTransactions(
      req.user.sub,
      String(req.params.businessId),
      query,
    );
    sendSuccess(res, transactions);
  },
);

// GET /api/umkm/businesses/:businessId/transactions/:id <-> Get single transaction 
umkmRouter.get(
  "/businesses/:businessId/transactions/:id",
  validate({
    params: businessIdParamSchema
      .partial()
      .extend({ id: idParamSchema.shape.id }),
  }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const transaction = await transactionService.getBusinessTransaction(
      req.user.sub,
      String(req.params.businessId),
      String(req.params.id),
    );
    sendSuccess(res, transaction);
  },
);

// PATCH /api/umkm/businesses/:businessId/transactions/:id - Update transaction
umkmRouter.patch(
  "/businesses/:businessId/transactions/:id",
  csrfMiddleware,
  umkmWriteRateLimit(),
  validate({
    params: businessIdParamSchema
      .partial()
      .extend({ id: idParamSchema.shape.id }),
    body: updateBusinessTransactionSchema,
  }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const transaction = await transactionService.updateBusinessTransaction(
      req.user.sub,
      String(req.params.businessId),
      String(req.params.id),
      req.body,
    );
    sendSuccess(res, transaction);
  },
);

// DELETE /api/umkm/businesses/:businessId/transactions/:id - Delete transaction
umkmRouter.delete(
  "/businesses/:businessId/transactions/:id",
  csrfMiddleware,
  umkmWriteRateLimit(),
  validate({
    params: businessIdParamSchema
      .partial()
      .extend({ id: idParamSchema.shape.id }),
  }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await transactionService.deleteBusinessTransaction(
      req.user.sub,
      String(req.params.businessId),
      String(req.params.id),
    );
    sendSuccess(res, result);
  },
);


// GET /api/umkm/businesses/:businessId/inventory/summary <-> Inventory summary (static)
umkmRouter.get(
  "/businesses/:businessId/inventory/summary",
  validate({ params: businessIdParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const valuation = await inventoryService.getInventoryValuation(
      req.user.sub,
      String(req.params.businessId),
    );
    sendSuccess(res, valuation);
  },
);

// GET /api/umkm/businesses/:businessId/inventory/low-stock <-> Low stock items (static)
umkmRouter.get(
  "/businesses/:businessId/inventory/low-stock",
  validate({ params: businessIdParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const lowStock = await inventoryService.getLowStockItems(
      req.user.sub,
      String(req.params.businessId),
    );
    sendSuccess(res, lowStock);
  },
);

// POST /api/umkm/businesses/:businessId/inventory <-> Create inventory item
umkmRouter.post(
  "/businesses/:businessId/inventory",
  csrfMiddleware,
  umkmWriteRateLimit(),
  validate({ params: businessIdParamSchema, body: createInventoryItemSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const data = { ...req.body, businessId: String(req.params.businessId) };
    const item = await inventoryService.createInventoryItem(req.user.sub, data);
    sendCreated(res, item);
  },
);

// GET /api/umkm/businesses/:businessId/inventory -> List inventory
umkmRouter.get(
  "/businesses/:businessId/inventory",
  validate({ params: businessIdParamSchema, query: inventoryListQuerySchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const query = (req.validated?.query as InventoryListQuery | undefined) ??
      inventoryListQuerySchema.parse(req.query);
    const items = await inventoryService.listInventoryItems(
      req.user.sub,
      String(req.params.businessId),
      query,
    );
    sendSuccess(res, items);
  },
);

// GET /api/umkm/inventory/:id -> Get single inventory item
umkmRouter.get(
  "/inventory/:id",
  validate({ params: idParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const item = await inventoryService.getInventoryItem(
      req.user.sub,
      String(req.params.id),
    );
    sendSuccess(res, item);
  },
);

// PATCH /api/umkm/inventory/:id -> Update inventory item
umkmRouter.patch(
  "/inventory/:id",
  csrfMiddleware,
  umkmWriteRateLimit(),
  validate({ params: idParamSchema, body: updateInventorySchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const item = await inventoryService.updateInventoryItem(
      req.user.sub,
      String(req.params.id),
      req.body,
    );
    sendSuccess(res, item);
  },
);

// PATCH /api/umkm/inventory/:id/stock -> Adjust stock
umkmRouter.patch(
  "/inventory/:id/stock",
  csrfMiddleware,
  umkmWriteRateLimit(),
  validate({ params: idParamSchema, body: adjustStockSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await inventoryService.adjustStock(
      req.user.sub,
      String(req.params.id),
      req.body,
    );
    sendSuccess(res, result);
  },
);

// DELETE /api/umkm/inventory/:id -> Delete inventory item
umkmRouter.delete(
  "/inventory/:id",
  csrfMiddleware,
  umkmWriteRateLimit(),
  validate({ params: idParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await inventoryService.deleteInventoryItem(
      req.user.sub,
      String(req.params.id),
    );
    sendSuccess(res, result);
  },
);

//  REPORT ROUTES nya guys

// GET /api/umkm/businesses/:businessId/reports/financial-summary - Financial report
umkmRouter.get(
  "/businesses/:businessId/reports/financial-summary",
  validate({ params: businessIdParamSchema, query: reportPeriodSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const { period } = req.validated?.query ?? { period: "monthly" };
    const report = await reportService.getFinancialSummary(
      req.user.sub,
      String(req.params.businessId),
      period,
    );
    sendSuccess(res, report);
  },
);

// GET /api/umkm/businesses/:businessId/reports/inventory-valuation - Inventory valuation
umkmRouter.get(
  "/businesses/:businessId/reports/inventory-valuation",
  validate({ params: businessIdParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const lowStockOnly = req.query.lowStock === "true";
    const valuation = await reportService.getDetailedInventoryValuation(
      req.user.sub,
      String(req.params.businessId),
    );

    if (lowStockOnly) {
      sendSuccess(res, {
        business: valuation.business,
        summary: valuation.summary,
        lowStockItems: valuation.alerts.lowStock,
      });
    } else {
      sendSuccess(res, valuation);
    }
  },
);

// GET /api/umkm/businesses/:businessId/reports/cash-flow - Cash flow analysis
umkmRouter.get(
  "/businesses/:businessId/reports/cash-flow",
  validate({ params: businessIdParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const months = req.query.months
      ? parseInt(req.query.months as string, 10)
      : 6;
    const cashFlow = await reportService.getCashFlowAnalysis(
      req.user.sub,
      String(req.params.businessId),
      months,
    );
    sendSuccess(res, cashFlow);
  },
);
