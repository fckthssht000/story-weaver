# Cloudflare Pages Setup Guide

This guide explains how to deploy your TanStack Start application to Cloudflare Pages with full SSR and PWA support.

## Prerequisites

- Node.js 22+ (required by Nitro)
- Cloudflare account (free tier works)
- Wrangler CLI installed globally or via npx
- Git repository (GitHub, GitLab, or Bitbucket)

## Project Configuration

### 1. Build Configuration

Your project is already configured for Cloudflare Pages deployment:

- **Build Output**: `.output/public` (static assets)
- **Server Entry**: `.output/server/index.mjs` (Nitro server)
- **Preset**: `cloudflare-module` (configured via `@lovable.dev/vite-tanstack-config`)

### 2. Wrangler Configuration

The `wrangler.toml` file configures Cloudflare Workers deployment:

```toml
name = "buklat"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[build]
command = "npm run build"
cwd = "."

[build.upload]
format = "modules"
main = ".output/server/index.mjs"

[assets]
directory = ".output/public"
binding = "ASSETS"
```

## Deployment Methods

### Option 1: Direct Deployment via Wrangler CLI

#### Local Preview
```bash
npm run build
npm run preview
```
This starts a local Cloudflare Pages development server at `http://localhost:8788`

#### Deploy to Cloudflare Pages
```bash
npm run build
npm run deploy
```

#### Deploy to Production
```bash
npm run build
npm run deploy:prod
```

### Option 2: Git Integration (Recommended for CI/CD)

#### Step 1: Connect Your Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click **Create application** → **Pages** → **Connect to Git**
4. Select your Git provider and repository

#### Step 2: Configure Build Settings

In the Cloudflare Pages setup:

- **Project name**: `buklat` (or your preferred name)
- **Production branch**: `main` (or your default branch)
- **Build command**: `npm run build`
- **Build output directory**: `.output/public`
- **Root directory**: `/` (leave empty)

#### Step 3: Environment Variables

Add these environment variables in Cloudflare Pages settings:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NODE_VERSION` | `22` | All |
| `SUPABASE_URL` | Your Supabase URL | Production |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | Production |

#### Step 4: Deploy

Push to your connected branch, and Cloudflare will automatically:
1. Run `npm install`
2. Run `npm run build`
3. Deploy the `.output/public` directory

## Service Worker Configuration

Your PWA is configured to work with Cloudflare Pages:

- **Service Worker**: `/sw.js` (served from `.output/public/sw.js`)
- **Manifest**: `/manifest.webmanifest`
- **Registration**: Auto-registered via VitePWA plugin

The service worker caches:
- HTML navigations (NetworkFirst, 5s timeout)
- Static assets (CacheFirst, 30 days)

## Environment-Specific Configuration

### Development
```bash
npm run dev
```
Uses Vite dev server with HMR at `http://localhost:5173`

### Production Build
```bash
npm run build
```
Creates optimized build in `.output/` directory

### Local Production Preview
```bash
npm run build
npm run preview
```
Simulates Cloudflare Pages locally using Wrangler

## Troubleshooting

### Service Worker Not Registering

1. Check that `sw.js` exists in `.output/public/`
2. Verify the service worker is served over HTTPS
3. Check browser console for registration errors
4. Clear site data and re-register

### Build Errors

1. Ensure Node.js 22+ is installed
2. Run `npm install` to update dependencies
3. Check that `@lovable.dev/vite-tanstack-config` is version 2.9.1
4. Verify Nitro version is 3.0.260603-beta

### Deployment Failures

1. Check Wrangler authentication: `npx wrangler whoami`
2. Verify build output directory is `.output/public`
3. Check Cloudflare Pages logs in the dashboard
4. Ensure environment variables are set correctly

### Offline Functionality Not Working

1. Verify service worker is registered (check Application tab in DevTools)
2. Check that assets are cached (Cache Storage in DevTools)
3. Ensure `navigateFallback` is configured in VitePWA settings
4. Test offline mode using Chrome DevTools Network tab

## CI/CD Configuration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy .output/public --project-name=buklat
```

Add `CLOUDFLARE_API_TOKEN` to your GitHub repository secrets.

## Performance Optimization

### Build Optimizations

Your build is already optimized with:
- Code splitting via TanStack Router
- Tree shaking via Rollup
- Asset hashing for cache busting
- PWA precaching of static assets

### Runtime Optimizations

- Edge caching via Cloudflare CDN
- Service worker for offline access
- Network-first strategy for HTML
- Cache-first strategy for static assets

## Monitoring

### Cloudflare Analytics

Access analytics in the Cloudflare Dashboard:
- Page views
- Unique visitors
- Bandwidth usage
- Edge cache hit rate

### Service Worker Debugging

Use Chrome DevTools:
- **Application tab**: Service worker status
- **Cache Storage**: Cached assets
- **Network tab**: Offline testing

## Security Considerations

### Headers

Your application includes security headers via VitePWA:
- `Cache-Control: public, max-age=0, must-revalidate`
- `Service-Worker-Allowed: /`

### Environment Variables

Never commit secrets to Git:
- Use Cloudflare Pages environment variables
- Use `.env` for local development (gitignored)
- Rotate keys if compromised

## Support

- **TanStack Start Docs**: https://tanstack.com/start/latest
- **Nitro Docs**: https://nitro.unjs.io
- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages
- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler

## Summary

Your application is now configured for Cloudflare Pages deployment with:
- ✅ Full SSR support via Nitro
- ✅ PWA with service worker
- ✅ Edge caching via Cloudflare CDN
- ✅ Offline functionality
- ✅ Automatic deployments via Git integration
