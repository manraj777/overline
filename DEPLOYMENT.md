# Overline Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   User Web      │     │   Admin Web     │
│   (Vercel)      │     │   (Vercel)      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Backend API         │
         │   (Railway/Render)    │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   PostgreSQL    │     │     Redis       │
│   (Neon/Supabase)│    │   (Upstash)     │
└─────────────────┘     └─────────────────┘
```

## Step 1: Database Setup (Neon PostgreSQL - Free Tier)

1. Go to [neon.tech](https://neon.tech) and create account
2. Create a new project "overline-prod"
3. Copy the connection string (looks like):
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

## Step 2: Redis Setup (Upstash - Free Tier)

1. Go to [upstash.com](https://upstash.com) and create account
2. Create a new Redis database
3. Copy the connection details:
   - Host: `xxx.upstash.io`
   - Port: `6379`
   - Password: `your-password`

## Step 3: Deploy Backend (Railway)

### Option A: Railway (Recommended)

1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub
3. Select your repository
4. Set root directory to `apps/backend`
5. Add environment variables:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-password
JWT_SECRET=generate-a-strong-secret-min-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
CORS_ORIGIN=https://app.overline.app,https://admin.overline.app
BCRYPT_SALT_ROUNDS=12
```

6. Deploy and note the URL (e.g., `https://overline-backend.up.railway.app`)

### Option B: Render

1. Go to [render.com](https://render.com)
2. New → Web Service → Connect GitHub
3. Settings:
   - Root Directory: `apps/backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`

## Step 4: Deploy Frontend (Vercel)

### User Web App

1. Go to [vercel.com](https://vercel.com)
2. Import Git Repository
3. Configure:
   - Framework: Next.js
   - Root Directory: `apps/user-web`
4. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app/api/v1
   NEXT_PUBLIC_APP_NAME=Overline
   ```
5. Deploy → Get URL (e.g., `https://overline-user.vercel.app`)

### Admin Web App

1. Create another Vercel project
2. Same repository, different root:
   - Root Directory: `apps/admin-web`
3. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app/api/v1
   NEXT_PUBLIC_APP_NAME=Overline Admin
   ```
4. Deploy → Get URL (e.g., `https://overline-admin.vercel.app`)

## Step 5: Run Database Migrations (Production)

From your local machine:

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# Run migrations
cd apps/backend
npx prisma migrate deploy

# Seed initial data (optional - for demo)
npx prisma db seed
```

## Step 6: Custom Domain (Optional)

### Vercel
1. Project Settings → Domains
2. Add your domain (e.g., `app.overline.app`)
3. Follow DNS instructions

### Railway
1. Settings → Domains
2. Add custom domain (e.g., `api.overline.app`)
3. Configure DNS CNAME record

## Environment Variables Summary

### Backend (Railway/Render)
| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |
| `REDIS_PASSWORD` | Redis password |
| `JWT_SECRET` | Strong secret for JWT signing |
| `JWT_ACCESS_EXPIRATION` | `15m` |
| `JWT_REFRESH_EXPIRATION` | `7d` |
| `CORS_ORIGIN` | Comma-separated frontend URLs |
| `BCRYPT_SALT_ROUNDS` | `12` |

### Frontend (Vercel)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_APP_NAME` | App name |

## Post-Deployment Checklist

- [ ] Backend health check: `curl https://api.yourdomain.com/api/v1/health`
- [ ] Database migrations applied
- [ ] Frontend loads without CORS errors
- [ ] Login/signup works
- [ ] Booking flow works
- [ ] Admin portal accessible
- [ ] Custom domains configured (optional)

## Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| **Neon** | 0.5 GB storage, 3 GB transfer/month |
| **Upstash** | 10,000 commands/day |
| **Railway** | $5 credit/month |
| **Vercel** | 100 GB bandwidth/month |
| **Render** | 750 hours/month |

## Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGIN` includes your frontend URLs
- Check for trailing slashes in URLs

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check `?sslmode=require` for cloud DBs

### JWT Errors
- Ensure `JWT_SECRET` is same across deployments
- Check token expiration settings
