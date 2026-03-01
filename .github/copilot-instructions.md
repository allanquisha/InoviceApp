# FieldPay - Invoice & Estimate Management Web App

## Project Overview
FieldPay is a full-stack web application for managing invoices and estimates with integrated Stripe Connect API payment handling.

**Tech Stack:**
- Backend: Node.js + Express.js + TypeScript
- Frontend: React + TypeScript + Vite
- Database: SQLite with Prisma ORM
- Payment: Stripe Connect API with webhook support
- Authentication: JWT-based

## Project Setup Checklist

- [x] Scaffold the project structure
- [x] Initialize backend (Express + TypeScript)
- [x] Initialize frontend (React + Vite)
- [x] Set up database schema (Prisma)
- [x] Install all dependencies
- [x] Configure environment variables
- [x] Test build and verify both servers build successfully
- [x] Create configuration for development

## Development Workflow

**Start Development Server:**
```bash
npm run dev
```

This will start both backend (port 5000) and frontend (port 5173) servers concurrently.

**Backend Only:**
```bash
npm run dev:server
```

**Frontend Only:**
```bash
npm run dev:client
```

**Build for Production:**
```bash
npm run build
```

## Project Structure

```
FieldPay/
├── .github/
│   └── copilot-instructions.md
├── server/
│   ├── src/
│   │   ├── index.ts (Express server)
│   │   ├── routes/
│   │   └── middleware/
│   ├── prisma/
│   │   └── schema.prisma (Database schema)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env (Configure with Stripe & JWT keys)
├── client/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env (Configure with API URL)
├── package.json (Root - npm scripts for monorepo)
└── README.md
```

## Key Features to Implement

- Invoice management (create, edit, delete, view)
- Estimate management (create, convert to invoice)
- Stripe Connect payment processing
- Webhook handling for payment events
- User authentication and authorization
- Dashboard with analytics

## Environment Variables

### Server (.env)
```
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=dev_secret_key_change_in_production
JWT_EXPIRATION=7d
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=http://localhost:5173
```

### Client (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

## Database Schema

The project includes a comprehensive Prisma schema with the following models:
- **User**: User accounts with Stripe Connect integration
- **Invoice**: Invoice records with items and payment tracking
- **InvoiceItem**: Line items for invoices
- **Estimate**: Estimates that can be converted to invoices
- **EstimateItem**: Line items for estimates
- **Payment**: Payment records with Stripe integration

## Available NPM Scripts

### Root
- `npm run dev` - Start both dev servers
- `npm run dev:server` - Start backend only
- `npm run dev:client` - Start frontend only
- `npm run build` - Build both projects for production
- `npm install-all` - Install dependencies for all workspaces

### Server
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Run compiled server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Client
- `npm run dev` - Start Vite dev server
- `npm run build` - Build with Vite
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Next Steps

1. **Database Setup**: Run `cd server && npx prisma migrate dev` to initialize the database
2. **Stripe Configuration**: Get your Stripe API keys from https://stripe.com
3. **Implement API Routes**: Build routes in `server/src/routes/` for invoices, estimates, and payments
4. **Build Frontend Pages**: Create React components in `client/src/` for the dashboard and forms
5. **Add Authentication**: Implement JWT-based auth with user signup/login
6. **Stripe Integration**: Connect Stripe payment functionality to the app

