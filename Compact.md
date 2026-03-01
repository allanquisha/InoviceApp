# FieldPay - Project Compact

## What We Built

A full-stack web application for managing invoices and estimates with integrated Stripe Connect API payment processing. Complete monorepo setup with backend API and React frontend, ready for feature development.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express.js + TypeScript |
| **Frontend** | React 18 + TypeScript + Vite |
| **Database** | SQLite with Prisma ORM |
| **Payments** | Stripe Connect API |
| **Auth** | JWT-based |

## Project Scope

### Core Features (Planned)
- **Invoice Management**: Create, edit, delete, view invoices
- **Estimate Management**: Create estimates, convert to invoices
- **Payment Processing**: Stripe Connect integration with webhook support
- **Authentication**: User signup/login with JWT tokens
- **Dashboard**: Analytics and overview of invoices/estimates

### Data Models
- **User**: Account with Stripe Connect integration
- **Invoice & InvoiceItems**: Full invoice records with line items
- **Estimate & EstimateItems**: Quotes with line items
- **Payment**: Stripe payment tracking and status

## What Was Completed

✅ Project scaffolding and folder structure  
✅ Backend server setup (Express + TypeScript with middleware)  
✅ Frontend app setup (React + Vite with routing ready)  
✅ Database schema designed (6 models with relationships)  
✅ All dependencies installed and configured  
✅ Environment files created (.env templates)  
✅ TypeScript configs for type safety  
✅ ESLint & Prettier for code quality  
✅ Build verification (both server & client compile successfully)  
✅ Development scripts ready (npm run dev for both)  

## Getting Started

```bash
# Install dependencies (if needed)
npm run install-all

# Start development servers
npm run dev
# Backend: http://localhost:5000
# Frontend: http://localhost:5173

# Build for production
npm run build
```

## File Structure Highlights

```
server/
├── src/index.ts          # Express server entry point
├── prisma/schema.prisma  # Database models
├── routes/               # API endpoints (ready to build)
└── middleware/           # Auth & middleware (ready to build)

client/
├── App.tsx              # Main app component
├── main.tsx             # React entry point
└── vite.config.ts       # Build config with proxy to API
```

## Next: Implementation Checklist

- [ ] Database migration: `cd server && npx prisma migrate dev`
- [ ] Configure Stripe keys in `.env` files
- [ ] Build API routes (users, invoices, estimates, payments)
- [ ] Create React pages & components for dashboard
- [ ] Implement JWT authentication (register/login/logout)
- [ ] Connect frontend to API with axios
- [ ] Add Stripe payment form integration
- [ ] Set up webhook handlers for Stripe events

## Environment Setup

Get your Stripe API keys from [https://stripe.com](https://stripe.com) and add to `server/.env` and `client/.env`.

Required keys:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Development Notes

- Backend runs on port 5000 (configurable via `PORT` env var)
- Frontend dev server on port 5173 with API proxy to backend
- Database is SQLite (file-based: `server/dev.db`)
- Hot reload enabled on both for rapid development
