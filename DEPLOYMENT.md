# Deployment Guide

## Deploy to Vercel (Recommended)

### Prerequisites
- GitHub repository with your code
- PostgreSQL database (Neon, Supabase, or PlanetScale)
- Vercel account (free)

### Step 1: Create Database
Choose one:

**Option 1: Neon (PostgreSQL) - Recommended**
1. Visit https://console.neon.tech
2. Sign up with GitHub
3. Create a new project
4. Copy the connection string (includes password)
5. Save for later

**Option 2: Supabase (PostgreSQL)**
1. Visit https://supabase.com
2. Create new project
3. Go to Settings > Database
4. Copy the PostgreSQL connection URI
5. Save for later

**Option 3: PlanetScale (MySQL)**
1. Visit https://planetscale.com
2. Create a database
3. Create a password
4. Copy the connection string
5. Update `prisma/schema.prisma` provider to "mysql"

### Step 2: Push Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tailorhub.git
git push -u origin main
```

### Step 3: Connect to Vercel
1. Visit https://vercel.com/dashboard
2. Click "Add New..." > "Project"
3. Select your GitHub repository
4. Click "Import"

### Step 4: Set Environment Variables
In Vercel dashboard project settings:

Add these variables:

**Database URL**
- Name: `DATABASE_URL`
- Value: Your PostgreSQL connection string from Step 1

**NextAuth Secret**
- Name: `NEXTAUTH_SECRET`
- Value: Run this locally: `openssl rand -hex 32`

**NextAuth URL**
- Name: `NEXTAUTH_URL`
- Value: `https://your-project.vercel.app`

### Step 5: Deploy
1. Click "Deploy"
2. Vercel automatically:
   - Runs `npm install`
   - Runs `npx prisma generate`
   - Runs `npx prisma migrate deploy`
   - Builds your app
   - Deploys to production

Wait for the build to complete (2-5 minutes).

### Step 6: Seed Database (First Time Only)
After deployment, seed your production database:

```bash
# Locally, with your production DATABASE_URL
DATABASE_URL="your-production-url" npm run seed
```

Or use Prisma Studio:
```bash
DATABASE_URL="your-production-url" npx prisma studio
```

Visit your deployed app at the URL shown in Vercel dashboard!

## Deploy to Other Platforms

### AWS/EC2
1. Setup Node.js on server
2. Install PostgreSQL
3. Clone repository
4. Set environment variables
5. Run migrations: `npx prisma migrate deploy`
6. Start server: `npm start`
7. Use PM2 for process management

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npx prisma generate
RUN npx prisma migrate deploy
RUN npm run build
CMD ["npm", "start"]
```

### Railway
1. Connect GitHub repository
2. Select Node.js
3. Add PostgreSQL plugin
4. Railway automatically sets DATABASE_URL
5. Add NEXTAUTH_SECRET and NEXTAUTH_URL
6. Deploy!

### Render
1. Connect GitHub
2. New Web Service
3. Set build command: `npm install && npx prisma generate && npm run build`
4. Set start command: `npm start`
5. Add environment variables
6. Deploy!

## Monitoring & Maintenance

### Database Backups
- **Neon**: Automatic daily backups
- **Supabase**: Automatic daily backups + manual backups
- **PlanetScale**: Automatic with point-in-time recovery

### Logs
View deployment logs in Vercel dashboard:
1. Project > Deployments
2. Click deployment
3. View "Build Logs" or "Runtime Logs"

### Database Issues
If migrations fail:
1. Check DATABASE_URL is correct
2. Verify database server is running
3. Check for schema conflicts
4. Use Prisma Studio: `npx prisma studio`

### Scaling
As your app grows:
1. Upgrade database (Neon/Supabase tiers)
2. Enable caching
3. Optimize queries
4. Monitor performance

## Updates & Maintenance

### Update Dependencies
```bash
npm update
npx prisma generate
git commit -am "Update dependencies"
git push
# Vercel automatically deploys
```

### Database Schema Changes
```bash
# Locally, make schema changes in prisma/schema.prisma
npx prisma migrate dev --name description_of_changes
git add .
git commit -m "Update database schema"
git push
# Vercel automatically runs migration on deploy
```

## Rollback

If deployment fails:
1. Vercel keeps previous deployments
2. Dashboard > Deployments > click previous version > "Redeploy"

For database issues:
- Neon/Supabase have restore points
- Contact their support for recovery

## Production Checklist

- [ ] Set strong NEXTAUTH_SECRET
- [ ] Update NEXTAUTH_URL to production domain
- [ ] Test authentication flows
- [ ] Test database operations
- [ ] Set up monitoring
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Setup email notifications for errors
- [ ] Create backups strategy
- [ ] Document deployment process
- [ ] Setup CI/CD pipeline (optional)

## Questions?

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Prisma Docs: https://www.prisma.io/docs
- NextAuth.js Docs: https://next-auth.js.org
