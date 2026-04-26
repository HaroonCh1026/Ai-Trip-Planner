# VoyageurAI — Backend API

Production-grade Node.js + Express + TypeScript backend for the VoyageurAI
Pakistan travel planner. Built to match the exact frontend data shapes in
the React codebase.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Open .env and fill in:
#   MONGODB_URI   — your MongoDB connection string
#   JWT_SECRET    — 32+ random characters
#   GEMINI_API_KEY — from https://aistudio.google.com/app/apikey

# 3. Start development server
npm run dev
# → http://localhost:5000
# → http://localhost:5000/health
```

---

## Project Structure

```
src/
├── config/
│   ├── config.ts          Env loader — fails fast if vars missing
│   └── database.ts        MongoDB connection
├── models/
│   ├── User.ts            name, email, phone, city, bio, role, plan, status
│   ├── Trip.ts            Full itinerary with activities + hotel per day
│   └── Booking.ts         Transactions shown in AdminBookings
├── controllers/
│   ├── auth.controller.ts register, login, socialLogin, getMe, updateProfile
│   ├── ai.controller.ts   generateItinerary (Gemini)
│   ├── trip.controller.ts save, list, getById, updateStatus, delete
│   ├── booking.controller.ts create, getUserBookings
│   └── admin.controller.ts stats, users CRUD, trips list, bookings list
├── middleware/
│   ├── auth.middleware.ts  JWT verify + role guard
│   ├── validate.middleware.ts Joi validation factory
│   └── error.middleware.ts Global error handler + 404
├── routes/
│   ├── auth.routes.ts
│   ├── ai.routes.ts       (rate limited: 10 req/hr)
│   ├── trip.routes.ts
│   ├── booking.routes.ts
│   └── admin.routes.ts    (admin role only)
├── services/
│   └── gemini.service.ts  Gemini 2.5 Flash — same prompt as frontend
├── types/
│   └── index.ts           All TypeScript interfaces
├── utils/
│   ├── validators.ts      Joi schemas for all routes
│   ├── response.ts        sendSuccess / sendError helpers
│   └── jwt.ts             signToken / verifyToken
├── app.ts                 Express setup (CORS, helmet, rate limit, routes)
└── server.ts              Entry point — DB connect + graceful shutdown
```

---

## Security

- **Helmet** — secure HTTP headers
- **CORS** — whitelist from `ALLOWED_ORIGINS` env var
- **Rate limiting** — 100 req/15 min global; 10 req/hr on AI route
- **bcryptjs** — passwords hashed at salt rounds 12
- **JWT** — 7-day expiry, `select: false` on password field
- **Joi** — input validation on every POST/PATCH route
- **Role guard** — admin routes locked behind `role: 'admin'`
- **Blocked users** — login rejected with 403

---

## Build for production

```bash
npm run build   # compiles to dist/
npm start       # runs dist/server.js
```

---

## Frontend Integration

See **FRONTEND_INTEGRATION.md** — complete step-by-step wiring for every
page and component in your React codebase.
