# TailorHub - Setup Guide

## Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL database
- (Optional) Vercel account for deployment

## Local Development Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd tailorhub
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env.local` and update values:
```bash
cp .env.example .env.local
```

Update the following in `.env.local`:
- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -hex 32`
- `NEXTAUTH_URL`: Keep as `http://localhost:3000` for development

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed the database
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## Test Accounts

### Admin
- Email: `admin@tailorhub.com`
- Password: `admin123`

### Tailor
- Email: `priya@tailorhub.com`
- Password: `tailor123`

### Customer
- Email: `rajesh@example.com`
- Password: `customer123`

## Features

### Customer Features
- User registration and authentication
- Profile management and address book
- Save multiple measurement profiles
- Place custom stitching orders
- Browse and purchase ready-made products
- Shopping cart and checkout
- Order tracking and history
- Rate and review tailors

### Tailor Features
- Accept and manage assigned orders
- View customer measurements
- Update order status (Assigned → Stitching → Completed)
- Upload completed garment images
- Track earnings and performance metrics
- View customer reviews

### Admin Features
- User and tailor management
- Product CRUD operations
- Order management and analytics
- Review moderation
- Stitching rate configuration
- Revenue and performance dashboards

## File Uploads

The application currently uses base64 encoding for image uploads (demo mode).

For production, integrate with:
- **Vercel Blob** for simple file storage
- **AWS S3** for scalable storage
- **Cloudinary** for image optimization

Update `lib/file-upload.ts` with your chosen service.

## Payment Integration

### Stripe Setup (Optional)
1. Sign up at stripe.com and get API keys
2. In Vercel dashboard, add Stripe integration
3. Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Uncomment Stripe code in `app/api/stripe/checkout/route.ts`

## Deployment

### Deploy to Vercel
1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables
4. Deploy

```bash
# Or deploy via CLI
vercel
```

## Database Migrations

Create new migration:
```bash
npx prisma migrate dev --name migration_name
```

Deploy migrations to production:
```bash
npx prisma migrate deploy
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/session` - Get current session

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product (admin)

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create order
- `PATCH /api/orders/[id]/status` - Update status (admin/tailor)

### Measurements
- `GET /api/measurements` - Get user measurements
- `POST /api/measurements` - Save measurement

### Stitching Orders
- `POST /api/stitching-orders` - Create custom order
- `PATCH /api/stitching-orders/[id]/complete` - Mark complete (tailor)

### Reviews
- `POST /api/reviews` - Create review
- `PATCH /api/reviews` - Approve review (admin)

## Support

For issues and questions, please open an issue on GitHub.
