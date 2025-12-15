# GitHub Actions Deployment Workflows

This directory contains automated deployment workflows for the tofu-apps monorepo.

## Workflows

### 1. Deploy Wishlist (`deploy-wishlist.yml`)
Automatically deploys the wishlist application when changes are pushed to the `main` branch.

**Triggers:**
- Push to `main` branch with changes in:
  - `apps/wishlist-web/**`
  - `apps/backend/**`
- Manual trigger via `workflow_dispatch`

### 2. Deploy Calendar (`deploy-calendar.yml`)
Automatically deploys the calendar application when changes are pushed to the `main` branch.

**Triggers:**
- Push to `main` branch with changes in:
  - `apps/calendar-web/**`
  - `apps/backend/**`
- Manual trigger via `workflow_dispatch`

## Required Secrets

To use these workflows, you need to configure the following secrets in your GitHub repository settings:

1. **VPS_SSH_KEY** - Private SSH key for authenticating to the VPS
   - Generate with: `ssh-keygen -t ed25519 -C "github-actions@deployment"`
   - Add the public key to `/home/deploy/.ssh/authorized_keys` on the VPS

2. **VPS_HOST** - VPS IP address or hostname
   - Example: `100.76.160.26`

3. **VPS_USER** - SSH username for deployment
   - Example: `deploy`

### How to Add Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of the three secrets above

## Deployment Process

Each workflow performs the following steps:

1. **Checkout** - Clones the repository code
2. **Setup Node.js** - Installs Node.js 20 with npm caching
3. **Install dependencies** - Runs `npm ci` for reproducible builds
4. **Build frontend** - Builds the React app with Vite
5. **Build backend** - Compiles TypeScript backend code
6. **Copy frontend** - Moves built frontend to backend public folder
7. **Setup SSH** - Configures SSH authentication for VPS
8. **Deploy frontend** - Syncs frontend files to VPS via rsync
9. **Deploy backend** - Syncs backend dist files to VPS via rsync
10. **Restart PM2** - Restarts the backend process on VPS
11. **Cleanup** - Removes temporary SSH keys

## Post-Deployment

**IMPORTANT:** After any deployment, you must manually purge the Cloudflare cache:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. Navigate to **Caching** → **Configuration**
4. Click **Purge Everything**

Or purge specific URLs:
- Wishlist: `https://wishlist.billyeatstofu.com/` and `https://wishlist.billyeatstofu.com/assets/*`
- Calendar: `https://cal.billyeatstofu.com/` and `https://cal.billyeatstofu.com/assets/*`

## Manual Deployment

You can also manually trigger deployments:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select the workflow (Deploy Wishlist or Deploy Calendar)
4. Click **Run workflow**
5. Select the branch (usually `main`)
6. Click **Run workflow**

## Local Deployment

For local deployments, use the shell script instead:

```bash
./scripts/deploy.sh
```

This is useful for:
- Testing the deployment process
- Quick fixes that bypass CI/CD
- When GitHub Actions is unavailable

## Troubleshooting

### SSH Connection Failed
- Verify `VPS_SSH_KEY` is correct and has proper line breaks
- Check that the public key is in `/home/deploy/.ssh/authorized_keys`
- Ensure SSH is enabled on the VPS

### Build Failures
- Check that all dependencies are in `package.json`
- Verify TypeScript compiles locally first
- Review build logs in Actions tab

### PM2 Restart Failed
- SSH into VPS and check PM2 status: `pm2 status`
- View logs: `pm2 logs unified-backend --lines 50`
- Restart manually: `pm2 restart unified-backend`

### Old Version Still Showing
- Purge Cloudflare cache (see Post-Deployment section)
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Verify files deployed: `ssh deploy@VPS_HOST 'ls -la /opt/tofu-apps/apps/backend/public/wishlist/'`

## Monitoring

After deployment, monitor:

1. **GitHub Actions logs** - Check for any warnings or errors
2. **PM2 logs** - `ssh deploy@VPS 'pm2 logs unified-backend --lines 20'`
3. **Application** - Test in incognito browser window
4. **API calls** - Check DevTools Network tab for correct endpoints

## Security Notes

- SSH private keys are never logged or exposed
- Keys are stored securely in GitHub Secrets
- Temporary keys are cleaned up after deployment
- Use a dedicated deployment SSH key (not your personal key)
- Consider IP restrictions on VPS firewall for added security
