## Backend Fingrow - Setup & Testing
### 1. Environment variables
Buat file `.env` di root (boleh pakai nilai contoh, tapi ganti sesuai kebutuhan):

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/capc2?schema=public
JWT_ACCESS_SECRET=12345678901234567890123456789012
JWT_REFRESH_SECRET=12345678901234567890123456789012

# Matikan Redis untuk testing lokal (memory store rate limit)
DISABLE_REDIS=true
# Kalau mau test Redis, hapus DISABLE_REDIS atau set ke false
# dan isi REDIS_URL, contoh:
# REDIS_URL=redis://localhost:6379
```
### 2. Prisma & database

Generate client dan sinkronkan schema ke database:
```bash
npx prisma generate
npx prisma db push
```
### 3. Seed user untuk testing login
Script: `seed-user.mjs`
```bash
node seed-user.mjs
```
Akan membuat / mengupdate user:
- email: `user1@mail.com`
- password: `password123`
### 4. Menjalankan server
```bash
npm run dev
```
Server akan berjalan di `http://localhost:3000`.

### 5. Endpoint API
#### POST `/api/login`
- **Body (JSON)**:
```json
{
  "email": "user1@mail.com",
  "password": "password123"
}
```
- **Response (contoh)**:
  - `data.accessToken` → pakai sebagai Bearer token.
#### POST `/api/transactions`
- **Headers**:
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
- **Body (JSON)**:
```json
{
  "amount": 50000,
  "type": "expense",
  "category": "Food",
  "description": "Makan siang"
}
```
#### GET `/api/transactions?page=1&limit=10`
- **Headers**:
  - `Authorization: Bearer <accessToken>`
Mengembalikan daftar transaksi milik user yang sedang login (aman dari BOLA/IDOR, difilter dengan `userId = req.user.sub`).
### 6. Mode Redis (rate limiting)
- **Testing tanpa Redis (default di lokal)**:
  - `DISABLE_REDIS=true` atau tidak mengisi `REDIS_URL`
  - Rate limit memakai in-memory store Express.
- **Testing dengan Redis (misalnya temanmu jalankan Redis sendiri)**:
  - Jalankan Redis di `localhost:6379` (atau URL lain).
  - Di `.env`:
```bash
DISABLE_REDIS=false
REDIS_URL=redis://localhost:6379
```
  - Restart server (`npm run dev`).
  - Semua rate limiter (`generalRateLimit`, `loginRateLimit`, dll.) akan memakai RedisStore.

