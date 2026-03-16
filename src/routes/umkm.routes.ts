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