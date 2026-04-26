# VoyageurAI — Setup Guide

## ⚠️ IMPORTANT: Node & Package Versions

- **Node.js**: v20 LTS (required — v24 has esbuild compatibility issues with some packages)
- **Vite**: v5.4.x (pinned — do NOT upgrade to v8, which uses rolldown and breaks JSX)
- **React Router**: v6.x

---

## 🚀 Quick Start

### Backend
```bash
cd Backend
# Delete old node_modules if upgrading from previous version
rm -rf node_modules package-lock.json
npm install
# Copy and fill in your environment variables
cp .env.example .env
npm run dev
```

### Frontend
```bash
cd Front-end
# Delete old node_modules and lock file (critical if you had Vite 8 installed)
rm -rf node_modules package-lock.json
npm install
# Create .env file
echo "VITE_API_URL=http://localhost:5000/api" > .env
npm run dev
```

---

## 🔧 Environment Variables

### Backend `.env`
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key_minimum_32_chars
GEMINI_API_KEY=AIza...
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
ADMIN_EMAIL=admin@yourdomain.com
FRONTEND_URL=http://localhost:5173
ARCJET_KEY=ajkey_...
FREE_TRIP_LIMIT=5
NODE_ENV=development
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000/api
```

---

## 🃏 Stripe Test Cards
| Card Number | Result |
|---|---|
| 4242 4242 4242 4242 | ✅ Always succeeds |
| 4000 0000 0000 0002 | ❌ Always declines |

Use any future expiry date and any 3-digit CVC.

---

## 🐛 Common Issues

### "PARSE_ERROR: Unexpected token"
Your npm installed Vite 8 which uses rolldown. Fix:
```bash
cd Front-end
rm -rf node_modules package-lock.json
npm install
```
This reinstalls Vite 5 (pinned in package.json).

### "Transform failed with 2 errors" (Backend)
Usually a TypeScript duplicate export or syntax error. The fixed files are all clean now.

### Google OAuth doesn't show account chooser
The backend redirects with `prompt=select_account` — this forces Google to show the chooser even if already signed in.

### API timeout on trip creation
Normal — Gemini AI can take 15-45 seconds. The frontend timeout is set to 60 seconds.

---

## 📁 Changed Files Summary

### Backend
```
src/models/User.ts           — removed Facebook, added avatar
src/models/Trip.ts           — added 'cancelled' status
src/models/Blog.ts           — NEW
src/models/Booking.ts        — tripId optional, planType added
src/models/SupportTicket.ts  — messages[] thread array
src/controllers/auth.controller.ts   — Google prompt=select_account, avatar, password change
src/controllers/admin.controller.ts  — real stats, regional data, fix itinerary select
src/controllers/blog.controller.ts   — NEW (CRUD)
src/controllers/booking.controller.ts — fixed dynamic import, Stripe test
src/controllers/support.controller.ts — message threading
src/controllers/trip.controller.ts   — fixed duplicate, renamed saveTrip→createTrip
src/routes/admin.routes.ts   — blog CRUD + support message routes
src/routes/blog.routes.ts    — NEW
src/routes/support.routes.ts — my tickets + user message
src/routes/trip.routes.ts    — PATCH /:id/status
src/utils/validators.ts      — removed Facebook, added avatar/password, cancelled status
src/app.ts                   — blog routes registered
src/types/index.ts           — IBlog, avatar, cancelled, planType
package.json                 — latest stable versions
```

### Frontend
```
src/App.jsx                          — BrowserRouter + all page routes
src/pages/AuthPage.jsx               — cleaned console.logs, removed Facebook
src/pages/BlogDetailPage.jsx         — NEW
src/pages/Dashboard.jsx              — history redesign, trip status, pro display
src/pages/ProfilePage.jsx            — avatar upload, password API, unlimited pro
src/pages/SupportPage.jsx            — ticket thread UI
src/components/TripCard.jsx          — complete/cancel dropdown
src/components/auth/SocialButtons.jsx — Google only, no Facebook
src/components/landing/BlogsSection.jsx — API fetch + navigate
src/constants/data.js                — Wikimedia image URLs
src/api/client.js                    — 60s timeout, /login redirect, clean logs
src/admin/AdminPanel.jsx             — blogs tab, fixed bookingMeta
src/admin/AdminSidebar.jsx           — blogs nav, no return-to-site
src/admin/dashboard/AdminDashboard.jsx — real stats
src/admin/trips/AdminTrips.jsx       — analytics/table/grid views
src/admin/bookings/AdminBookings.jsx — revenue KPIs
src/admin/support/AdminSupport.jsx   — full thread messaging
src/admin/blogs/AdminBlogs.jsx       — NEW (CRUD)
vite.config.js                       — fixed (no invalid options)
package.json                         — Vite 5 pinned
```
