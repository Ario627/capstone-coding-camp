import { Router } from "express";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { csrfMiddleware } from "../common/middleware/csrf.middleware.js";
import { tflHash } from "../common/middleware/tfl.middleware.js";
import {
  umkmRateLimit,
  umkmWriteRateLimit,
} from "../common/middleware/rate-limit.middleware.js";
import { sendSuccess, sendCreated } from "../common/utils/response.util.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
import * as businessService from "../modules/umkm/business.service.js";
import * as transactionService from "../modules/umkm/business-transaction.service.js";
import * as inventoryService from "../modules/umkm/inventory.service.js";
import * as reportService from "../modules/umkm/umkm-report.service.js";
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
} from "../modules/umkm/umkm.schema.js";

export const umkmRouter = Router();
umkmRouter.use(authMiddleware);
umkmRouter.use(umkmRateLimit());

// POST /api/umkm/businesses 
umkmRouter.post(
  "/businesses",
  csrfMiddleware,
  umkmWriteRateLimit(),
  tflHash,
  validate({ body: createBusinessSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const business = await businessService.createBusiness(req.user.sub, req.body);
    sendCreated(res, business);
  }
);

// GET /api/umkm/businesses -> List all businesses
umkmRouter.get(
  "/businesses",
  validate({ query: businessListQuerySchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const query = businessListQuerySchema.parse(req.validated?.query ?? req.query);
    const businesses = await businessService.listBusinesses(req.user.sub, query);
    sendSuccess(res, businesses);
  }
);


// GET /api/umkm/businesses/stats
umkmRouter.get("/businesses/stats", async (req, res) => {
  if (!req.user) throw new AppError(401, "Unauthorized");
  // Get total counts across all businesses
  const businesses = await businessService.listBusinesses(req.user.sub, { page: 1, limit: 1000 });
  const totalBusinesses = businesses.total;
  const totalInventory = businesses.items.reduce((sum, b) => sum + (b.inventoryCount ?? 0), 0);
  const totalTransactions = businesses.items.reduce((sum, b) => sum + (b.transactionCount ?? 0), 0);
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
    const business = await businessService.getBusiness(req.user.sub, String(req.params.id));
    sendSuccess(res, business);
  }
);

// PATCH /api/umkm/businesses/:id 
umkmRouter.patch(
  "/businesses/:id",
  csrfMiddleware,
  umkmWriteRateLimit(),
  validate({ params: idParamSchema, body: updateBusinessSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const business = await businessService.updateBusiness(req.user.sub, String(req.params.id), req.body);
    sendSuccess(res, business);
  }
);

// DELETE /api/umkm/businesses/:id 
umkmRouter.delete(
  "/businesses/:id",
  csrfMiddleware,
  umkmWriteRateLimit(),
  validate({ params: idParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await businessService.deleteBusiness(req.user.sub, String(req.params.id));
    sendSuccess(res, result);
  }
);