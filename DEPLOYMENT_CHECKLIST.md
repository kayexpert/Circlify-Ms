# Vercel Deployment Checklist

Use this checklist to ensure your project is ready for deployment to Vercel.

## Pre-Deployment

### Code Preparation
- [ ] All code is committed and pushed to GitHub/GitLab/Bitbucket
- [ ] `.gitignore` includes `.env*`, `node_modules`, `.next`, `.vercel`
- [ ] No sensitive data in code (API keys, secrets, etc.)
- [ ] TypeScript builds without errors (`npm run build`)
- [ ] All dependencies are listed in `package.json`

### Configuration Files
- [ ] `vercel.json` is configured (✅ Created)
- [ ] `.vercelignore` is set up (✅ Created)
- [ ] `next.config.ts` is optimized for production
- [ ] `package.json` has correct Node.js version (>=18.0.0) ✅

## Vercel Setup

### Project Import
- [ ] Repository connected to Vercel
- [ ] Framework auto-detected as Next.js
- [ ] Build settings verified (should auto-detect from `package.json`)

### Environment Variables

#### Required Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep secret!)
- [ ] `NEXT_PUBLIC_APP_URL` - Your Vercel app URL (e.g., https://your-app.vercel.app)
- [ ] `NEXT_PUBLIC_SITE_URL` - Your Vercel app URL (same as above)

#### Optional Variables (Recommended)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN for error monitoring
- [ ] `SENTRY_ORG` - Sentry organization slug
- [ ] `SENTRY_PROJECT` - Sentry project slug
- [ ] `NEXT_PUBLIC_API_URL` - External API URL (if applicable)
- [ ] `WIGAL_WEBHOOK_SECRET` - Webhook secret for SMS service (if applicable)

#### Environment Variable Settings
- [ ] All variables set for Production environment
- [ ] All variables set for Preview environment
- [ ] All variables set for Development environment (if using)

## Supabase Configuration

### Authentication Settings
- [ ] Redirect URLs configured in Supabase:
  - `https://your-app.vercel.app/auth/callback`
  - `https://your-app-*.vercel.app/auth/callback` (for preview deployments)
- [ ] Site URL set to: `https://your-app.vercel.app`

### Database
- [ ] All migrations applied
- [ ] RLS policies are active
- [ ] Database is not paused

## First Deployment

- [ ] Initial deployment triggered
- [ ] Build completes successfully
- [ ] No build errors in Vercel logs
- [ ] Deployment URL is accessible

## Post-Deployment Verification

### Functionality Tests
- [ ] Homepage loads correctly
- [ ] Sign up page works
- [ ] Sign in page works
- [ ] Authentication redirects work
- [ ] Dashboard loads for authenticated users
- [ ] API routes respond correctly
- [ ] Database connections work
- [ ] File uploads work (if applicable)
- [ ] SMS messaging works (if configured)

### Performance Checks
- [ ] Page load times are acceptable
- [ ] No console errors in browser
- [ ] Vercel function logs show no errors
- [ ] API response times are reasonable

### Security Checks
- [ ] HTTPS is enforced (automatic on Vercel)
- [ ] Environment variables are not exposed in client-side code
- [ ] Authentication is working correctly
- [ ] Protected routes require authentication

## Optional Optimizations

- [ ] Custom domain configured (if applicable)
- [ ] Vercel Analytics enabled
- [ ] Sentry error monitoring working
- [ ] Performance monitoring set up
- [ ] CDN caching optimized

## Troubleshooting Resources

If you encounter issues:
1. Check Vercel deployment logs
2. Check Vercel function logs
3. Review browser console for client-side errors
4. Verify all environment variables are set
5. Check Supabase logs
6. Review `VERCEL_DEPLOYMENT.md` for detailed troubleshooting

## Quick Commands

```bash
# Test build locally
npm run build

# Deploy via CLI (optional)
vercel

# View deployment logs
vercel logs

# Check environment variables
vercel env ls
```

---

**Note**: This checklist should be completed before marking the deployment as production-ready.

