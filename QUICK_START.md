# TailorHub - Quick Start Guide

## Prerequisites
- Node.js 18+
- npm/yarn
- PostgreSQL database (or use a cloud provider like Neon, Supabase)

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

This will install all packages including:
- `next-auth` for authentication
- `@prisma/client` for database ORM
- `bcrypt-ts` for password hashing

### 2. Generate Prisma Client
After installing dependencies, you MUST generate the Prisma client:
```bash
npx prisma generate
```

This creates the `node_modules/.prisma/client` directory that your app needs.

### 3. Configure Environment Variables
Create `.env.local` in the project root:
```bash
cp .env.example .env.local
```

Edit `.env.local` and set your database URL:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/tailorhub"
NEXTAUTH_SECRET="generate-with: openssl rand -hex 32"
NEXTAUTH_URL="http://localhost:3000"
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -hex 32
# Output: abc123def456... (copy this value)
```

### 4. Create Database and Run Migrations
```bash
# Create tables in your database
npx prisma migrate deploy

# Or for development with database creation:
npx prisma migrate dev --name init
```

### 5. Seed Test Data (Optional)
```bash
npm run seed
```

This creates test accounts:
- Admin: admin@tailorhub.com / admin123
- Tailor: priya@tailorhub.com / tailor123
- Customer: rajesh@example.com / customer123

### 6. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## Database Setup Options

### Option A: Local PostgreSQL
```bash
# Install PostgreSQL locally
# Create a database
createdb tailorhub

# Set DATABASE_URL to:
DATABASE_URL="postgresql://user:password@localhost:5432/tailorhub"
```

### Option B: Cloud Database (Recommended)

**Neon (PostgreSQL):**
1. Sign up at https://neon.tech
2. Create a project and copy the connection string
3. Set `DATABASE_URL` to your Neon URL

**Supabase (PostgreSQL):**
1. Sign up at https://supabase.com
2. Create a project
3. Copy the PostgreSQL connection string
4. Set `DATABASE_URL` in .env.local

**PlanetScale (MySQL):**
1. Sign up at https://planetscale.com
2. Create a database
3. Copy the connection string
4. Update `prisma/schema.prisma` to use `mysql` instead of `postgresql`

## Troubleshooting

### Error: "Failed to load @prisma/client"
**Solution:** Run `npx prisma generate`

### Error: "Can't reach database server"
**Solution:** Check your DATABASE_URL and ensure the database server is running

### Error: "Schema validation failed"
**Solution:** Run migrations: `npx prisma migrate deploy`

### Error: "NextAuth session not found"
**Solution:** 
1. Generate NEXTAUTH_SECRET: `openssl rand -hex 32`
2. Set it in .env.local
3. Restart dev server

## Available Commands

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm start            # Start production server
npm run seed         # Seed database with test data
npm run migrate      # Run database migrations
npm run lint         # Lint code
```

## Project Structure

```
tailorhub/
├── app/              # Next.js app directory
│   ├── (auth)/       # Auth pages
│   ├── admin/        # Admin dashboard
│   ├── customer/     # Customer pages
│   ├── tailor/       # Tailor dashboard
│   └── api/          # API routes
├── components/       # React components
├── lib/              # Utilities and helpers
├── hooks/            # Custom React hooks
├── prisma/           # Database schema
├── scripts/          # Seed and migration scripts
├── auth.config.ts    # NextAuth config
├── auth.ts           # NextAuth setup
└── proxy.ts          # Middleware
```

## Next Steps

1. Setup your database
2. Run migrations and seed data
3. Start the dev server
4. Login with test accounts
5. Explore each role (Admin, Tailor, Customer)
6. Deploy to Vercel when ready

## Deployment

### Deploy to Vercel
1. Push code to GitHub
2. Connect repo in Vercel dashboard
3. Add environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your production URL)
4. Deploy!

Vercel automatically runs migrations on deploy if you configure it in `vercel.json`.

## Support

- Check README.md for full documentation
- Check SETUP.md for detailed setup
- Check DATABASE.md for schema information

Happy coding! 🚀
