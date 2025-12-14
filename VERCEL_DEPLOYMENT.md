# Vercel Deployment Guide

This guide will help you deploy your Circlify Management System to Vercel without any issues.

## Prerequisites

- A GitHub account (or GitLab/Bitbucket)
- A Vercel account (sign up at https://vercel.com)
- Your Supabase project credentials
- Sentry account (optional, for error monitoring)

## Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Verify your `.gitignore` includes**:
   - `.env*` files (environment variables)
   - `node_modules/`
   - `.next/`
   - `.vercel/`

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js - no configuration needed
4. Click "Deploy"

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

## Step 3: Configure Environment Variables

**⚠️ CRITICAL: You must add these environment variables in Vercel before your first deployment succeeds.**

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add the following variables:

### Required Environment Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### Optional Environment Variables

```env
# External API (if using external API services)
NEXT_PUBLIC_API_URL=https://your-external-api.com/api/v1

# Sentry Error Monitoring (Recommended for production)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project

# Webhook Security (if using Wigal SMS webhooks)
WIGAL_WEBHOOK_SECRET=your_webhook_secret
```

### Where to Find Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### Where to Find Sentry Credentials

1. Go to your [Sentry Dashboard](https://sentry.io)
2. Select your project
3. Go to **Settings** → **Projects** → **Client Keys (DSN)**
4. Copy the DSN → `NEXT_PUBLIC_SENTRY_DSN`
5. For `SENTRY_ORG` and `SENTRY_PROJECT`, check your Sentry project settings

### Environment Variable Settings

- **Apply to**: Select "Production", "Preview", and "Development" for all variables
- **Save** all variables

## Step 4: Configure Supabase Auth Redirect URLs

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add your Vercel URLs to **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app-*.vercel.app/auth/callback` (for preview deployments)
4. Add your Vercel URL to **Site URL**:
   - `https://your-app.vercel.app`

## Step 5: Redeploy

After adding environment variables:

1. Go to **Deployments** tab in Vercel
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**

Or trigger a new deployment by pushing a commit:
```bash
git commit --allow-empty -m "Trigger Vercel deployment"
git push
```

## Step 6: Verify Deployment

1. Visit your deployment URL: `https://your-app.vercel.app`
2. Test authentication (sign in/sign up)
3. Verify all features work correctly
4. Check Vercel function logs for any errors

## Vercel Configuration

The project includes a `vercel.json` file with optimized settings:

- **Framework**: Next.js (auto-detected)
- **Build Command**: `npm run build`
- **Install Command**: `npm install`
- **Function Timeout**: 30 seconds for API routes
- **Region**: US East (iad1) - can be changed in vercel.json
- **Security Headers**: Configured for XSS protection, frame options, and content type

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Ensure all required environment variables are set in Vercel
- Check that variable names match exactly (case-sensitive)
- Redeploy after adding variables

**Error: Module not found**
- Run `npm install` locally to verify dependencies
- Check `package.json` for any missing dependencies
- Ensure Node.js version is compatible (18+) - specified in `package.json` engines

**Error: TypeScript errors**
- Run `npm run build` locally to catch errors
- Fix any TypeScript errors before deploying

**Error: Sentry build fails**
- If Sentry is optional, you can temporarily remove Sentry config from `next.config.ts`
- Or ensure `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are set

### Runtime Errors

**Error: Supabase connection failed**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase project is active and not paused
- Verify network connectivity

**Error: Authentication redirects not working**
- Ensure Supabase redirect URLs are configured (Step 4)
- Check `NEXT_PUBLIC_SITE_URL` matches your Vercel URL
- Verify middleware is working correctly

**Error: API routes returning 500**
- Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Review Vercel function logs in the dashboard
- Verify RLS policies in Supabase
- Check function timeout settings (default is 30 seconds)

**Error: Function timeout**
- Some API routes may need longer execution time
- Update `vercel.json` to increase `maxDuration` for specific routes
- Consider optimizing database queries

### Performance Issues

- Enable Vercel Analytics in project settings
- Check function execution time in Vercel dashboard
- Optimize database queries if needed
- Consider enabling Edge Runtime for API routes if appropriate
- Review Next.js Image optimization settings

## Vercel-Specific Features

### Automatic Deployments

- **Production**: Deploys from `main` or `master` branch
- **Preview**: Deploys from pull requests and other branches
- **Development**: Deploys from development branches (if configured)

### Custom Domain

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_SITE_URL` and Supabase redirect URLs

### Environment-Specific Variables

You can set different values for:
- **Production**: Live site
- **Preview**: Pull request previews
- **Development**: Development branches

### Function Logs

- View real-time logs in Vercel dashboard
- Filter by deployment, function, or time range
- Useful for debugging API route issues

## Post-Deployment Checklist

- [ ] All required environment variables configured
- [ ] Optional environment variables configured (Sentry, API URLs, etc.)
- [ ] Supabase redirect URLs updated
- [ ] Authentication working (sign in/sign up)
- [ ] Database connections successful
- [ ] API routes functioning
- [ ] File uploads working (if applicable)
- [ ] SMS messaging working (if configured)
- [ ] Custom domain configured (if applicable)
- [ ] Analytics enabled (optional)
- [ ] Error monitoring set up (Sentry - optional)
- [ ] Function logs reviewed for errors
- [ ] Performance metrics checked

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Check Vercel function logs
3. Check Supabase logs
4. Review browser console for client-side errors
5. Verify all environment variables are set correctly
6. Test locally with `npm run build` to catch build-time errors

