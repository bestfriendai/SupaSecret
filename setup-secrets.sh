#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Setting up environment secrets for Expo and Supabase${NC}\n"

# Check if eas-cli is installed
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}⚠️  EAS CLI not found. Installing...${NC}"
    npm install -g eas-cli
fi

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI not found. Installing...${NC}"
    brew install supabase/tap/supabase
fi

echo -e "${GREEN}📋 Setting up Expo secrets...${NC}\n"

# Expo secrets (for build-time environment variables)
eas secret:create --scope project --name EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY --value "sk-proj-anielepohng9eing5Ol6Phex3oin9geg-n0tr3al" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY --value "sk-ant-api03-gu2gohc4sha1Thohpeep7ro9vie1ikai-n0tr3al" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_VIBECODE_GROK_API_KEY --value "xai-ahDi8ofei1Em2chaichoac2Beehi8thu-n0tr3al" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY --value "UeHoh2oot2IWe6ooW4Oofahd6waebeiw-n0tr3al" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_VIBECODE_ELEVENLABS_API_KEY --value "elevenlabs-api-key-oa9Shahx4Zi4oof2bei5kee9nee7eeng-n0tr3al" --type string --non-interactive || echo "Secret already exists"

echo -e "\n${GREEN}📋 Supabase secrets...${NC}\n"
eas secret:create --scope project --name EXPO_PUBLIC_PROJECT_ID --value "xhtqobjcbjgzxkgfyvdj" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xhtqobjcbjgzxkgfyvdj.supabase.co" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodHFvYmpjYmpnenhrZ2Z5dmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NDg3MjAsImV4cCI6MjA3MDEyNDcyMH0.pRMiejad4ILuHM5N7z9oBMcbCekjSl-1cM41lP1o9-g" --type string --non-interactive || echo "Secret already exists"

echo -e "\n${GREEN}📋 AdMob secrets...${NC}\n"
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_IOS_APP_ID --value "ca-app-pub-9512493666273460~1466059369" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_ANDROID_APP_ID --value "ca-app-pub-9512493666273460~8236030580" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_IOS_BANNER_ID --value "ca-app-pub-9512493666273460/6903779371" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID --value "ca-app-pub-9512493666273460/6470974033" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID --value "ca-app-pub-9512493666273460/6847939052" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID --value "ca-app-pub-9512493666273460/8136969992" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID --value "ca-app-pub-9512493666273460/1862193927" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID --value "ca-app-pub-9512493666273460/9041297053" --type string --non-interactive || echo "Secret already exists"

echo -e "\n${GREEN}📋 RevenueCat secrets...${NC}\n"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "appl_nXnAuBEeeERxBHxAzqhFgSnIzam" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "goog_ffsiomTRezyIrsyrwwZTiCpjSiC" --type string --non-interactive || echo "Secret already exists"

echo -e "\n${GREEN}📋 Analytics secrets...${NC}\n"
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_ANALYTICS_ID --value "G-TESTGOOGLEANALYTICSID" --type string --non-interactive || echo "Secret already exists"
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://test@sentry.io/test" --type string --non-interactive || echo "Secret already exists"

echo -e "\n${GREEN}📋 Setting up Supabase secrets (for backend/edge functions)...${NC}\n"

# Note: These are set via Supabase dashboard or CLI
# Run these commands if you have Supabase edge functions
# supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# supabase secrets set DATABASE_URL=your_database_url

echo -e "\n${GREEN}✅ Listing all configured Expo secrets:${NC}\n"
eas secret:list

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "  1. Verify secrets with: ${GREEN}eas secret:list${NC}"
echo -e "  2. If using Supabase edge functions, run: ${GREEN}supabase secrets list${NC}"
echo -e "  3. Ready to build: ${GREEN}eas build --platform ios --profile production${NC}"
