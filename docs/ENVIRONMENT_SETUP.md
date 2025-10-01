# Environment Variables Setup Guide - ToxicConfessions

## Overview

This guide explains how to set up environment variables for the ToxicConfessions app using Expo 54 best practices. It covers RevenueCat, AdMob, Supabase, AI services (OpenAI, Anthropic, Grok), and other external services.

**Expo 54 Best Practices (September 2025):**

- All client-side environment variables must use the `EXPO_PUBLIC_` prefix
- Use EAS Build secrets for production builds with appropriate visibility settings
- Leverage EAS environments (development, preview, production) for different deployment stages
- Pull environment variables locally using `eas env:pull --environment <env>`
- Use the `--environment` flag with `eas update` for consistent environments
- Never store sensitive secrets in `EXPO_PUBLIC_` variables

Note: For local validation and development you can create a `.env.local` file in the project root with the keys below (do NOT commit real secrets). A `.env.local.sample` is provided as an example in the repo.

## Required Environment Variables

### RevenueCat Configuration

```bash
# iOS RevenueCat API Key (Required)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_revenuecat_ios_api_key_here

# Android RevenueCat API Key (Required)
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_revenuecat_android_api_key_here
```

### AdMob Configuration

```bash
# iOS AdMob App ID (Required for production)
EXPO_PUBLIC_ADMOB_IOS_APP_ID=your_admob_ios_app_id_here

# Android AdMob App ID (Required for production)
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=your_admob_android_app_id_here

# iOS Ad Unit IDs
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=your_admob_ios_banner_id_here
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=your_admob_ios_interstitial_id_here

# Android Ad Unit IDs
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=your_admob_android_banner_id_here
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=your_admob_android_interstitial_id_here
```

### Supabase Configuration

```bash
# Supabase Project URL (Required)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
# Alternative fallback key
EXPO_PUBLIC_VIBECODE_SUPABASE_URL=your_supabase_project_url_here

# Supabase Anonymous Key (Required)
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
# Alternative fallback key
EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### AI Services Configuration

```bash
# OpenAI API Key (Required for AI features)
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
# Alternative fallback key
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Key (Required for Claude features)
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key_here
# Alternative fallback key
EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Grok API Key (Required for Grok features)
EXPO_PUBLIC_GROK_API_KEY=your_grok_api_key_here
# Alternative fallback key
EXPO_PUBLIC_VIBECODE_GROK_API_KEY=your_grok_api_key_here

# Additional AI Services
EXPO_PUBLIC_VIBECODE_TRANSCRIPTION_API_KEY=your_transcription_api_key_here
EXPO_PUBLIC_VIBECODE_IMAGE_API_KEY=your_image_generation_api_key_here
```

### Optional Services

```bash
# Google Analytics (Optional)
EXPO_PUBLIC_GOOGLE_ANALYTICS_ID=your_google_analytics_id_here

# Push Notifications (Optional)
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id_here

# App Environment (Optional, defaults to production)
EXPO_PUBLIC_ENV=development|preview|production

# Project ID (Optional)
EXPO_PUBLIC_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_VIBECODE_PROJECT_ID=your_project_id_here

# Base URLs (Optional)
EXPO_PUBLIC_BASE_URL=your_base_url_here
EXPO_PUBLIC_FALLBACK_URL=your_fallback_url_here
EXPO_PUBLIC_SUPPORT_EMAIL=your_support_email_here
```

## Setup Instructions

### 1. Development Setup

#### Option A: Local .env file (Recommended for development)

1. Copy the template:

   ```bash
   cp setup/.env.template .env.local
   ```

2. Edit `.env.local` file with your actual values:

   ```bash
   # Open .env.local in your editor
   nano .env.local
   ```

3. Add your development keys (use test/sandbox keys for development)

4. Pull EAS environment variables for local development:
   ```bash
   # Pull development environment variables
   eas env:pull --environment development
   ```

#### Option B: System Environment Variables

```bash
# Set variables in your shell profile
export EXPO_PUBLIC_REVENUECAT_IOS_KEY="your_ios_key_here"
export EXPO_PUBLIC_REVENUECAT_ANDROID_KEY="your_android_key_here"
# ... add other variables
```

### 2. Production Setup (EAS Build)

#### Step 1: Get Your API Keys

##### RevenueCat Keys

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select your "ToxicConfessions" project
3. Go to **Project Settings** → **API Keys**
4. Copy the **Public SDK Key** for each platform:
   - iOS: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
   - Android: `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

