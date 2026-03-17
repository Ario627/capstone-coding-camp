import { Router } from "express";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { csrfMiddleware } from "../common/middleware/csrf.middleware.js";
import { tflHash } from "../common/middleware/tfl.middleware.js";
import * as umkmService from "../modules/umkm/umkm.service.js";
import { sendSuccess, sendCreated } from "../common/utils/response.util.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
import {
    createBusinessSchema,
    updateBusinessSchema,
    createInventoryItemSchema,
    updateInventorySchema,
    idParamSchema
} from "../modules/umkm/umkm.schema.js";

export const umkmRouter = Router();

umkmRouter.use(authMiddleware);

umkmRouter.post(
  "/businesses",
  csrfMiddleware,
  tflHash,
  validate({ body: createBusinessSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const business = await umkmService.createBusiness(req.user.sub, req.body);
    sendCreated(res, business);
  },
);

umkmRouter.get("/businesses", async (req, res) => {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const businesses = await umkmService.listBusinesses(req.user.sub);
  sendSuccess(res, businesses);
});

umkmRouter.get("/businesses/:id", validate({ params: idParamSchema }), async (req, res) => {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const business = await umkmService.getBusiness(req.user.sub, String(req.params.id));
  sendSuccess(res, business);
});

umkmRouter.patch("/businesses/:id", csrfMiddleware, validate({params: idParamSchema, body: updateBusinessSchema}), async (req, res) => {
  if (!req.user) throw new AppError(401, "Unauthorized"); 
  const business = await umkmService.updateBusiness(req.user.sub, String(req.params.id), req.body);
  sendSuccess(res, business);
});

umkmRouter.delete(
  "/businesses/:id",
  csrfMiddleware,
  validate({ params: idParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await umkmService.deleteBusiness(req.user.sub, String(req.params.id));
    sendSuccess(res, result);
  },
);

umkmRouter.post(
  "/inventory",
  csrfMiddleware,
  tflHash,
  validate({ body: createInventoryItemSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const item = await umkmService.addInventoryItem(req.user.sub, req.body);
    sendCreated(res, item);
  },
);

umkmRouter.patch(
  "/inventory/:id",
  csrfMiddleware,
  validate({ params: idParamSchema, body: updateInventorySchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const item = await umkmService.updateInventoryIttem(req.user.sub, req.params.id as string, req.body);
    sendSuccess(res, item);
  },
);

umkmRouter.delete(
  "/inventory/:id",
  csrfMiddleware,
  validate({ params: idParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await umkmService.deleteInventoryItem(req.user.sub, req.params.id as string);
    sendSuccess(res, result);
  },
);

//GET /api/umkm/sales-report
umkmRouter.get("/sales-report", async (req, res) => {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const report = await umkmService.getSalesReport(req.user.sub);
  sendSuccess(res, report);
});

// GET /api/umkm/inventory-valuation/:id 
umkmRouter.get(
  "/inventory-valuation/:id",
  validate({ params: idParamSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const valuation = await umkmService.getInventoryValuation(req.user.sub, req.params.id as string);
    sendSuccess(res, valuation);
  },
);