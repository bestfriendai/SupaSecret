#!/usr/bin/env tsx
/**
 * RevenueCat API Direct Setup Script
 * Creates products, entitlements, and offerings directly via RevenueCat REST API
 */

import * as dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";

// Load environment variables
dotenv.config({ path: ".env.mcp" });

const API_KEY = process.env.REVENUECAT_MCP_API_KEY;
const BASE_URL = "https://api.revenuecat.com/v1";

// Configuration from existing setup
const CONFIG = {
  project_id: "projf5ad9927", // From setup files
  app: {
    name: "Toxic Confessions",
    bundleId: "com.toxic.confessions",
    packageName: "com.toxic.confessions"
  },
  entitlements: [
    {
      lookup_key: "supasecret_plus",
      display_name: "Premium Access"
    }
  ],
  products: [
    {
      store_identifier: "supasecret_plus_monthly",
      display_name: "Toxic Confessions Plus Monthly",
      type: "subscription"
    },
    {
      store_identifier: "supasecret_plus_annual", 
      display_name: "Toxic Confessions Plus Annual",
      type: "subscription"
    }
  ],
  offerings: [
    {
      lookup_key: "default",
      display_name: "Toxic Confessions Plus",
      is_current: true
    }
  ]
};

async function makeAPICall(endpoint: string, method: string = "GET", data?: any) {
  const url = `${BASE_URL}${endpoint}`;
  
  console.log(`📡 ${method} ${endpoint}`);
  
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    }
  };

  if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Success`);
    return result;
  } catch (error) {
    console.error(`❌ Error:`, error);
    throw error;
  }
}

async function setupRevenueCat() {
  console.log("🚀 Setting up RevenueCat via REST API");
  console.log("========================================\n");

  if (!API_KEY) {
    console.error("❌ Error: REVENUECAT_MCP_API_KEY not found in .env.mcp");
    process.exit(1);
  }

  try {
    // 1. List projects to find the correct project ID
    console.log("📋 Step 1: Listing available projects...");
    const projectsList = await makeAPICall("/projects");
    console.log(`   Found ${projectsList.length} projects:`);
    projectsList.forEach((proj: any) => {
      console.log(`   - ${proj.name} (ID: ${proj.id})`);
    });

    // Find project by name or use the first one
    let project = projectsList.find((proj: any) => 
      proj.name.toLowerCase().includes("toxic") || 
      proj.name.toLowerCase().includes("confessions") ||
      proj.name.toLowerCase().includes("supasecret")
    );
    
    if (!project && projectsList.length > 0) {
      project = projectsList[0]; // Use first project if no match
      console.log(`   Using first available project: ${project.name}`);
    }
    
    if (!project) {
      throw new Error("No projects found. Please create a project in RevenueCat dashboard first.");
    }

    console.log(`   Selected project: ${project.name} (ID: ${project.id})\n`);
    CONFIG.project_id = project.id; // Update the project ID

    // 2. List existing apps
    console.log("📱 Step 2: Checking existing apps...");
    const apps = await makeAPICall(`/projects/${CONFIG.project_id}/apps`);
    console.log(`   Found ${apps.length} existing apps\n`);

    // 3. Create iOS app if needed
    console.log("📱 Step 3: Setting up iOS app...");
    let iosApp = apps.find((app: any) => app.type === "ios");
    if (!iosApp) {
      iosApp = await makeAPICall(`/projects/${CONFIG.project_id}/apps`, "POST", {
        name: `${CONFIG.app.name} iOS`,
        type: "app_store",
        bundle_id: CONFIG.app.bundleId
      });
      console.log(`   ✅ iOS app created: ${iosApp.id}`);
    } else {
      console.log(`   ✅ iOS app exists: ${iosApp.id}`);
    }

    // 4. Create Android app if needed  
    console.log("📱 Step 4: Setting up Android app...");
    let androidApp = apps.find((app: any) => app.type === "android");
    if (!androidApp) {
      androidApp = await makeAPICall(`/projects/${CONFIG.project_id}/apps`, "POST", {
        name: `${CONFIG.app.name} Android`,
        type: "play_store", 
        package_name: CONFIG.app.packageName
      });
      console.log(`   ✅ Android app created: ${androidApp.id}`);
    } else {
      console.log(`   ✅ Android app exists: ${androidApp.id}`);
    }

    // 5. Create entitlements
    console.log("\n🎯 Step 5: Creating entitlements...");
    const entitlements = await makeAPICall(`/projects/${CONFIG.project_id}/entitlements`);
    
    for (const entConfig of CONFIG.entitlements) {
      const exists = entitlements.find((ent: any) => ent.lookup_key === entConfig.lookup_key);
      if (!exists) {
        const entitlement = await makeAPICall(`/projects/${CONFIG.project_id}/entitlements`, "POST", {
          lookup_key: entConfig.lookup_key,
          display_name: entConfig.display_name
        });
        console.log(`   ✅ Entitlement created: ${entitlement.lookup_key}`);
      } else {
        console.log(`   ✅ Entitlement exists: ${exists.lookup_key}`);
      }
    }

    // 6. Create products
    console.log("\n🛍️ Step 6: Creating products...");
    const products = await makeAPICall(`/projects/${CONFIG.project_id}/products`);
    
    for (const prodConfig of CONFIG.products) {
      const exists = products.find((prod: any) => prod.store_identifier === prodConfig.store_identifier);
      if (!exists) {
        // Create for iOS
        const iosProduct = await makeAPICall(`/projects/${CONFIG.project_id}/products`, "POST", {
          store_identifier: prodConfig.store_identifier,
          type: prodConfig.type,
          app_id: iosApp.id,
          display_name: prodConfig.display_name
        });
        console.log(`   ✅ iOS product created: ${iosProduct.store_identifier}`);
        
        // Create for Android
        const androidProduct = await makeAPICall(`/projects/${CONFIG.project_id}/products`, "POST", {
          store_identifier: prodConfig.store_identifier,
          type: prodConfig.type,
          app_id: androidApp.id,
          display_name: prodConfig.display_name
        });
        console.log(`   ✅ Android product created: ${androidProduct.store_identifier}`);
      } else {
        console.log(`   ✅ Product exists: ${exists.store_identifier}`);
      }
    }

    // 7. Attach products to entitlements
    console.log("\n🔗 Step 7: Linking products to entitlements...");
    const updatedProducts = await makeAPICall(`/projects/${CONFIG.project_id}/products`);
    const updatedEntitlements = await makeAPICall(`/projects/${CONFIG.project_id}/entitlements`);
    
    const entitlement = updatedEntitlements.find((ent: any) => ent.lookup_key === "supasecret_plus");
    if (entitlement) {
      const productIds = updatedProducts
        .filter((prod: any) => ["supasecret_plus_monthly", "supasecret_plus_annual"].includes(prod.store_identifier))
        .map((prod: any) => prod.id);
      
      if (productIds.length > 0) {
        await makeAPICall(`/projects/${CONFIG.project_id}/entitlements/${entitlement.id}/attach`, "POST", {
          product_ids: productIds
        });
        console.log(`   ✅ Products attached to entitlement: ${productIds.length} products`);
      }
    }

    // 8. Create offerings
    console.log("\n🎁 Step 8: Creating offerings...");
    const offerings = await makeAPICall(`/projects/${CONFIG.project_id}/offerings`);
    
    for (const offerConfig of CONFIG.offerings) {
      const exists = offerings.find((offer: any) => offer.lookup_key === offerConfig.lookup_key);
      if (!exists) {
        const offering = await makeAPICall(`/projects/${CONFIG.project_id}/offerings`, "POST", {
          lookup_key: offerConfig.lookup_key,
          display_name: offerConfig.display_name,
          is_current: offerConfig.is_current
        });
        console.log(`   ✅ Offering created: ${offering.lookup_key}`);
        
        // 9. Create packages in offering
        console.log("\n📦 Step 9: Creating packages...");
        
        // Monthly package
        const monthlyProduct = updatedProducts.find((prod: any) => prod.store_identifier === "supasecret_plus_monthly");
        if (monthlyProduct) {
          await makeAPICall(`/projects/${CONFIG.project_id}/offerings/${offering.id}/packages`, "POST", {
            lookup_key: "$rc_monthly",
            display_name: "Monthly Subscription"
          });
          console.log(`   ✅ Monthly package created`);
          
          // Attach product to package
          const packages = await makeAPICall(`/projects/${CONFIG.project_id}/offerings/${offering.id}/packages`);
          const monthlyPackage = packages.find((pkg: any) => pkg.lookup_key === "$rc_monthly");
          if (monthlyPackage) {
            await makeAPICall(`/projects/${CONFIG.project_id}/packages/${monthlyPackage.id}/attach`, "POST", {
              products: [{
                product_id: monthlyProduct.id,
                eligibility_criteria: "all"
              }]
            });
            console.log(`   ✅ Monthly product attached to package`);
          }
        }
        
        // Annual package
        const annualProduct = updatedProducts.find((prod: any) => prod.store_identifier === "supasecret_plus_annual");
        if (annualProduct) {
          await makeAPICall(`/projects/${CONFIG.project_id}/offerings/${offering.id}/packages`, "POST", {
            lookup_key: "$rc_annual",
            display_name: "Annual Subscription"
          });
          console.log(`   ✅ Annual package created`);
          
          // Attach product to package
          const packages = await makeAPICall(`/projects/${CONFIG.project_id}/offerings/${offering.id}/packages`);
          const annualPackage = packages.find((pkg: any) => pkg.lookup_key === "$rc_annual");
          if (annualPackage) {
            await makeAPICall(`/projects/${CONFIG.project_id}/packages/${annualPackage.id}/attach`, "POST", {
              products: [{
                product_id: annualProduct.id,
                eligibility_criteria: "all"
              }]
            });
            console.log(`   ✅ Annual product attached to package`);
          }
        }
        
      } else {
        console.log(`   ✅ Offering exists: ${exists.lookup_key}`);
      }
    }

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      status: "success",
      project_id: CONFIG.project_id,
      setup_complete: true,
      message: "RevenueCat products and configuration created successfully via API"
    };

    await fs.writeFile(
      path.join(process.cwd(), "setup", "revenuecat-api-results.json"),
      JSON.stringify(results, null, 2)
    );

    console.log("\n🎉 SUCCESS! RevenueCat setup completed via API!");
    console.log("==============================================");
    console.log("✅ Apps: iOS + Android created");
    console.log("✅ Entitlements: supasecret_plus");
    console.log("✅ Products: Monthly + Annual subscriptions");
    console.log("✅ Offerings: Default offering with packages");
    console.log("✅ All products linked and ready!");
    console.log("\nCheck your RevenueCat dashboard - products should now be visible!");
    
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    
    const errorResults = {
      timestamp: new Date().toISOString(),
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error"
    };

    await fs.writeFile(
      path.join(process.cwd(), "setup", "revenuecat-api-results.json"),
      JSON.stringify(errorResults, null, 2)
    );
    
    process.exit(1);
  }
}

// Run the setup
setupRevenueCat().catch(console.error);