##### AdMob Keys

1. Go to [AdMob Console](https://apps.admob.com)
2. Select your app or create a new one
3. Copy the **App ID** for each platform:
   - iOS: `EXPO_PUBLIC_ADMOB_IOS_APP_ID`
   - Android: `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`

##### Supabase Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **anon/public** key:
   - URL: `EXPO_PUBLIC_SUPABASE_URL`
   - Anon Key: `EXPO_PUBLIC_SUPABASE_ANON_KEY`

##### AI Service Keys

- **OpenAI**: Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Anthropic**: Get API key from [Anthropic Console](https://console.anthropic.com/)
- **Grok**: Get API key from [xAI](https://docs.x.ai/docs#api-keys) (if available)

#### Step 2: Set EAS Secrets with Visibility Settings

```bash
# RevenueCat API Keys (Plain text - safe for client-side)
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "your_actual_ios_key" --scope project --type plain
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "your_actual_android_key" --scope project --type plain

# AdMob Configuration (Plain text)
eas secret:create --name EXPO_PUBLIC_ADMOB_IOS_APP_ID --value "your_actual_ios_app_id" --scope project --type plain
eas secret:create --name EXPO_PUBLIC_ADMOB_ANDROID_APP_ID --value "your_actual_android_app_id" --scope project --type plain

# Supabase Configuration (Plain text)
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "your_supabase_url" --scope project --type plain
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_supabase_anon_key" --scope project --type plain

# AI Service Keys (Sensitive - obfuscated in logs)
eas secret:create --name EXPO_PUBLIC_OPENAI_API_KEY --value "your_openai_key" --scope project --type sensitive
eas secret:create --name EXPO_PUBLIC_ANTHROPIC_API_KEY --value "your_anthropic_key" --scope project --type sensitive
eas secret:create --name EXPO_PUBLIC_GROK_API_KEY --value "your_grok_key" --scope project --type sensitive

# Ad Unit IDs (if using specific ad units)
eas secret:create --name EXPO_PUBLIC_ADMOB_IOS_BANNER_ID --value "your_ios_banner_unit_id" --scope project --type plain
eas secret:create --name EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID --value "your_android_banner_unit_id" --scope project --type plain
```

#### Step 3: Configure EAS Build Environments

Update your `eas.json` to specify environments:

```json
{
  "build": {
    "development": {
      "environment": "development"
    },
    "preview": {
      "environment": "preview"
    },
    "production": {
      "environment": "production"
    }
  }
}
```

### 3. CI/CD Setup (GitHub Actions, EAS Workflows, etc.)

#### EAS Workflows Integration

Use EAS Workflows for automated builds and updates:

```yaml
# .eas/workflows/e2e.yml
name: E2E Tests
on:
  push:
    branches: [main]

jobs:
  test:
    type: build
    environment: development
    name: Test
    config:
      env:
        EXPO_PUBLIC_ENV: development
```

#### GitHub Actions Setup

Add these secrets to your GitHub repository:

- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- `EXPO_PUBLIC_ADMOB_IOS_APP_ID`
- `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OPENAI_API_KEY` (as sensitive)
- `EXPO_PUBLIC_ANTHROPIC_API_KEY` (as sensitive)
- `EXPO_PUBLIC_GROK_API_KEY` (as sensitive)

Example GitHub Actions workflow:

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --profile production --non-interactive
```

## Environment Variable Reference

### RevenueCat Variables

| Variable                             | Description                           | Required | Visibility | Example                           |
| ------------------------------------ | ------------------------------------- | -------- | ---------- | --------------------------------- |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`     | RevenueCat Public SDK Key for iOS     | Yes      | Plain text | `appl_XXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat Public SDK Key for Android | Yes      | Plain text | `goog_XXXXXXXXXXXXXXXXXXXXXXXXXX` |

### AdMob Variables

| Variable                              | Description                   | Required | Visibility | Example                            |
| ------------------------------------- | ----------------------------- | -------- | ---------- | ---------------------------------- |
| `EXPO_PUBLIC_ADMOB_IOS_APP_ID`        | AdMob App ID for iOS          | Yes      | Plain text | `ca-app-pub-XXXXXXXXXX~YYYYYYYYYY` |
| `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`    | AdMob App ID for Android      | Yes      | Plain text | `ca-app-pub-XXXXXXXXXX~YYYYYYYYYY` |
| `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID`     | Banner ad unit ID for iOS     | No       | Plain text | `ca-app-pub-XXXXXXXXXX/YYYYYYYYYY` |
| `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` | Banner ad unit ID for Android | No       | Plain text | `ca-app-pub-XXXXXXXXXX/YYYYYYYYYY` |

### Supabase Variables

| Variable                                 | Description                   | Required | Visibility | Example                                   |
| ---------------------------------------- | ----------------------------- | -------- | ---------- | ----------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`               | Supabase project URL          | Yes      | Plain text | `https://your-project.supabase.co`        |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`          | Supabase anonymous key        | Yes      | Plain text | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `EXPO_PUBLIC_VIBECODE_SUPABASE_URL`      | Alternative Supabase URL      | No       | Plain text | `https://your-project.supabase.co`        |
| `EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY` | Alternative Supabase anon key | No       | Plain text | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### AI Services Variables

| Variable                                     | Description               | Required              | Visibility | Example          |
| -------------------------------------------- | ------------------------- | --------------------- | ---------- | ---------------- |
| `EXPO_PUBLIC_OPENAI_API_KEY`                 | OpenAI API key            | Yes (for AI features) | Sensitive  | `sk-...`         |
| `EXPO_PUBLIC_ANTHROPIC_API_KEY`              | Anthropic API key         | Yes (for Claude)      | Sensitive  | `sk-ant-...`     |
| `EXPO_PUBLIC_GROK_API_KEY`                   | Grok API key              | Yes (for Grok)        | Sensitive  | `xai-...`        |
| `EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY`        | Alternative OpenAI key    | No                    | Sensitive  | `sk-...`         |
| `EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY`     | Alternative Anthropic key | No                    | Sensitive  | `sk-ant-...`     |
| `EXPO_PUBLIC_VIBECODE_GROK_API_KEY`          | Alternative Grok key      | No                    | Sensitive  | `xai-...`        |
| `EXPO_PUBLIC_VIBECODE_TRANSCRIPTION_API_KEY` | Transcription service key | No                    | Sensitive  | Service-specific |
| `EXPO_PUBLIC_VIBECODE_IMAGE_API_KEY`         | Image generation key      | No                    | Sensitive  | Service-specific |

### Optional Variables

| Variable                          | Description                             | Required | Visibility | Example                                |
| --------------------------------- | --------------------------------------- | -------- | ---------- | -------------------------------------- |
| `EXPO_PUBLIC_GOOGLE_ANALYTICS_ID` | Google Analytics tracking ID            | No       | Plain text | `G-XXXXXXXXXX`                         |
| `EXPO_PUBLIC_ONESIGNAL_APP_ID`    | OneSignal App ID for push notifications | No       | Plain text | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `EXPO_PUBLIC_ENV`                 | App environment                         | No       | Plain text | `development`                          |
| `EXPO_PUBLIC_PROJECT_ID`          | Project identifier                      | No       | Plain text | `your-project-id`                      |
| `EXPO_PUBLIC_BASE_URL`            | Base API URL                            | No       | Plain text | `https://api.yourapp.com`              |
| `EXPO_PUBLIC_FALLBACK_URL`        | Fallback URL                            | No       | Plain text | `https://fallback.yourapp.com`         |
| `EXPO_PUBLIC_SUPPORT_EMAIL`       | Support email                           | No       | Plain text | `support@yourapp.com`                  |

## Validation

### 1. Check Configuration Validity

Run the built-in validation script:

```bash
# From the project root
node setup/validate-config.js
```

This will check:

- ✅ All required environment variables are set
- ✅ No placeholder values are present
- ✅ Configuration files exist and are valid
- ✅ Product definitions are consistent

### 2. Comprehensive Environment Validation

Run the comprehensive validation script:

```bash
# From the project root
node scripts/validate-environment.js
```

This script validates:

- ✅ All required environment variables for RevenueCat, AdMob, Supabase, and AI services
- ✅ Environment variable format and security
- ✅ Service connectivity (where possible)
- ✅ EAS secret configuration

### 3. Manual Verification

1. **Check RevenueCat Configuration**:

   ```typescript
   import { validateProductionConfig } from "./src/config/production";

   const validation = validateProductionConfig();
   console.log("Validation result:", validation);
   ```

2. **Test RevenueCat Connection**:

   ```typescript
   import { RevenueCatService } from "./src/services/RevenueCatService";

   // Initialize and check connection
   await RevenueCatService.initialize();
   const offerings = await RevenueCatService.getOfferings();
   console.log("RevenueCat connection:", offerings ? "✅ Success" : "❌ Failed");
   ```

3. **Test Supabase Connection**:

   ```typescript
   import { supabase } from "./src/lib/supabase";

   // Test basic connection
   const { data, error } = await supabase.from("test_table").select("*").limit(1);
   console.log("Supabase connection:", error ? "❌ Failed" : "✅ Success");
   ```

4. **Test AI Service Connections**:

   ```typescript
   import { getOpenAIClient } from "./src/api/openai";
   import { getAnthropicClient } from "./src/api/anthropic";
   import { getGrokClient } from "./src/api/grok";

   // Test each client initialization
   const openai = await getOpenAIClient();
   const anthropic = await getAnthropicClient();
   const grok = await getGrokClient();
   console.log("AI clients initialized successfully");
   ```

### 4. EAS Build Validation

Before building for production, validate your setup:

```bash
# Check that all EAS secrets are set
eas secret:list --scope project

# Test build configuration
eas build:configure

# Validate environment variables for specific environment
eas env:list --environment production
```

## Troubleshooting

### Common Issues

#### "Invalid API Key" Error

- **Problem**: RevenueCat API keys are incorrect or expired
- **Solution**:
  - Verify keys are copied correctly from RevenueCat dashboard
  - Ensure you're using Public SDK Keys, not Secret API Keys
  - Check that keys match the correct platform (iOS/Android)

#### "No Offerings Found" Error

- **Problem**: Products or offerings not configured in RevenueCat
- **Solution**:
  - Verify products exist in RevenueCat dashboard
  - Check that product IDs match between app and dashboard
  - Ensure offerings are published (not in draft mode)

#### Supabase Connection Issues

- **Problem**: Unable to connect to Supabase
- **Solution**:
  - Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are correct
  - Check Supabase project status in dashboard
  - Ensure anon key has proper permissions
  - Test connection using Supabase dashboard SQL editor

#### AI Service Authentication Errors

- **Problem**: AI API calls failing with authentication errors
- **Solution**:
  - Verify API keys are set correctly (check for typos)
  - Ensure keys have sufficient credits/permissions
  - Check rate limits and usage quotas
  - For OpenAI: Verify key starts with `sk-`
  - For Anthropic: Verify key starts with `sk-ant-`
  - For Grok: Check xAI documentation for key format

#### Environment Variables Not Loading

- **Problem**: `.env` file not being read by Expo
- **Solution**:
  - Ensure `.env.local` file is in project root (not `.env` for security)
  - Restart Metro bundler: `npx expo start --clear`
  - Check file permissions on `.env.local`
  - Verify variables use `EXPO_PUBLIC_` prefix

#### EAS Build Using Wrong Secrets

- **Problem**: Production build not picking up EAS secrets
- **Solution**:
  - Verify secret names match exactly (case-sensitive)
  - Check secret scope is set to `project`
  - Ensure correct visibility type (plain, sensitive, secret)
  - Redeploy after updating secrets
  - Check `eas.json` environment configuration

#### EAS Environment Variables Not Syncing

- **Problem**: Local development not using EAS environment variables
- **Solution**:
  - Run `eas env:pull --environment development` to sync
  - Ensure `.env.local` is not overriding EAS variables
  - Check that environment is properly configured in `eas.json`

#### Expo Go AI Features Not Working

- **Problem**: AI features show stub messages in Expo Go
- **Solution**:
  - This is expected behavior - AI features require development builds
  - Build with `eas build --profile development` for testing
  - Expo Go uses stub implementations for compatibility

### Debug Information

Enable debug logging:

```typescript
// In development, debug logs are automatically enabled
// Check console for detailed error messages

// For AI services, check the API files for additional logging
import { getOpenAIClient } from "./src/api/openai";
const client = await getOpenAIClient();
// Check console for initialization messages
```

### Getting Help

1. **RevenueCat Support**:
   - Check [RevenueCat Documentation](https://docs.revenuecat.com/)
   - Review [React Native Guide](https://docs.revenuecat.com/docs/react-native)

2. **AdMob Support**:
   - Check [AdMob Documentation](https://developers.google.com/admob)
   - Review [Expo AdMob Guide](https://docs.expo.dev/versions/latest/sdk/admob/)

3. **Supabase Support**:
   - Check [Supabase Documentation](https://supabase.com/docs)
   - Review [Expo Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)

4. **AI Services Support**:
   - **OpenAI**: [OpenAI Documentation](https://platform.openai.com/docs)
   - **Anthropic**: [Anthropic Documentation](https://docs.anthropic.com/)
   - **Grok**: [xAI Documentation](https://docs.x.ai/)

5. **Environment Variables**:
   - Check [Expo Environment Variables Guide](https://docs.expo.dev/guides/environment-variables/)
   - Review [EAS Environment Variables Guide](https://docs.expo.dev/eas/environment-variables/)

## Security Best Practices (September 2025)

### ✅ Do's

- **Use EAS Environments**: Leverage development, preview, and production environments for proper key separation
- **Apply Correct Visibility**: Use `plain` for client-safe keys, `sensitive` for API keys, `secret` for server-only keys
- **Rotate Keys Regularly**: Set up automated key rotation for AI services and database credentials
- **Use Environment-Specific Keys**: Different keys for development, staging, and production
- **Validate Before Deployment**: Always run validation scripts before building
- **Monitor Key Usage**: Set up alerts for unusual API usage patterns
- **Use Fallback Keys**: Implement `VIBECODE_` prefixed fallbacks for key management flexibility
- **Enable EAS Audit Logs**: Monitor secret access and changes

### ❌ Don'ts

- Never commit API keys to version control (use `.env.local` and EAS secrets)
- Never use Secret API Keys in client-side code (only Public SDK keys)
- Never share keys between different environments
- Never use placeholder values in production builds
- Never expose sensitive keys in build logs (use `sensitive` visibility)
- Never hardcode keys in source code
- Never use personal API keys for production (use service accounts/organization keys)

### Advanced Security Measures

- **Key Encryption**: EAS automatically encrypts all secrets at rest and in transit
- **Access Control**: Limit EAS secret access to authorized team members
- **Audit Trails**: Use EAS dashboard to monitor secret usage and changes
- **Environment Isolation**: Ensure production builds never access development keys
- **Rate Limiting**: Implement rate limiting for AI API calls to prevent abuse
- **Token Expiry**: Use tokens with automatic expiry where possible

## Quick Setup Checklist

### RevenueCat Setup

- [ ] Create RevenueCat account and project
- [ ] Configure platforms in RevenueCat dashboard
- [ ] Create products and entitlements in RevenueCat
- [ ] Set up offerings in RevenueCat
- [ ] Get API keys from RevenueCat dashboard

### AdMob Setup

- [ ] Set up AdMob account and get App IDs
- [ ] Create ad units for banner/interstitial ads
- [ ] Configure ad targeting and content rating

### Supabase Setup

- [ ] Create Supabase project
- [ ] Set up database schema and tables
- [ ] Configure Row Level Security (RLS) policies
- [ ] Get project URL and anon key from API settings

### AI Services Setup

- [ ] Create OpenAI account and get API key
- [ ] Create Anthropic account and get API key
- [ ] Set up xAI/Grok access (if available)
- [ ] Configure usage limits and billing alerts

### Environment Configuration

- [ ] Create `.env.local` file for development
- [ ] Set up EAS environments (development, preview, production)
- [ ] Configure EAS secrets with proper visibility
- [ ] Update `eas.json` with environment settings
- [ ] Run validation scripts
- [ ] Test configuration in development build
- [ ] Test configuration in production build

### CI/CD Setup

- [ ] Configure EAS Workflows or GitHub Actions
- [ ] Set up automated builds and updates
- [ ] Configure environment-specific deployments

## Validation Scripts

### Comprehensive Validation

Create `scripts/validate-environment.js`:

```javascript
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const REQUIRED_VARS = [
  "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY",
  "EXPO_PUBLIC_ADMOB_IOS_APP_ID",
  "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];

const AI_VARS = ["EXPO_PUBLIC_OPENAI_API_KEY", "EXPO_PUBLIC_ANTHROPIC_API_KEY", "EXPO_PUBLIC_GROK_API_KEY"];

function validateEnvironmentVariables() {
  console.log("🔍 Validating environment variables...");
  const issues = [];

  REQUIRED_VARS.forEach((varName) => {
    const value = process.env[varName] || process.env[`VIBECODE_${varName.replace("EXPO_PUBLIC_", "")}`];
    if (!value) {
      issues.push({ type: "missing", variable: varName, severity: "critical" });
    } else if (value.includes("your_") || value.includes("YOUR_")) {
      issues.push({ type: "placeholder", variable: varName, severity: "warning" });
    }
  });

  // Check AI vars (optional but recommended)
  AI_VARS.forEach((varName) => {
    const value = process.env[varName] || process.env[`VIBECODE_${varName.replace("EXPO_PUBLIC_", "")}`];
    if (!value) {
      issues.push({ type: "missing", variable: varName, severity: "info" });
    }
  });

  return issues;
}

function reportIssues(issues) {
  if (issues.length === 0) {
    console.log("✅ All validations passed!");
    return true;
  }

  issues.forEach((issue) => {
    const icon = issue.severity === "critical" ? "❌" : issue.severity === "warning" ? "⚠️" : "ℹ️";
    console.log(`${icon} ${issue.variable}: ${issue.type}`);
  });

  return false;
}

const issues = validateEnvironmentVariables();
const success = reportIssues(issues);
process.exit(success ? 0 : 1);
```

## Next Steps

1. ✅ Set up environment variables
2. ⏳ Test subscription flow (see TESTING_SUBSCRIPTION_FLOW.md)
3. ⏳ Configure Supabase database and policies
4. ⏳ Test AI service integrations
5. ⏳ Set up production store listings
6. ⏳ Monitor subscription and API usage metrics
7. ⏳ Optimize conversion rates and user experience

---

**Last Updated**: September 2025
**Version**: 2.0.0

For detailed setup instructions, see:

- [REVENUECAT_SETUP.md](REVENUECAT_SETUP.md)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI Platform](https://platform.openai.com/docs)
- [Anthropic Documentation](https://docs.anthropic.com/)
