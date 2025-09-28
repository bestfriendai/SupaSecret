# RevenueCat MCP Server Setup - Complete Guide

## ✅ Setup Status: COMPLETE

The RevenueCat MCP (Model Context Protocol) server has been successfully configured for your Toxic Confessions project.

## 📁 Files Created

1. **`.cursor/mcp.json`** - MCP server configuration for Cursor IDE
2. **`.env.mcp`** - Environment variables with API keys (git-ignored)
3. **`scripts/test-revenuecat-mcp.ts`** - MCP connection test script
4. **`scripts/verify-mcp-setup.ts`** - Setup verification script
5. **`setup/mcp-setup-summary.json`** - Setup summary and status

## 🔐 Security Configuration

All sensitive files have been added to `.gitignore`:

- `.cursor/mcp.json` - Contains API key
- `.env.mcp` - Contains all RevenueCat keys
- `mcp.json` - Any root-level MCP config

## 🚀 How to Use in Cursor

### Enable MCP in Cursor:

1. **Restart Cursor IDE** to load the new configuration
2. Go to **Settings → MCP**
3. Click the **Enable** button (if not already enabled)
4. Click the **Refresh** icon to reload servers
5. You should see "revenuecat" in the available servers list

### Using RevenueCat MCP:

In Cursor, you can now use `@revenuecat` to interact with your RevenueCat project:

```
@revenuecat list all products
@revenuecat show entitlements
@revenuecat create a new offering
@revenuecat get customer info for [user_id]
@revenuecat update product pricing
```

## 📊 Your Project Configuration

- **Project**: Toxic Confessions
- **Bundle ID**: com.toxic.confessions
- **Platforms**: iOS, Android
- **API Key**: sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz (stored securely)

### Configured Products:

1. **Monthly Subscription** (`supasecret_plus_monthly`) - $4.99/month
2. **Annual Subscription** (`supasecret_plus_annual`) - $29.99/year

### Configured Entitlements:

- **Premium Access** (`supasecret_plus`) - Full access to all premium features

## 🔧 Maintenance Scripts

### Verify Setup:

```bash
npm run tsx scripts/verify-mcp-setup.ts
```

### Test MCP Connection:

```bash
npm run tsx scripts/test-revenuecat-mcp.ts
```

## 🛠️ Troubleshooting

### If MCP server doesn't appear in Cursor:

1. Make sure you've restarted Cursor
2. Check that MCP is enabled in Settings
3. Click the refresh button in MCP settings
4. Verify `.cursor/mcp.json` exists

### If authentication fails:

1. Check your API key is correct in `.env.mcp`
2. Ensure the key has proper permissions in RevenueCat dashboard
3. Verify the key starts with `sk_`

### To update the API key:

1. Edit `.env.mcp` with new key
2. Update `.cursor/mcp.json` with new Bearer token
3. Restart Cursor

## 📚 Additional Resources

- [RevenueCat MCP Documentation](https://www.revenuecat.com/docs/tools/mcp/overview)
- [MCP Tools Reference](https://www.revenuecat.com/docs/tools/mcp/tools-reference)
- [Usage Examples](https://www.revenuecat.com/docs/tools/mcp/usage-examples)
- [Best Practices](https://www.revenuecat.com/docs/tools/mcp/best-practices-and-troubleshooting)

## ⚠️ Important Notes

1. **Never commit** `.env.mcp` or `.cursor/mcp.json` to version control
2. **API Key Security**: Your API v2 key has write permissions - keep it secure
3. **EAS Builds**: For production builds, use EAS secrets instead of local env files

## 🎯 Next Steps

1. Restart Cursor to activate the MCP server
2. Test the integration using `@revenuecat` commands
3. Configure your products in App Store Connect and Google Play Console
4. Set up server notifications for real-time subscription updates

---

**Setup completed on**: September 28, 2025
**Configuration verified**: ✅ All checks passed
