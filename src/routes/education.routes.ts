import { Router } from "express";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { csrfMiddleware } from "../common/middleware/csrf.middleware.js";
import * as educationService from "../modules/education/education.service.js";
import { educationChatSchema } from "../modules/education/education.schema.js";
import { sendSuccess } from "../common/utils/response.util.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";

export const educationRouter = Router();

educationRouter.use(authMiddleware);

//POST /api/education/chat

educationRouter.post(
  "/chat",
  csrfMiddleware,
  validate({ body: educationChatSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await educationService.educationChat(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);
