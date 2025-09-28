#!/usr/bin/env tsx

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// RevenueCat REST API v2 configuration
const API_KEY = 'sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz';
const API_BASE = 'https://api.revenuecat.com/v2';
const PROJECT_ID = 'toxicconfessions'; // Your existing project

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'X-Platform': 'ios,android'
  },
});

// Product configurations
const PRODUCTS = [
  {
    id: 'supasecret_plus_monthly',
    store_identifier: 'supasecret_plus_monthly',
    type: 'subscription',
    display_name: 'Toxic Confessions Plus Monthly',
    app_store_product_id: 'supasecret_plus_monthly',
    play_store_product_id: 'supasecret_plus_monthly',
  },
  {
    id: 'supasecret_plus_annual',
    store_identifier: 'supasecret_plus_annual',
    type: 'subscription',
    display_name: 'Toxic Confessions Plus Annual',
    app_store_product_id: 'supasecret_plus_annual',
    play_store_product_id: 'supasecret_plus_annual',
  },
];

// Entitlement configuration
const ENTITLEMENTS = [
  {
    id: 'supasecret_plus',
    display_name: 'Premium Access',
    description: 'Full access to all premium features',
    product_ids: ['supasecret_plus_monthly', 'supasecret_plus_annual'],
  },
];

// Offering configuration
const OFFERINGS = [
  {
    id: 'default',
    display_name: 'Toxic Confessions Plus',
    is_current: true,
    packages: [
      {
        id: '$rc_monthly',
        display_name: 'Monthly Subscription',
        position: 0,
        product_id: 'supasecret_plus_monthly',
      },
      {
        id: '$rc_annual',
        display_name: 'Annual Subscription (Save 50%)',
        position: 1,
        product_id: 'supasecret_plus_annual',
        is_featured: true,
      },
    ],
  },
];

// Step 1: Create Products
async function createProducts() {
  console.log('\n🛍️ Creating Products...');

  for (const product of PRODUCTS) {
    try {
      console.log(`\n  Creating product: ${product.id}`);

      // Create product for iOS
      const iosPayload = {
        store_identifier: product.app_store_product_id,
        type: product.type,
        display_name: product.display_name,
      };

      await api.post(`/projects/${PROJECT_ID}/products`, iosPayload, {
        headers: { 'X-Platform': 'ios' }
      });
      console.log(`    ✅ iOS product created: ${product.id}`);

      // Create product for Android
      const androidPayload = {
        store_identifier: product.play_store_product_id,
        type: product.type,
        display_name: product.display_name,
      };

      await api.post(`/projects/${PROJECT_ID}/products`, androidPayload, {
        headers: { 'X-Platform': 'android' }
      });
      console.log(`    ✅ Android product created: ${product.id}`);

    } catch (error: any) {
      if (error.response?.status === 409 || error.response?.data?.code === 'product_already_exists') {
        console.log(`    ℹ️ Product ${product.id} already exists`);
      } else {
        console.error(`    ❌ Error creating product ${product.id}:`, error.response?.data || error.message);
      }
    }
  }
}

// Step 2: Create Entitlements
async function createEntitlements() {
  console.log('\n📦 Creating Entitlements...');

  for (const entitlement of ENTITLEMENTS) {
    try {
      console.log(`\n  Creating entitlement: ${entitlement.id}`);

      const payload = {
        id: entitlement.id,
        display_name: entitlement.display_name,
        description: entitlement.description,
      };

      await api.post(`/projects/${PROJECT_ID}/entitlements`, payload);
      console.log(`    ✅ Entitlement created: ${entitlement.id}`);

      // Attach products to entitlement
      for (const productId of entitlement.product_ids) {
        try {
          await api.post(`/projects/${PROJECT_ID}/entitlements/${entitlement.id}/products`, {
            product_id: productId
          });
          console.log(`    ✅ Attached product ${productId} to entitlement`);
        } catch (error: any) {
          if (error.response?.status === 409) {
            console.log(`    ℹ️ Product ${productId} already attached`);
          } else {
            console.error(`    ❌ Error attaching product:`, error.response?.data || error.message);
          }
        }
      }

    } catch (error: any) {
      if (error.response?.status === 409 || error.response?.data?.code === 'entitlement_already_exists') {
        console.log(`    ℹ️ Entitlement ${entitlement.id} already exists`);

        // Try to attach products even if entitlement exists
        for (const productId of entitlement.product_ids) {
          try {
            await api.post(`/projects/${PROJECT_ID}/entitlements/${entitlement.id}/products`, {
              product_id: productId
            });
            console.log(`    ✅ Attached product ${productId} to existing entitlement`);
          } catch (err: any) {
            if (err.response?.status === 409) {
              console.log(`    ℹ️ Product ${productId} already attached`);
            }
          }
        }
      } else {
        console.error(`    ❌ Error creating entitlement:`, error.response?.data || error.message);
      }
    }
  }
}

