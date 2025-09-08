// Demo mode - no native imports for Expo Go
// import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export interface SubscriptionTier {
  id: string;
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
}

export class RevenueCatService {
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🎯 RevenueCat Demo Mode - Development build required for real subscriptions');
    this.isInitialized = true;
  }

  static async getOfferings(): Promise<any | null> {
    await this.initialize();
    console.log('🎯 Demo: Getting mock offerings');
    return null; // Demo mode
  }

  static async purchasePackage(packageToPurchase: any): Promise<any> {
    await this.initialize();
    console.log('🎯 Demo: Simulating purchase...');

    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('✅ Demo purchase completed successfully!');
        resolve({ mockCustomerInfo: true });
      }, 2000);
    });
  }

  static async restorePurchases(): Promise<any> {
    await this.initialize();
    console.log('🎯 Demo: Simulating restore purchases...');

    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('✅ Demo restore completed!');
        resolve({ mockCustomerInfo: true });
      }, 1500);
    });
  }

  static async getCustomerInfo(): Promise<any | null> {
    await this.initialize();
    console.log('🎯 Demo: Getting mock customer info');
    return { mockCustomerInfo: true };
  }

  static async isUserPremium(): Promise<boolean> {
    console.log('🎯 Demo: Checking premium status (always free in demo)');
    return false; // Always free in demo mode
  }

  private static async syncSubscriptionStatus(customerInfo: any): Promise<void> {
    console.log('🎯 Demo: Would sync subscription status to Supabase');
    // Demo mode - no actual sync
  }

  // Mock offerings for development
  static getMockOfferings(): SubscriptionTier[] {
    return [
      {
        id: 'monthly',
        name: 'Premium Monthly',
        price: '$4.99/month',
        features: [
          'No ads',
          'Unlimited video recordings',
          'Advanced voice effects',
          'Priority support'
        ]
      },
      {
        id: 'annual',
        name: 'Premium Annual',
        price: '$39.99/year',
        features: [
          'No ads',
          'Unlimited video recordings',
          'Advanced voice effects',
          'Priority support',
          'Save 33%'
        ],
        isPopular: true
      }
    ];
  }
}
