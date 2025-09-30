/**
 * Paywall Modal Component
 * Modal for displaying subscription options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../hooks/useSubscription';
import type { RevenueCatPackage } from '../types';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface Benefit {
  icon: IoniconsName;
  text: string;
}

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

const BENEFITS: Benefit[] = [
  { icon: 'ban-outline' as IoniconsName, text: 'Ad-free experience' },
  { icon: 'videocam-outline' as IoniconsName, text: 'Unlimited video recordings (5 min)' },
  { icon: 'diamond-outline' as IoniconsName, text: '4K video quality' },
  { icon: 'bookmark-outline' as IoniconsName, text: 'Unlimited saves' },
  { icon: 'filter-outline' as IoniconsName, text: 'Advanced filters' },
  { icon: 'flash-outline' as IoniconsName, text: 'Priority processing' },
  { icon: 'color-palette-outline' as IoniconsName, text: 'Custom themes' },
  { icon: 'rocket-outline' as IoniconsName, text: 'Early access to new features' },
];

export function PaywallModal({ visible, onClose, onPurchaseSuccess }: PaywallModalProps) {
  const {
    isLoading,
    error,
    purchaseSubscription,
    restorePurchases,
    clearError,
    getOfferings,
  } = useSubscription();

  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<RevenueCatPackage | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  // Load offerings when modal opens
  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, clearError]);

  const loadOfferings = async () => {
    setLoadingOfferings(true);
    try {
      const offerings = await getOfferings();
      if (offerings?.current) {
        const availablePackages = offerings.current.availablePackages || [];
        setPackages(availablePackages);

        // Auto-select annual (most popular) or first package
        const annualPackage = availablePackages.find(
          (pkg) => pkg.packageType === 'ANNUAL' || pkg.identifier.includes('annual')
        );
        setSelectedPackage(annualPackage || availablePackages[0] || null);
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
    } finally {
      setLoadingOfferings(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('No Package Selected', 'Please select a subscription plan.');
      return;
    }

    try {
      const success = await purchaseSubscription(selectedPackage);
      if (success) {
        onPurchaseSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const handleRestore = async () => {
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert(
          'Restore Complete',
          'Your purchases have been restored successfully.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  const isAnnual = (pkg: RevenueCatPackage) =>
    pkg.packageType === 'ANNUAL' || pkg.identifier.includes('annual');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: '#1F2937',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 24,
            paddingBottom: 40,
            paddingHorizontal: 24,
            maxHeight: '90%',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' }}>
                Unlock Premium
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                Get access to all premium features
              </Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Benefits */}
            <View style={{ marginBottom: 32 }}>
              <Text
                style={{
                  color: '#F3F4F6',
                  fontSize: 18,
                  fontWeight: '600',
                  marginBottom: 16,
                }}
              >
                Premium Features
              </Text>

              {BENEFITS.map((benefit, index) => (
                <View
                  key={index}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                >
                  <View
                    style={{
                      backgroundColor: '#10B981',
                      borderRadius: 12,
                      padding: 8,
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name={benefit.icon} size={16} color="#FFFFFF" />
                  </View>
                  <Text style={{ color: '#F3F4F6', fontSize: 16, flex: 1 }}>
                    {benefit.text}
                  </Text>
                </View>
              ))}
            </View>

            {/* Pricing Plans */}
            {loadingOfferings ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={{ color: '#9CA3AF', marginTop: 12 }}>Loading plans...</Text>
              </View>
            ) : packages.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', marginTop: 12, textAlign: 'center' }}>
                  No subscription plans available.{'\n'}Please try again later.
                </Text>
              </View>
            ) : (
              <View style={{ marginBottom: 24 }}>
                {packages.map((pkg) => {
                  const isSelected = selectedPackage?.identifier === pkg.identifier;
                  const annual = isAnnual(pkg);

                  return (
                    <Pressable
                      key={pkg.identifier}
                      onPress={() => setSelectedPackage(pkg)}
                      style={{
                        backgroundColor: isSelected ? '#1D4ED8' : '#374151',
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 12,
                        borderWidth: 2,
                        borderColor: isSelected ? '#3B82F6' : 'transparent',
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginBottom: 4,
                            }}
                          >
                            <Text
                              style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}
                            >
                              {pkg.product.title}
                            </Text>
                            {annual && (
                              <View
                                style={{
                                  backgroundColor: '#F59E0B',
                                  borderRadius: 8,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  marginLeft: 8,
                                }}
                              >
                                <Text
                                  style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}
                                >
                                  POPULAR
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: '#9CA3AF', fontSize: 16 }}>
                            {pkg.product.priceString}
                          </Text>
                          {annual && (
                            <Text style={{ color: '#10B981', fontSize: 12, marginTop: 2 }}>
                              Save 50% vs monthly
                            </Text>
                          )}
                        </View>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: isSelected ? '#3B82F6' : '#6B7280',
                            backgroundColor: isSelected ? '#3B82F6' : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && (
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: '#FFFFFF',
                              }}
                            />
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Error Message */}
            {error && (
              <View
                style={{
                  backgroundColor: '#DC2626',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, textAlign: 'center' }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Purchase Button */}
            <Pressable
              onPress={handlePurchase}
              disabled={isLoading || !selectedPackage || packages.length === 0}
              style={{
                backgroundColor:
                  isLoading || !selectedPackage || packages.length === 0
                    ? '#6B7280'
                    : '#10B981',
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 18,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  Start Free Trial
                </Text>
              )}
            </Pressable>

            {/* Restore Button */}
            <Pressable
              onPress={handleRestore}
              disabled={isLoading}
              style={{ padding: 12 }}
            >
              <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center' }}>
                Restore Purchases
              </Text>
            </Pressable>

            {/* Terms */}
            <Text
              style={{
                color: '#6B7280',
                fontSize: 11,
                textAlign: 'center',
                lineHeight: 16,
                marginTop: 8,
              }}
            >
              7-day free trial, then auto-renews. Cancel anytime.{'\n'}
              Subscription automatically renews unless cancelled 24 hours before the end of
              the current period.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
