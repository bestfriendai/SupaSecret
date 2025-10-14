# Toxic Confessions Website

This folder contains the complete website for Toxic Confessions - an elegant, standalone website that can be uploaded directly to any web server.

## 📁 Contents

- `index.html` - Main landing page
- `privacy.html` - Privacy Policy page
- `terms.html` - Terms of Service page
- `help.html` - Help & Support page
- `styles.css` - Complete styling for all pages
- `logo.png` - App logo (copied from assets)
- `icon.png` - App icon (copied from assets)
- `README.md` - This file

## 🚀 Deployment

Simply upload all files in this folder to your web server. No build process or dependencies required!

### Quick Deploy Options:

1. **FTP/SFTP Upload**
   - Upload all files to your server's public_html or www directory
   - Ensure file permissions are set correctly (644 for files, 755 for directories)

2. **Static Hosting Services**
   - **Netlify**: Drag and drop the entire Web folder
   - **Vercel**: Connect your repository or drag and drop
   - **GitHub Pages**: Push to gh-pages branch
   - **AWS S3**: Upload to S3 bucket with static hosting enabled
   - **Firebase Hosting**: Use `firebase deploy`

3. **Direct Upload**
   - Works with any standard web hosting service
   - No server-side processing required
   - 100% static HTML/CSS

## 🎨 Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Modern UI**: Elegant dark theme matching the app's branding
- **SEO Optimized**: Proper meta tags and semantic HTML
- **Fast Loading**: Pure HTML/CSS with no JavaScript dependencies
- **Accessible**: WCAG-compliant color contrast and semantic markup

## 🔧 Customization

### Colors

Edit the CSS variables in `styles.css` to match your branding:

```css
:root {
  --primary-color: #60a5fa;
  --primary-dark: #2563eb;
  --bg-dark: #000000;
  /* etc. */
}
```

### Content

All content is in the HTML files and can be easily edited with any text editor.

### Images

Replace `logo.png` and `icon.png` with your own images if needed.

## 📱 App Store Links

Update the download links in `index.html`:

- Line ~137: Apple App Store URL
- Line ~146: Google Play Store URL

Current placeholder links:

- iOS: `https://apps.apple.com/app/toxic-confessions`
- Android: `https://play.google.com/store/apps/details?id=com.toxic.confessions`

## 📧 Contact Information

Update the support email in all HTML files if needed:

- Current: `support@toxicconfessions.com`

## 🌐 Domain

The website is designed for: `toxicconfessions.app`

Update URLs in the HTML files if using a different domain.

## ✅ Legal Pages

All legal pages are included and comprehensive:

- **Privacy Policy**: GDPR & CCPA compliant
- **Terms of Service**: Complete terms covering all app features
- **Help & Support**: Extensive FAQ and troubleshooting guide

## 🔒 SSL Certificate

For production deployment, ensure your server has an SSL certificate installed for HTTPS.

## 📊 Analytics (Optional)

To add analytics, insert your tracking code before the closing `</body>` tag in each HTML file.

## 🐛 Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📝 License

All rights reserved © 2025 Toxic Confessions

---

**Need help?** Contact support at support@toxicconfessions.com
