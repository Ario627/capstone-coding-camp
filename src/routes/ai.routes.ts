import { Router } from "express";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { csrfMiddleware } from "../common/middleware/csrf.middleware.js";
import * as aiService from "../modules/ai/ai.service.js";
import {
  narrativeReportSchema,
  financialProjectionSchema,
  financialAnalysisSchema,
  budgetOptimizationSchema,
  anomalyDetectionSchema,
  smartCategorizationSchema,
  goalRecommendationSchema,
  spendingInsightsSchema,
} from "../modules/ai/ai.schema.js";
import { sendSuccess } from "../common/utils/response.util.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";

export const aiRouter = Router();

aiRouter.use(authMiddleware);

/**
 * POST /api/ai/narrative-report
 * Generate narrative financial report
 */
aiRouter.post(
  "/narrative-report",
  csrfMiddleware,
  validate({ body: narrativeReportSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await aiService.narrativeReport(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);

/**
 * POST /api/ai/financial-projection
 * Generate financial projection
 */
aiRouter.post(
  "/financial-projection",
  csrfMiddleware,
  validate({ body: financialProjectionSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await aiService.financialProjection(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);

/**
 * POST /api/ai/financial-analysis
 * Generate comprehensive financial analysis
 */
aiRouter.post(
  "/financial-analysis",
  csrfMiddleware,
  validate({ body: financialAnalysisSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await aiService.financialAnalysis(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);

/**
 * POST /api/ai/budget-optimization
 * Get personalized budget recommendations
 */
aiRouter.post(
  "/budget-optimization",
  csrfMiddleware,
  validate({ body: budgetOptimizationSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await aiService.budgetOptimization(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);

/**
 * POST /api/ai/anomaly-detection
 * Detect unusual spending patterns
 */
aiRouter.post(
  "/anomaly-detection",
  csrfMiddleware,
  validate({ body: anomalyDetectionSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await aiService.anomalyDetection(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);

/**
 * POST /api/ai/smart-categorization
 * Get AI-powered category suggestion for a transaction
 */
aiRouter.post(
  "/smart-categorization",
  csrfMiddleware,
  validate({ body: smartCategorizationSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await aiService.smartCategorization(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);

/**
 * POST /api/ai/goal-recommendation
 * Get personalized financial goal recommendations
 */
aiRouter.post(
  "/goal-recommendation",
  csrfMiddleware,
  validate({ body: goalRecommendationSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await aiService.goalRecommendation(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);

/**
 * POST /api/ai/spending-insights
 * Get detailed spending pattern insights
 */
aiRouter.post(
  "/spending-insights",
  csrfMiddleware,
  validate({ body: spendingInsightsSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const result = await aiService.spendingInsights(req.user.sub, req.body);
    sendSuccess(res, result);
  },
);
