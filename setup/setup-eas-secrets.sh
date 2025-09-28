#!/bin/bash

# EAS Secrets Setup Script for RevenueCat
# Run this script to set up required secrets for production builds

echo "Setting up EAS secrets for RevenueCat..."

# RevenueCat API Keys
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "your_ios_key_here" --scope project
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "your_android_key_here" --scope project

# AdMob Configuration
eas secret:create --name EXPO_PUBLIC_ADMOB_IOS_APP_ID --value "your_ios_app_id_here" --scope project
eas secret:create --name EXPO_PUBLIC_ADMOB_ANDROID_APP_ID --value "your_android_app_id_here" --scope project
eas secret:create --name EXPO_PUBLIC_ADMOB_IOS_BANNER_ID --value "your_ios_banner_id_here" --scope project
eas secret:create --name EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID --value "your_android_banner_id_here" --scope project

echo "EAS secrets setup complete!"
echo "Don't forget to update the placeholder values with your actual keys."
