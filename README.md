# FieldPay - Invoice & Estimate Management Web App

A full-stack web application for managing invoices and estimates with integrated Stripe Connect API payment handling.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Vite
- **Database**: SQLite with Prisma ORM
- **Payment**: Stripe Connect API with webhook support
- **Authentication**: JWT-based

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd FieldPay
```

2. Install all dependencies
```bash
npm run install-all
```

3. Set up environment variables
```bash
# Server
cp server/.env.example server/.env

# Client
cp client/.env.example client/.env
```

4. Configure your environment variables with actual values

5. Set up the database (Prisma)
```bash
cd server
npx prisma migrate dev
cd ..
```

## Development

Start both backend and frontend development servers:

```bash
npm run dev
```

This runs:
- Backend server on `http://localhost:5000`
- Frontend application on `http://localhost:5173`

### Backend Only
```bash
npm run dev:server
```

### Frontend Only
```bash
npm run dev:client
```

## Building for Production

```bash
npm run build
```

This builds both server and client for production.

## Project Structure

```
FieldPay/
├── server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   └── middleware/
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── package.json
└── README.md
```

## Features

- Invoice management (create, edit, delete, view)
- Estimate management (create, convert to invoice)
- Stripe Connect payment processing
- Webhook handling for payment events
- User authentication and authorization
- Dashboard with analytics

## API Endpoints

### Health Check
- `GET /api/health` - Check API status

More endpoints to be implemented based on features.

## Environment Variables

See `.env.example` files in the `server/` and `client/` directories for required environment variables.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT
