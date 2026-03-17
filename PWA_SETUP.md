# PWA Setup Documentation

## Overview
The Finance Dashboard is now configured as a Progressive Web App (PWA), making it installable on devices and providing offline capabilities.

## What's Been Set Up

### 1. Icons and Favicons
All required icons have been generated from `public/money.png`:

**Favicons:**
- `favicon.ico` - Multi-size favicon (16x16, 32x32, 48x48)
- `favicon-16x16.png` - Small favicon
- `favicon-32x32.png` - Standard favicon
- `apple-touch-icon.png` - iOS home screen icon (180x180)

**PWA Icons (in public/icons/):**
- 72x72, 96x96, 120x120, 128x128, 144x144 - Various Android sizes
- 152x152, 167x167, 180x180 - iOS sizes
- 192x192, 256x256, 384x384, 512x512 - Android & maskable icons

### 2. Web App Manifest (`public/manifest.json`)
Configured with:
- App name: "Finance Dashboard"
- Short name: "Finance"
- Theme color: #f97316 (orange)
- Display mode: standalone
- All icon references for different screen sizes
- Categories: finance, productivity, utilities

### 3. Service Worker (`public/sw.js`)
Features:
- **Offline Support**: Caches essential resources for offline access
- **Cache-First Strategy**: Serves cached content when available
- **Network Fallback**: Falls back to network for new requests
- **Auto-Cleanup**: Removes old caches on activation
- **Error Handling**: Shows meaningful offline messages

### 4. Metadata & SEO (`app/layout.tsx`)
Enhanced with:
- Favicon references (16x16, 32x32)
- Apple touch icon (180x180)
- Web app manifest link
- Apple Web App capable settings
- Keywords and descriptions for SEO
- Format detection disabled (emails, phones, addresses)

### 5. Service Worker Registration (`app/register-sw.tsx`)
- Client-side component that registers the service worker
- Automatically runs on app load
- Integrated into root layout

## Testing Your PWA

### Desktop (Chrome/Edge)
1. Run `npm run dev` or `npm run build && npm start`
2. Open Chrome DevTools (F12)
3. Go to "Application" tab
4. Check "Manifest" - should show all icons and metadata
5. Check "Service Workers" - should show registered worker
6. Click the install icon in the address bar (⊕ Install)

### Mobile (iOS Safari)
1. Visit your deployed site on iPhone/iPad
2. Tap the Share button
3. Tap "Add to Home Screen"
4. The money icon should appear
5. Launch from home screen - runs in standalone mode

### Mobile (Android Chrome)
1. Visit your deployed site on Android
2. Tap the three dots menu
3. Tap "Add to Home Screen" or "Install App"
4. The PWA will install with the money icon
5. Launch from app drawer

## Verification Checklist

- [ ] Icons display correctly in browser tab
- [ ] Manifest is valid (check in DevTools → Application → Manifest)
- [ ] Service worker registers successfully (check console)
- [ ] App is installable (install prompt appears)
- [ ] Installed app opens in standalone mode (no browser UI)
- [ ] App works offline (disconnect network and test)
- [ ] App icon appears correctly when installed

## Lighthouse PWA Audit

Run a Lighthouse audit to verify PWA compliance:
1. Open Chrome DevTools
2. Go to "Lighthouse" tab
3. Select "Progressive Web App"
4. Click "Generate report"
5. Should score 100% or near 100%

## Deployment Notes

### Vercel/Netlify
No special configuration needed - static files in `public/` are automatically served.

### Custom Server
Ensure your server:
- Serves `manifest.json` with `Content-Type: application/manifest+json`
- Serves `sw.js` with `Content-Type: application/javascript`
- Allows service worker scope at root (`/`)
- Serves files from `public/` directory

## Customization

### Change Theme Color
Edit `public/manifest.json`:
```json
"theme_color": "#your-color-here",
"background_color": "#your-color-here"
```

And update `app/layout.tsx` metadata if needed.

### Update Icons
If you want to change the icon:
1. Replace `public/money.png` with your new icon
2. Re-run the icon generation script (see below)

### Regenerate Icons
```bash
cd finance-dashboard
# Using ImageMagick
magick public/your-icon.png -resize 16x16 public/favicon-16x16.png
magick public/your-icon.png -resize 32x32 public/favicon-32x32.png
magick public/your-icon.png -resize 180x180 public/apple-touch-icon.png
# ... (see generate-icons.js for full list)
```

Or use an online tool:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure you're running on `localhost` or `https://`
- Check that `sw.js` is accessible at `/sw.js`

### Install Prompt Not Showing
- PWA must be served over HTTPS (or localhost)
- Manifest must be valid
- Service worker must be registered
- User hasn't previously dismissed the prompt

### Icons Not Appearing
- Clear browser cache
- Check icon paths in `manifest.json`
- Verify icons exist in `public/icons/` directory
- Check browser console for 404 errors

### Offline Mode Not Working
- Service worker must be activated (check DevTools)
- Initial visit requires network (caches on first load)
- Check service worker cache in DevTools → Application → Cache Storage

## Resources
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [Next.js PWA Setup](https://nextjs.org/docs/app/building-your-application/configuring/progressive-web-apps)
