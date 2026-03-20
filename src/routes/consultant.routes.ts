import { Router } from "express";
import { authMiddleware } from "../common/middleware/auth.middleware.js";
import { validate } from "../common/middleware/validate.middleware.js";
import { csrfMiddleware } from "../common/middleware/csrf.middleware.js";
import { quotaMiddleware } from "../common/middleware/quota.middleware.js";
import { AppError } from "../common/middleware/error-handler.middleware.js";
import { sendSuccess } from "../common/utils/response.util.js";
import {
    consultantChatSchema,
    conversationListSchema,
    conversationIdSchema
} from "../modules/ai/ai-consultant.schema.js";

import * as consultantService from "../modules/ai/ai-consultant.service.js";
import multer  from 'multer'
import { consultantRateLimit } from "../common/middleware/rate-limit.middleware.js";

export const consultantRouter = Router();

consultantRouter.use(authMiddleware);

//Multer config
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1,
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "application/x-excel",
          "application/x-msexcel",
        ];

        if(allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Tipe file tidak didukung. Gunakan PDF atau Excel"));
        }
    }
});

// POST /api/consultant/chat
consultantRouter.post(
  '/chat',
  consultantRateLimit(),
  csrfMiddleware,
  quotaMiddleware,
  validate({ body: consultantChatSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    
    const result = await consultantService.chat(req.user.sub, {
      message: req.body.message,
      conversationId: req.body.conversationId,
      context: req.body.context,
    });
    
    sendSuccess(res, result);
  }
);

// POST /api/consultant/chat/file --- Chat dengan file upload
consultantRouter.post(
  '/chat/file',
  consultantRateLimit(),
  csrfMiddleware,
  quotaMiddleware,
  upload.single('file'),
  async (req, res) => {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    
    if (!req.file) {
      throw new AppError(400, 'File diperlukan.', { code: 'FILE_REQUIRED' });
    }
    
    const result = await consultantService.chatWithFile(req.user.sub, {
      message: req.body.message || 'Analisis dokumen ini',
      conversationId: req.body.conversationId,
      context: req.body.context,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
    });
    
    req.file.buffer.fill(0);
    
    sendSuccess(res, result);
  }
);

// GET /api/consultant/quota 
consultantRouter.get('/quota', async (req, res) => {
  if (!req.user) throw new AppError(401, 'Unauthorized');
  
  const quota = await consultantService.getQuotaStatus(req.user.sub);
  
  sendSuccess(res, {
    daily: {
      used: quota.remaining.daily,
      //
    },
    monthly: {
      used: quota.remaining.monthly,
    },
    allowed: quota.allowed,
  });
});

// GET /api/consultant/conversations - List conversations
consultantRouter.get(
  '/conversations',
  validate({ query: conversationListSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    
    const isActive = req.query.isActive !== undefined 
      ? req.query.isActive === 'true' 
      : undefined;
    
    const result = await consultantService.listConversations(
      req.user.sub,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 10,
      isActive
    );
    
    sendSuccess(res, result);
  }
);

// GET /api/consultant/conversations/:id - Get conversation detail
consultantRouter.get(
  '/conversations/:id',
  validate({ params: conversationIdSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    
    const conversation = await consultantService.getConversationDetail(
      req.params.id as string,
      req.user.sub
    );
    
    if (!conversation) {
      throw new AppError(404, 'Percakapan tidak ditemukan.', { code: 'CONVERSATION_NOT_FOUND' });
    }
    
    sendSuccess(res, conversation);
  }
);

// DELETE /api/consultant/conversations/:id - Delete conversation
consultantRouter.delete(
  '/conversations/:id',
  csrfMiddleware,
  validate({ params: conversationIdSchema }),
  async (req, res) => {
    if (!req.user) throw new AppError(401, 'Unauthorized');
    
    await consultantService.deleteConversation(req.params.id as string, req.user.sub);
    
    sendSuccess(res, { message: 'Percakapan berhasil dihapus.' });
  }
);