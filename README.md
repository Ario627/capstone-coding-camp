# Backend Fingrow - API Documentation

Platform keuangan untuk Gen Z dan UMKM Indonesia.

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Prisma & Database](#2-prisma--database)
3. [Running the Server](#3-running-the-server)
4. [Authentication](#4-authentication)
5. [Transactions API](#5-transactions-api)
6. [Payments API](#6-payments-api)
7. [Education API](#7-education-api)
8. [AI Analysis API](#8-ai-analysis-api)
9. [AI Consultant API](#9-ai-consultant-api)
10. [Rate Limiting](#10-rate-limiting)
11. [Testing](#11-testing)

---

## 1. Environment Variables

Buat file `.env` di folder `backend/`:

```bash
# Environment
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fingrow?schema=public

# Authentication
JWT_ACCESS_SECRET=your-access-secret-at-least-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-at-least-32-characters-long
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Security
CSRF_SECRET=your-csrf-secret-at-least-16-characters

# AI Providers
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key

# Redis (optional for rate limiting)
REDIS_URL=redis://localhost:6379
DISABLE_REDIS=true

# Other
FRONTEND_URL=http://localhost:5173
PAYMENT_WEBHOOK_SECRET=your-webhook-secret
TFL_HASH_SECRET=your-tfl-hash-secret
```


## 2. Prisma & Database

### Generate Client

```bash
cd backend
npm run db:generate
```

### Push Schema to Database

```bash
npm run db:push
```

### Seed Test User

```bash
npm run db:seed
```

Creates test user:
- Email: `user1@mail.com`
- Password: `password123`

---

## 3. Running the Server

### Development Mode

```bash
npm run dev
```

Server runs at `http://localhost:3000`

### Production Mode

```bash
npm run build
npm run start
```

---

## 4. Authentication

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user1@mail.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "user" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Refresh Token

```http
POST /api/auth/refresh
Authorization: Bearer <refreshToken>
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

---

## 5. Transactions API

All endpoints require `Authorization: Bearer <accessToken>` header.

### List Transactions

```http
GET /api/transactions?page=1&limit=10
Authorization: Bearer <accessToken>
```

### Get Summary

```http
GET /api/transactions/summary
Authorization: Bearer <accessToken>
```

### Create Transaction

```http
POST /api/transactions
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount": 50000,
  "type": "expense",
  "category": "food",
  "description": "Makan siang"
}
```

### Update Transaction

```http
PATCH /api/transactions/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount": 55000
}
```

### Delete Transaction (Soft Delete)

```http
DELETE /api/transactions/:id
Authorization: Bearer <accessToken>
```

---

## 6. Payments API

### Initiate Payment

```http
POST /api/payments
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "amount": 100000,
  "method": "BANK_TRANSFER",
  "description": "Premium subscription",
  "idempotencyKey": "unique-key-12345"
}
```

**Payment Methods:**
- `BANK_TRANSFER`
- `EWALLET`
- `QRIS`
- `VIRTUAL_ACCOUNT`
- `CREDIT_CARD`

### Get Payment History

```http
GET /api/payments
Authorization: Bearer <accessToken>
```

### Get Payment Detail

```http
GET /api/payments/:id
Authorization: Bearer <accessToken>
```

---

## 7. Education API

### Chat with Education AI

```http
POST /api/education/chat
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "message": "Apa itu tabungan darurat?",
  "context": "saving"
}
```

**Contexts:** `general` | `saving` | `investing` | `budgeting` | `debt` | `tax` | `umkm`

### Get Daily Tips

```http
GET /api/education/daily-tips?category=saving
Authorization: Bearer <accessToken>
```

### List Learning Modules

```http
GET /api/education/modules?category=budgeting&difficulty=beginner&page=1&limit=10
Authorization: Bearer <accessToken>
```

### Get Module Detail

```http
GET /api/education/modules/:id
Authorization: Bearer <accessToken>
```

### Mark Module as Read

```http
POST /api/education/modules/:id/read
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
```

### List Terminologies

```http
GET /api/education/terminologies?category=investment&search=reksa&page=1&limit=20
Authorization: Bearer <accessToken>
```

### Get Terminology by Slug

```http
GET /api/education/terminologies/:slug
Authorization: Bearer <accessToken>
```

---

## 8. AI Analysis API

All endpoints require authentication and have rate limiting.

### Narrative Report

Generate narrative financial report for a period.

```http
POST /api/ai/narrative-report
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
Content-Type: application/json

{
  "period": "monthly"
}
```

**Periods:** `weekly` | `monthly` | `yearly`

### Financial Projection

Project finances for upcoming months.

```http
POST /api/ai/financial-projection
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
Content-Type: application/json

{
  "months": 6
}
```

### Financial Analysis

Comprehensive financial analysis.

```http
POST /api/ai/financial-analysis
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
Content-Type: application/json

{
  "period": "monthly"
}
```

### Budget Optimization

Get personalized budget recommendations.

```http
POST /api/ai/budget-optimization
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
Content-Type: application/json

{
  "monthlyIncome": 5000000,
  "savingsGoal": "Emergency fund"
}
```

### Anomaly Detection

Detect unusual spending patterns.

```http
POST /api/ai/anomaly-detection
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
Content-Type: application/json

{
  "period": "monthly",
  "sensitivity": "medium"
}
```

### Smart Categorization

AI-powered transaction categorization.

```http
POST /api/ai/smart-categorization
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
Content-Type: application/json

{
  "description": "Beli kopi di Starbucks",
  "amount": 50000,
  "vendor": "Starbucks"
}
```

### Goal Recommendation

Get financial goal recommendations.

```http
POST /api/ai/goal-recommendation
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
Content-Type: application/json

{
  "goalType": "emergency_fund",
  "timeframe": "short"
}
```

### Spending Insights

Analyze spending patterns.

```http
POST /api/ai/spending-insights
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
Content-Type: application/json

{
  "depth": "standard",
  "focus": "all"
}
```

---

## 9. AI Consultant API

Personal financial consultant with access to user's financial data.

### Chat with Consultant

```http
POST /api/consultant/chat
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
Content-Type: application/json

{
  "message": "Bagaimana kondisi keuangan saya bulan ini?",
  "context": "general"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reply": "Berdasarkan data keuangan Anda...",
    "conversationId": "abc123",
    "context": "general",
    "tokens": { "input": 500, "output": 300, "total": 800 },
    "provider": "groq",
    "quotaRemaining": { "daily": 19, "monthly": 99 }
  }
}
```

Continue conversation:
```json
{
  "message": "Berapa sisa budget saya?",
  "conversationId": "abc123",
  "context": "budget"
}
```

**Contexts:** `general` | `budget` | `investment` | `debt` | `business`

### Chat with File Upload

Upload financial document (PDF/Excel) for analysis.

```http
POST /api/consultant/chat/file
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
Content-Type: multipart/form-data

file: <PDF or Excel file>
message: "Analisis laporan keuangan ini"
context: "general"
```

**File Requirements:**
- Max size: 5MB
- Allowed types: PDF (`.pdf`), Excel (`.xlsx`, `.xls`)

### Get Quota Status

```http
GET /api/consultant/quota
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "daily": { "used": 5, "remaining": 15 },
    "monthly": { "used": 25, "remaining": 75 },
    "allowed": true
  }
}
```

### List Conversations

```http
GET /api/consultant/conversations?page=1&limit=10&isActive=true
Authorization: Bearer <accessToken>
```

### Get Conversation Detail

```http
GET /api/consultant/conversations/:id
Authorization: Bearer <accessToken>
```

### Delete Conversation

```http
DELETE /api/consultant/conversations/:id
Authorization: Bearer <accessToken>
X-CSRF-Token: <csrfToken>
```

---

## 10. Rate Limiting

All endpoints have rate limiting to prevent abuse.

| Endpoint Type | Rate Limit | Window |
|--------------|------------|--------|
| General | 100 requests | 1 minute |
| Login | 5 requests | 15 minutes |
| Registration | 5 requests | 15 minutes |
| Payment | 10 requests | 1 minute |
| AI Analysis | 10 requests | 1 minute |
| AI Consultant | 5 requests | 1 minute |
| Consultant Quota | 20 requests | per day |
| Consultant Quota | 100 requests | per month |

### Redis Configuration

For production, use Redis for distributed rate limiting:

```bash
REDIS_URL=redis://localhost:6379
DISABLE_REDIS=false
```

---

## 11. Testing

### Health Check

```http
GET /health
```

### Test User Credentials

| Email | Password |
|-------|----------|
| `user1@mail.com` | `password123` |

### CSRF Token

For POST/PUT/DELETE requests, include CSRF token:
1. Login to get token
2. Include `X-CSRF-Token` header for mutation requests

---

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app.ts                  # Express app setup
│   ├── server.ts               # Server entry point
│   ├── config/
│   │   └── env.config.ts       # Environment config
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client
│   │   └── redis.ts            # Redis client
│   ├── modules/
│   │   ├── ai/                 # AI Analysis module
│   │   ├── auth/               # Authentication module
│   │   ├── education/          # Education module
│   │   ├── payments/           # Payment module
│   │   └── umkm/               # UMKM module
│   ├── routes/
│   │   ├── ai.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── consultant.routes.ts
│   │   ├── education.routes.ts
│   │   ├── payment.routes.ts
│   │   ├── transactions.routes.ts
│   │   └── umkm.routes.ts
│   └── common/
│       ├── constants/
│       ├── middleware/
│       └── utils/
├── package.json
└── tsconfig.json
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.2.1 | Web framework |
| @prisma/client | ^5.22.0 | ORM |
| groq-sdk | ^1.1.1 | Groq AI API |
| @google/generative-ai | ^0.24.1 | Gemini AI API |
| jsonwebtoken | ^9.0.3 | JWT auth |
| argon2 | ^0.44.0 | Password hashing |
| zod | ^4.3.6 | Validation |
| multer | ^1.4.5-lts.1 | File upload (for consultant) |
| pdf-parse | ^1.1.1 | PDF parsing |
| xlsx | ^0.18.5 | Excel parsing |
| ioredis | ^5.10.0 | Redis client |
| express-rate-limit | ^8.3.0 | Rate limiting |

---

## AI Provider Configuration

The app uses Groq as primary AI provider with Gemini fallback:

```
Request → Groq API → Success ✓
                ↓ Failed
           Gemini API → Success ✓
```

Ensure at least one AI provider is configured:
- `GROQ_API_KEY` - Recommended (faster, cheaper)
- `GEMINI_API_KEY` - Fallback option

---

## Security Features

- ✅ JWT Authentication
- ✅ CSRF Protection
- ✅ Rate Limiting (per user/IP)
- ✅ Input Validation (Zod)
- ✅ SQL Injection Protection (Prisma)
- ✅ XSS Protection (Helmet)
- ✅ CORS Configuration
- ✅ Prompt Injection Detection
- ✅ File Upload Validation (Magic Bytes)
- ✅ Quota Management

---

## License

MIT