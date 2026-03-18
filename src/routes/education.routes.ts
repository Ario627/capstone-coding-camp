import { Router } from "express";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { csrfMiddleware } from "../common/middleware/csrf.middleware.js";
import * as educationService from "../modules/education/education.service.js";
import { sendSuccess } from "../common/utils/response.util.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
import {
  educationChatSchema,
  dailyTipsSchema,
  learningModulesSchema,
  moduleIdSchema,
  terminologyListSchema,
  terminologySlugSchema,
} from "../modules/education/education.schema.js";

export const educationRouter = Router();
educationRouter.use(authMiddleware);

educationRouter.post(
  '/chat',
  csrfMiddleware,
  validate({ body: educationChatSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const result = await educationService.educationChat(req.user.sub, {
      message: req.body.message,
      context: req.body.context,
    });
    sendSuccess(res, result);
  }
);

educationRouter.get(
  '/daily-tips',
  validate({ query: dailyTipsSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const result = await educationService.getDailyTip(req.user.sub, {
      category: req.query.category as string,
    });
    sendSuccess(res, result);
  }
);

educationRouter.post(
  '/daily-tips/:id/read',
  csrfMiddleware,
  async (req, res) => {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const result = await educationService.markDailyTipRead(req.user.sub, req.params.id as string);
    sendSuccess(res, result);
  }
);

//Learning
educationRouter.get(
  '/modules',
  validate({ query: learningModulesSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    const result = await educationService.listLearningModules({
      ...(req.query.category && { category: req.query.category as string }),
      ...(req.query.difficulty && { difficulty: req.query.difficulty as string }),
      ...(req.query.page && { page: Number(req.query.page) }),
      ...(req.query.limit && { limit: Number(req.query.limit) }),
    });
    sendSuccess(res, result);
  }
);

