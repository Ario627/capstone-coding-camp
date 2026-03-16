import { Router } from "express";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { csrfMiddleware } from "../common/middleware/csrf.middleware.js";
import { tflHash } from "../common/middleware/tfl.middleware.js";
import { initiatePaymentSchema, paymentIdParam } from "../modules/payments/payment.schema.js";
import { sendSuccess, sendCreated } from "../common/utils/response.util.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
import * as paymentService  from "../modules/payments/peyment.service.js";

export const paymentRouter = Router();

// Post /api/payments/initiate
paymentRouter.post("/initiate", authMiddleware, csrfMiddleware, tflHash, validate({body: initiatePaymentSchema}), async (req, res) => {
    if(!req.user) throw new AppError(401, 'Unauthorized');

    const result =  await paymentService.initiatePayment(req.user.sub, req.body);
    sendSuccess(res, result);
});

// Post /api/payments/webhook
paymentRouter.post("/payments/webhook", async (req, res) => {
    const result = await paymentService.handlePaymentWebhook(
        req.headers['x-webhook-signature'] as string | undefined,
        req.body as Record<string, unknown>,
    );
    sendSuccess(res, result);
});

// Get /api/payments/history
paymentRouter.get("/payments/history", authMiddleware, async (req, res) => {
    if(!req.user) throw new AppError(401, "Unauthorized");
    const history = await paymentService.getPaymentHistory(req.user.sub);
    sendSuccess(res, history);
});

// Get /api/payments/:id
paymentRouter.get("/payments/:id", authMiddleware, validate({params: paymentIdParam}), async (req, res) => {
    if(!req.user) throw new AppError(401, "Unauthorized");
    const payment = await paymentService.getPayment(req.user.sub, String(req.params.id));
    sendSuccess(res, payment);
})