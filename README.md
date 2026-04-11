# 🚀 FinGrow — Backend API

Hei! Selamat datang di repository backend **FinGrow** 🎉

FinGrow itu platform keuangan digital yang dirancang khusus buat Gen Z dan pelaku UMKM di Indonesia. Backend ini ngehandle semua logika bisnis mulai dari autentikasi, transaksi, pembayaran, edukasi keuangan, sampai konsultasi AI — semua dalam satu tempat biar makin gampang ngelola keuangan.

---

## 📋 Daftar Isi

- [Deskripsi Singkat Proyek](#-deskripsi-singkat-proyek)
- [Tech Stack](#-tech-stack)
- [Petunjuk Setup Environment](#-petunjuk-setup-environment)
- [Tautan Model ML (AI)](#-tautan-model-ml-ai)
- [Cara Menjalankan Aplikasi](#-cara-menjalankan-aplikasi)
- [Struktur Proyek](#-struktur-proyek)
- [API Endpoints](#-api-endpoints)
- [Keamanan](#-keamanan)
- [Troubleshooting](#-troubleshooting)

---

## 🏠 Deskripsi Singkat Proyek

**FinGrow Backend** adalah server API yang jadi "otak" dari aplikasi FinGrow. Singkatnya, backend ini nyediain:

- **Autentikasi** — Register, login, refresh token, logout (JWT-based)
- **Transaksi** — CRUD transaksi keuangan pribadi (pemasukan & pengeluaran)
- **Wallet & Pembayaran** — Dompet digital, transfer antar user, top-up, pembayaran QRIS, dan integrasi Midtrans
- **UMKM** — Manajemen bisnis UMKM, inventori, laporan keuangan
- **Edukasi Keuangan** — Belajar soal keuangan pakai AI, modul pembelajaran, tips harian, dan kamuan istilah finansial
- **AI Analysis** — Analisis keuangan otomatis, proyeksi finansial, deteksi anomali, smart categorization
- **AI Consultant** — Konsultasi keuangan personal 1-on-1 dengan AI (bisa upload file PDF/Excel juga lho!)

Intinya, semua yang berhubungan dengan data dan logika bisnis ada di sini. Frontend tinggal hit API dan render data aja.

---

## 🛠 Tech Stack

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **Node.js** | 18+ | Runtime environment |
| **Express** | ^5.2.1 | Web framework |
| **TypeScript** | ^5.9.3 | Bahasa pemrograman (strict typed) |
| **Prisma** | ^5.22.0 | ORM untuk database |
| **PostgreSQL** | — | Database utama |
| **Redis** | (opsional) | Rate limiting distributed |
| **Groq SDK** | ^1.1.1 | AI Provider utama (Llama) |
| **Google Generative AI** | ^0.24.1 | AI Provider fallback (Gemini) |
| **Midtrans** | ^1.4.3 | Payment gateway |
| **JWT** | ^9.0.3 | Autentikasi token |
| **Argon2** | ^0.44.0 | Password hashing |
| **Zod** | ^4.3.6 | Validasi input |
| **Pino** | ^10.3.1 | Logging |
| **Helmet** | ^8.1.0 | Security headers |
| **Multer** | ^2.1.1 | File upload handler |

---

## 🔧 Petunjuk Setup Environment

Oke, let's get this running! Ikuti langkah-langkah berikut ya:

### 1. Prasyarat

Pastikan di komputer kamu udah terinstall:

- **Node.js** versi 18 atau yang lebih baru — [Download di sini](https://nodejs.org/)
- **npm** (biasanya udah ikut sama Node.js)
- **PostgreSQL** versi 14+ — [Download di sini](https://www.postgresql.org/download/) atau bisa pakai Docker
- **Redis** (opsional, buat production rate limiting) — bisa skip kalau development aja
- **Git** — [Download di sini](https://git-scm.com/)

### 2. Clone & Install Dependencies

```bash
# Clone dulu repo-nya
git clone <url-repo-kamu>
cd capc2f/backend

# Install semua dependency
npm install
```

### 3. Setup Database PostgreSQL

Buat database baru di PostgreSQL:

```sql
-- Masuk ke PostgreSQL CLI atau pake GUI tool seperti pgAdmin
CREATE DATABASE capc2;

-- Atau kalau mau pake nama lain, sesuaikan aja DATABASE_URL-nya
```

### 4. Konfigurasi Environment Variables

Copy file `.env.example` jadi `.env`, terus isi nilai-nilai yang diperlukan:

```bash
cp .env.example .env
```

Buka file `.env` dan isi konfigurasi berikut:

```env
# === DATABASE ===
# Sesuaikan dengan setup PostgreSQL kamu
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/capc2?schema=public

# === SERVER ===
NODE_ENV=development
PORT=3000

# === AUTHENTICATION (WAJIB DIUBAH DI PRODUCTION!) ===
# Generate secret yang kuat, minimal 32 karakter
JWT_ACCESS_SECRET="isi_dengan_secret_yang_kuat_minimal_32_karakter"
JWT_REFRESH_SECRET="isi_dengan_secret_yang_beda_biar_aman"
JWT_EXPIRES_IN=7d

# === SECURITY ===
CSRF_SECRET="isi_secret_csrf_minimal_16_karakter"

# === AI PROVIDERS ===
# Daftar akun di https://console.groq.com/ untuk dapetin key
GROQ_API_KEY="your-groq-api-key-here"

# Daftar akun di https://aistudio.google.com/ untuk dapetin key
GEMINI_API_KEY="your-gemini-api-key-here"

# === PAYMENT (MIDTRANS) ===
# Daftar di https://dashboard.midtrans.com/ — pake sandbox dulu buat development
MIDTRANS_SERVER_KEY=SB-Midserver-xxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxx
MIDTRANS_IS_PRODUCTION=false

# === REDIS (OPSIONAL BUAT DEVELOPMENT) ===
# Kalau mau pake Redis buat rate limiting yang lebih oke
REDIS_URL=redis://localhost:6379
DISABLE_REDIS=true

# === CORS ===
FRONTEND_URL=http://localhost:5173

# === OTHER ===
PAYMENT_WEBHOOK_SECRET="your-webhook-secret"
TFL_HASH_SECRET="your-tfl-hash-secret"
```

> ⚠️ **Penting!** Jangan pernah commit file `.env` ke Git! Udah ada di `.gitignore` sih, tapi tetap hati-hati ya.

### 5. Setup Database Schema & Seed

Setelah database dan `.env` siap, jalankan:

```bash
# Generate Prisma Client dari schema
npm run db:generate

# Push schema ke database (buat tabel-tabelnya)
npm run db:push

# Seed data awal (user buat testing)
npm run db:seed
```

Atau kalau mau sekali jalan:

```bash
npm run db:setup
```

Ini bakal ngebuat user test dengan kredensial:
- 📧 Email: `user1@mail.com`
- 🔑 Password: `password123`

---

## 🧠 Tautan Model ML (AI)

FinGrow memanfaatkan model AI (Large Language Model) untuk berbagai fitur pintarnya. Kami pakai model dari **Groq** sebagai provider utama dan **Google Gemini** sebagai fallback.

### Model yang Digunakan

| Provider | Model | Fungsi Utama | Link |
|----------|-------|---------------|------|
| **Groq** | `llama-3.3-70b-versatile` | Analisis keuangan, naratif laporan, smart categorization | [Groq Console](https://console.groq.com/) |
| **Groq** | `llama-3.1-8b-instant` | Quick tasks, categorization ringan | [Groq Console](https://console.groq.com/) |
| **Google** | `gemini-2.0-flash` | Fallback AI, edukasi keuangan | [Google AI Studio](https://aistudio.google.com/) |
| **Google** | `gemini-2.0-pro` | Task yang butuh reasoning lebih dalam | [Google AI Studio](https://aistudio.google.com/) |

### Cara Mendapatkan API Key

#### Groq (Provider Utama — Direkomendasikan!)
1. Buka [https://console.groq.com/](https://console.groq.com/)
2. Daftar atau login dengan akun Google/GitHub
3. Masuk ke menu **API Keys**
4. Klik **Create API Key**
5. Copy key-nya dan taruh di `.env` sebagai `GROQ_API_KEY`

#### Google Gemini (Fallback)
1. Buka [https://aistudio.google.com/](https://aistudio.google.com/)
2. Login dengan akun Google
3. Klik **Get API Key** di sidebar
4. Buat project baru atau pilih yang sudah ada
5. Copy key-nya dan taruh di `.env` sebagai `GEMINI_API_KEY`

### Mekanisme Fallback AI

```
Request masuk → Coba Groq (Llama 3.3 70B)
                    ↓ Kalau gagal
                Fallback ke Gemini (2.0 Flash)
                    ↓ Kalau gagal juga
                Return error 503 (Service Unavailable)
```

Jadi minimal salah satu API key harus aktif ya! Tapi disarankan keduanya diisi biar ada backup kalau salah satu down.

---

## ▶️ Cara Menjalankan Aplikasi

### Development Mode (Disarankan saat development)

```bash
npm run dev
```

Server akan jalan di `http://localhost:3000` dan otomatis restart setiap ada perubahan file (hot reload menggunakan `tsx watch`).

### Production Mode

```bash
# Build dulu (compile TypeScript ke JavaScript)
npm run build

# Terus jalanin hasilnya
npm start
```

### Tersedia Juga Script Lainnya

| Command | Fungsi |
|---------|--------|
| `npm run dev` | Jalankan server dengan hot reload |
| `npm run build` | Build project (generate Prisma + compile TS) |
| `npm start` | Jalankan server dari hasil build |
| `npm run db:generate` | Generate Prisma Client dari schema |
| `npm run db:push` | Push schema ke database |
| `npm run db:seed` | Isi database dengan data awal (test user) |
| `npm run db:setup` | Setup database lengkap (generate + push + seed) |

### Cek Apakah Server Sudah Jalan

Buka browser atau pakai `curl`:

```bash
curl http://localhost:3000/health
```

Kalau balasannya sesuai, berarti server udah siap! 🎉

---

## 📁 Struktur Proyek

```
backend/
├── prisma/
│   ├── schema.prisma            # Skema database (PostgreSQL)
│   └── seed.ts                  # Script seed data awal
├── src/
│   ├── app.ts                   # Konfigurasi Express app (middleware, routes, dll)
│   ├── server.ts                 # Entry point — ngejalanin server
│   ├── config/
│   │   └── env.config.ts         # Konfigurasi environment variables
│   ├── lib/
│   │   ├── prisma.ts             # Singleton Prisma Client
│   │   └── redis.ts              # Konfigurasi Redis client
│   ├── common/
│   │   ├── constants/            # Konstanta global
│   │   ├── middleware/           # Middleware (auth, csrf, rate-limit, dll)
│   │   └── utils/                # Utility functions (crypto, response, dll)
│   ├── modules/
│   │   ├── ai/                   # Modul AI Analysis & Provider
│   │   │   ├── ai.provider.ts       # Groq + Gemini fallback logic
│   │   │   ├── ai.service.ts        # AI analysis services
│   │   │   ├── ai.constant.ts       # Model, limit, dan prompt config
│   │   │   └── ...
│   │   ├── auth/                 # Autentikasi (register, login, refresh)
│   │   ├── education/            # Edukasi keuangan (chat, modules, tips)
│   │   ├── payments/             # Payment processing
│   │   ├── profiles/             # User profile management
│   │   ├── umkm/                 # UMKM business management
│   │   └── wallet/               # Dompet digital (transfer, QRIS, top-up, PPOB)
│   └── routes/                   # Route definitions per module
│       ├── ai.routes.ts
│       ├── auth.routes.ts
│       ├── consultant.routes.ts
│       ├── education.routes.ts
│       ├── payment.routes.ts
│       ├── profile.routes.ts
│       ├── transactions.routes.ts
│       ├── umkm.routes.ts
│       └── wallet.routes.ts
├── .env.example                  # Template environment variables
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config
└── seed-user.mjs                 # Script seed user tambahan
```

---

## 🛣 API Endpoints

Semua endpoint yang butuh autentikasi harus menyertakan header `Authorization: Bearer <accessToken>`.

### Auth
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/register` | Daftar akun baru |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |

### Transactions
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/transactions` | List transaksi (paginated) |
| GET | `/api/transactions/summary` | Ringkasan transaksi |
| POST | `/api/transactions` | Buat transaksi baru |
| PATCH | `/api/transactions/:id` | Update transaksi |
| DELETE | `/api/transactions/:id` | Hapus transaksi (soft delete) |

### Wallet & Payments
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/payments` | Inisiasi pembayaran |
| GET | `/api/payments` | Riwayat pembayaran |
| GET | `/api/payments/:id` | Detail pembayaran |

### AI Analysis
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/ai/narrative-report` | Laporan naratif keuangan |
| POST | `/api/ai/financial-projection` | Proyeksi keuangan |
| POST | `/api/ai/financial-analysis` | Analisis keuangan komprehensif |
| POST | `/api/ai/budget-optimization` | Rekomendasi budget |
| POST | `/api/ai/anomaly-detection` | Deteksi anomali pengeluaran |
| POST | `/api/ai/smart-categorization` | Kategorisasi otomatis |
| POST | `/api/ai/goal-recommendation` | Rekomendasi tujuan keuangan |
| POST | `/api/ai/spending-insights` | Insight pengeluaran |

### AI Consultant
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/consultant/chat` | Chat konsultasi keuangan |
| POST | `/api/consultant/chat/file` | Upload file untuk analisis |
| GET | `/api/consultant/quota` | Cek sisa quota |
| GET | `/api/consultant/conversations` | List percakapan |
| GET | `/api/consultant/conversations/:id` | Detail percakapan |
| DELETE | `/api/consultant/conversations/:id` | Hapus percakapan |

### Education
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/education/chat` | Chat edukasi keuangan |
| GET | `/api/education/daily-tips` | Tips harian |
| GET | `/api/education/modules` | List modul pembelajaran |
| GET | `/api/education/modules/:id` | Detail modul |
| POST | `/api/education/modules/:id/read` | Tandai modul sudah dibaca |
| GET | `/api/education/terminologies` | Kamus istilah finansial |

---

## 🔒 Keamanan

Backend ini dilengkapi beberapa lapisan keamanan:

- ✅ **JWT Authentication** — Access token + refresh token rotation
- ✅ **CSRF Protection** — Double-submit cookie pattern
- ✅ **Rate Limiting** — Per-user dan per-IP (support Redis buat production)
- ✅ **Input Validation** — Semua input divalidasi pakai Zod
- ✅ **SQL Injection Protection** — Prisma ORM parameterized queries
- ✅ **XSS Protection** — Helmet middleware
- ✅ **CORS Configuration** — Whitelist origin yang diizinkan
- ✅ **Prompt Injection Detection** — Filter input AI dari serangan prompt injection
- ✅ **File Upload Validation** — Magic bytes verification buat file upload
- ✅ **Quota Management** — Limit penggunaan AI per hari dan per bulan

---

## 🐛 Troubleshooting

### "No AI providers configured!"
Pastikan minimal salah satu API key (GROQ_API_KEY atau GEMINI_API_KEY) udah diisi di `.env`.

### "Can't reach database"
Cek koneksi PostgreSQL kamu, pastikan database `capc2` udah dibuat dan `DATABASE_URL` di `.env` udah bener.

### "Port 3000 already in use"
Ubah `PORT` di `.env` ke port lain, atau matikan aplikasi yang lagi pake port 3000.

### Redis connection error
Kalau belum install Redis, set `DISABLE_REDIS=true` di `.env`. Ini fine buat development.

### Prisma Client not generated
Jalankan `npm run db:generate` untuk generate ulang Prisma Client.

---

## 📜 License

MIT — bebas dipake dan dimodifikasi. Tolong tetap kasih attribution ya! 😊