# TailorHub - Production-Ready Tailor Shop E-Commerce

A complete, full-stack e-commerce platform for custom tailoring services and ready-made clothing sales. Built with Next.js 16, TypeScript, Prisma, PostgreSQL, and NextAuth.

## Features

### 🛍️ Customer Features
- **User Management**: Secure registration, login, profile management
- **Measurement Profiles**: Save multiple custom measurements for reuse
- **Custom Stitching Orders**:
  - Select fabric type and upload fabric images
  - Choose from predefined stitching services
  - Get real-time price quotes
  - Track order status from pending to delivery
- **Ready-Made Products**:
  - Browse product catalog with filters
  - Shopping cart and checkout
  - Order history and tracking
- **Reviews & Ratings**: Rate tailors and leave detailed reviews

### 👗 Tailor Features
- **Order Management**: View assigned stitching orders with customer measurements
- **Order Processing**: Update status and upload completed garment images
- **Earnings Dashboard**: Track monthly earnings, completed orders, and performance metrics
- **Customer Reviews**: View and respond to customer feedback
- **Profile Management**: Showcase specializations and experience

### 🎛️ Admin Features
- **User Management**: Create, edit, and manage users across all roles
- **Tailor Management**: Approve tailors, manage profiles, view ratings
- **Product Management**: Full CRUD operations for ready-made products
- **Order Management**: View and manage all orders, assign tailors to stitching orders
- **Analytics Dashboard**: Revenue trends, order statistics, conversion rates
- **Review Moderation**: Approve or reject customer reviews
- **Stitching Rates**: Set prices per cloth type and service

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19.2** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first CSS
- **shadcn/ui** - Component library
- **Recharts** - Charts and analytics
- **NextAuth.js** - Authentication

### Backend
- **Next.js API Routes** - Serverless functions
- **Prisma ORM** - Database toolkit
- **PostgreSQL** - Relational database
- **NextAuth.js** - JWT-based authentication
- **bcrypt-ts** - Password hashing

### Development
- **TypeScript** - Type checking
- **ESLint** - Code linting
- **PostCSS** - CSS processing

## Database Schema

The application uses a comprehensive Prisma schema with 13 models:

- **User** - Core user data with role-based access
- **TailorProfile** - Extended tailor information
- **Address** - Customer delivery addresses
- **Measurement** - Custom measurement profiles
- **Product** - Ready-made clothing products
- **Order** - Ready-made product orders
- **OrderItem** - Products in orders
- **StitchingOrder** - Custom stitching orders
- **Assignment** - Tailor assignments to orders
- **Review** - Customer reviews of tailors
- **Payment** - Payment records

See `DATABASE.md` for complete schema details.

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install**
```bash
git clone <repository>
cd tailorhub
npm install
```

2. **Setup environment**
```bash
cp .env.example .env.local
```

Update `.env.local` with your database URL and NextAuth secret:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tailorhub"
NEXTAUTH_SECRET="generated-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secret:
```bash
openssl rand -hex 32
```

3. **Setup database**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed with demo data
npm run seed
```

4. **Run development server**
```bash
npm run dev
```

Visit http://localhost:3000

## Test Accounts

Use these credentials to explore different roles:

```
Admin:
  Email: admin@tailorhub.com
  Password: admin123

Tailor:
  Email: priya@tailorhub.com
  Password: tailor123

Customer:
  Email: rajesh@example.com
  Password: customer123
```

## Project Structure

```
├── app/
│   ├── (auth)/              # Authentication pages (login, signup)
│   ├── admin/               # Admin dashboard and management
│   ├── customer/            # Customer features (profile, orders, products)
│   ├── tailor/              # Tailor dashboard
│   ├── api/                 # API routes
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Global styles
├── components/
│   └── ui/                  # Reusable UI components (shadcn/ui)
├── lib/
│   ├── auth-utils.ts        # Authentication utilities
│   ├── db.ts                # Prisma client singleton
│   ├── file-upload.ts       # File upload utilities
│   ├── order-utils.ts       # Order status helpers
│   ├── stripe-utils.ts      # Stripe payment utilities
│   ├── validation.ts        # Form validation functions
│   └── utils.ts             # General utilities
├── hooks/
│   ├── use-auth.ts          # Authentication hook
│   ├── use-api.ts           # API fetching hook
│   ├── use-mobile.ts        # Mobile detection hook
│   └── use-toast.ts         # Toast notifications
├── prisma/
│   └── schema.prisma        # Database schema
├── scripts/
│   └── seed.ts              # Database seeding script
├── auth.config.ts           # NextAuth configuration
├── auth.ts                  # NextAuth setup
├── proxy.ts                 # Middleware configuration
└── package.json
```

## API Endpoints

### Authentication
```
POST   /api/auth/signup              Register new user
POST   /api/auth/login               Login user
GET    /api/auth/[...nextauth]       NextAuth endpoints
```

### Products
```
GET    /api/products                 List products
POST   /api/products                 Create product (admin)
```

### Orders
```
GET    /api/orders                   Get user orders
POST   /api/orders                   Create order
PATCH  /api/orders/[id]/status       Update order status
```

### Measurements
```
GET    /api/measurements             Get user measurements
POST   /api/measurements             Save measurement
```

### Stitching Orders
```
POST   /api/stitching-orders         Create custom order
PATCH  /api/stitching-orders/[id]/complete   Mark as complete
```

### Reviews
```
POST   /api/reviews                  Create review
PATCH  /api/reviews                  Approve review (admin)
```

## Styling

The app uses Tailwind CSS v4 with shadcn/ui components. Theme colors are configured in `app/globals.css` using CSS variables.

To customize colors, edit the `:root` and `.dark` selectors in `globals.css`.

## File Uploads

Currently, the app uses base64 encoding for image uploads (suitable for demo/testing).

For production, implement one of these services:
- **Vercel Blob** - Simple integration for Vercel deployments
- **AWS S3** - Scalable cloud storage
- **Cloudinary** - Image optimization and CDN

Update `lib/file-upload.ts` with your chosen service.

## Payment Integration

### Stripe Setup (Optional)
1. Sign up at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe dashboard
3. Add Stripe integration in Vercel dashboard
4. Update environment variables:
   ```env
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   ```
5. Implement payment logic in `app/api/stripe/checkout/route.ts`

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repo in [Vercel Dashboard](https://vercel.com)
3. Add environment variables
4. Deploy

```bash
vercel
```

### Database Migrations on Deploy

Prisma migrations run automatically during build:
```bash
npx prisma migrate deploy
```

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Seed database
npm run seed

# Run migrations
npm run migrate

# Lint code
npm run lint
```

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT-based sessions
- ✅ Role-based access control (RBAC)
- ✅ Middleware route protection
- ✅ Environment variable management
- ✅ Form validation and sanitization

## Performance Optimizations

- ✅ Server components where possible
- ✅ Image optimization with Next.js Image
- ✅ Dynamic imports for code splitting
- ✅ Database query optimization with Prisma
- ✅ Caching strategies with Next.js

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

MIT License - feel free to use this project

## Support

For issues and questions, please open an issue on GitHub or contact the development team.

---

Built with ❤️ by the TailorHub Team
