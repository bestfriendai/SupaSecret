Run notes for RevenueCat MCP setup

What I did

- Updated `scripts/mcp-setup-revenuecat.ts` to read the MCP API key from the environment variable `REVENUECAT_MCP_API_KEY`.
- Ran the script locally with the provided key (exported inline) to simulate MCP calls and generate config files.

Command used (zsh):

REVENUECAT_MCP_API_KEY=sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz npx tsx scripts/mcp-setup-revenuecat.ts

Files generated

- `setup/mcp-revenuecat-config.json` — full MCP-style configuration (project, products, entitlements, offerings)
- `setup/mcp-store-configuration.json` — store configuration for App Store Connect and Google Play Console

Next steps

1. Create the subscription products in App Store Connect and Google Play Console using the store configuration.
2. Import the products into the RevenueCat dashboard (or use the real MCP service if available).
3. Add the real app keys to your environment or EAS secrets (do not commit secrets to git). For CI or EAS builds, use `eas secrets` or the build profile's secrets.
4. Run `npm run verify-revenuecat` to confirm integration.

Security note

- Do NOT commit MCP API keys to the repository. Use environment variables or EAS secrets.
