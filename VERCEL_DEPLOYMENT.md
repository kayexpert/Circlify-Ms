# Vercel Deployment Guide

This guide will help you deploy your Circlify Management System to Vercel without any issues.

## Prerequisites

- A GitHub account (or GitLab/Bitbucket)
- A Vercel account (sign up at https://vercel.com)
- Your Supabase project credentials

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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### Where to Find Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### Optional Environment Variables

```env
NEXT_PUBLIC_API_URL=https://your-external-api.com/api/v1
```

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

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Ensure all required environment variables are set in Vercel
- Check that variable names match exactly (case-sensitive)
- Redeploy after adding variables

**Error: Module not found**
- Run `npm install` locally to verify dependencies
- Check `package.json` for any missing dependencies
- Ensure Node.js version is compatible (18+)

**Error: TypeScript errors**
- Run `npm run build` locally to catch errors
- Fix any TypeScript errors before deploying

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

### Performance Issues

- Enable Vercel Analytics in project settings
- Check function execution time in Vercel dashboard
- Optimize database queries if needed
- Consider enabling Edge Runtime for API routes if appropriate

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

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Supabase redirect URLs updated
- [ ] Authentication working
- [ ] Database connections successful
- [ ] API routes functioning
- [ ] File uploads working (if applicable)
- [ ] SMS messaging working (if configured)
- [ ] Custom domain configured (if applicable)
- [ ] Analytics enabled (optional)
- [ ] Error monitoring set up (optional)

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Review browser console for client-side errors
4. Verify all environment variables are set correctly

