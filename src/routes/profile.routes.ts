import { Router } from "express";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { csrfMiddleware } from "../common/middleware/csrf.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { sendSuccess } from "../common/utils/response.util.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
import {
  profileReadRateLimit,
  profileWriteRateLimit,
  passwordChangeRateLimit,
} from "../common/middleware/rate-limit.middleware.js";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "../modules/profiles/profile.schema.js";
import {
  getProfile,
  updateProfile,
  changePassword,
} from "../modules/profiles/profile.service.js";

export const profileRouter = Router();

profileRouter.get(
  "/",
  authMiddleware,
  profileReadRateLimit(),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await getProfile(req.user.sub);
    sendSuccess(res, result);
  },
);

profileRouter.patch(
  "/",
  authMiddleware,
  csrfMiddleware,
  profileWriteRateLimit(),
  validate({ body: updateProfileSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await updateProfile(req.user.sub, {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    sendSuccess(res, result);
  },
);

profileRouter.post(
  "/change-password",
  authMiddleware,
  csrfMiddleware,
  passwordChangeRateLimit(),
  validate({ body: changePasswordSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");

    const result = await changePassword(req.user.sub, {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    sendSuccess(res, result);
  },
);