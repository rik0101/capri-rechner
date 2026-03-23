# Deployment Guide

## Build Configuration

This project is configured to work with popular deployment platforms.

### Requirements
- Node.js version: 22.x
- Package manager: npm

### Build Commands

**Netlify:**
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Node version: 22

**Vercel:**
- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Node version: 22

**Manual build:**
```bash
./build.sh
```

### Troubleshooting

If you encounter build errors:

1. **Clear the build cache** on your deployment platform
   - Netlify: "Clear cache and deploy site"
   - Vercel: Click "Redeploy" button

2. **Ensure correct Node version** (22.x)
   - The `.nvmrc` and `.node-version` files specify this

3. **Dependencies installation**
   - Make sure `npm ci` runs before `npm run build`
   - Check that `package-lock.json` is committed to git

### Configuration Files

- `netlify.toml` - Netlify configuration
- `vercel.json` - Vercel configuration
- `.nvmrc` - Node version specification
- `.node-version` - Alternative Node version specification
- `build.sh` - Build script for manual deployment