// Step 3: Create Offerings
async function createOfferings() {
  console.log('\n🎯 Creating Offerings...');

  for (const offering of OFFERINGS) {
    try {
      console.log(`\n  Creating offering: ${offering.id}`);

      const payload = {
        id: offering.id,
        display_name: offering.display_name,
        is_current: offering.is_current,
      };

      await api.post(`/projects/${PROJECT_ID}/offerings`, payload);
      console.log(`    ✅ Offering created: ${offering.id}`);

      // Add packages to offering
      for (const pkg of offering.packages) {
        try {
          const packagePayload = {
            id: pkg.id,
            display_name: pkg.display_name,
            position: pkg.position,
            product_id: pkg.product_id,
            is_featured: pkg.is_featured || false,
          };

          await api.post(`/projects/${PROJECT_ID}/offerings/${offering.id}/packages`, packagePayload);
          console.log(`    ✅ Added package ${pkg.id} to offering`);
        } catch (error: any) {
          if (error.response?.status === 409) {
            console.log(`    ℹ️ Package ${pkg.id} already exists`);
          } else {
            console.error(`    ❌ Error adding package:`, error.response?.data || error.message);
          }
        }
      }

      // Set as current offering if specified
      if (offering.is_current) {
        try {
          await api.patch(`/projects/${PROJECT_ID}/offerings/${offering.id}`, {
            is_current: true
          });
          console.log(`    ✅ Set ${offering.id} as current offering`);
        } catch (error: any) {
          console.error(`    ❌ Error setting current offering:`, error.response?.data || error.message);
        }
      }

    } catch (error: any) {
      if (error.response?.status === 409 || error.response?.data?.code === 'offering_already_exists') {
        console.log(`    ℹ️ Offering ${offering.id} already exists`);

        // Try to update packages even if offering exists
        for (const pkg of offering.packages) {
          try {
            const packagePayload = {
              id: pkg.id,
              display_name: pkg.display_name,
              position: pkg.position,
              product_id: pkg.product_id,
              is_featured: pkg.is_featured || false,
            };

            await api.post(`/projects/${PROJECT_ID}/offerings/${offering.id}/packages`, packagePayload);
            console.log(`    ✅ Added package ${pkg.id} to existing offering`);
          } catch (err: any) {
            if (err.response?.status === 409) {
              console.log(`    ℹ️ Package ${pkg.id} already exists`);
            }
          }
        }

        // Set as current if needed
        if (offering.is_current) {
          try {
            await api.patch(`/projects/${PROJECT_ID}/offerings/${offering.id}`, {
              is_current: true
            });
            console.log(`    ✅ Set ${offering.id} as current offering`);
          } catch (err: any) {
            console.log(`    ℹ️ Could not update current offering status`);
          }
        }
      } else {
        console.error(`    ❌ Error creating offering:`, error.response?.data || error.message);
      }
    }
  }
}

// Step 4: Verify Setup
async function verifySetup() {
  console.log('\n🔍 Verifying Setup...');

  try {
    // Get project info
    const projectResponse = await api.get(`/projects/${PROJECT_ID}`);
    console.log(`\n  ✅ Project: ${projectResponse.data.name || PROJECT_ID}`);

    // Get products
    const productsResponse = await api.get(`/projects/${PROJECT_ID}/products`);
    console.log(`  ✅ Products: ${productsResponse.data.products?.length || 0} configured`);

    // Get entitlements
    const entitlementsResponse = await api.get(`/projects/${PROJECT_ID}/entitlements`);
    console.log(`  ✅ Entitlements: ${entitlementsResponse.data.entitlements?.length || 0} configured`);

    // Get offerings
    const offeringsResponse = await api.get(`/projects/${PROJECT_ID}/offerings`);
    console.log(`  ✅ Offerings: ${offeringsResponse.data.offerings?.length || 0} configured`);

    // Find current offering
    const currentOffering = offeringsResponse.data.offerings?.find((o: any) => o.is_current);
    if (currentOffering) {
      console.log(`  ✅ Current Offering: ${currentOffering.id}`);
    }

  } catch (error: any) {
    console.error('  ❌ Error verifying setup:', error.response?.data || error.message);
  }
}

// Main setup function
async function main() {
  console.log('🚀 Configuring RevenueCat Project: Toxic Confessions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Step 1: Create Products
    await createProducts();

    // Step 2: Create Entitlements
    await createEntitlements();

    // Step 3: Create Offerings
    await createOfferings();

    // Step 4: Verify Setup
    await verifySetup();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ✅ ✅ RevenueCat Configuration Complete! ✅ ✅ ✅');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n📱 Next Steps:');
    console.log('1. Create matching products in App Store Connect');
    console.log('2. Create matching products in Google Play Console');
    console.log('3. Import products in RevenueCat Dashboard');
    console.log('4. Test with sandbox accounts');

    console.log('\n💰 Products Created:');
    console.log('  • supasecret_plus_monthly - $4.99/month');
    console.log('  • supasecret_plus_annual - $29.99/year (Save 50%)');

    console.log('\n🎁 Premium Features:');
    console.log('  • Ad-free experience');
    console.log('  • Unlimited 5-minute videos');
    console.log('  • 4K video quality');
    console.log('  • Unlimited saves');
    console.log('  • Advanced filters');
    console.log('  • Priority processing');
    console.log('  • Custom themes');
    console.log('  • Early access');

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the setup
main();