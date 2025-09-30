/**
 * Subscription Management Screen
 * Screen for managing active subscriptions
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../hooks/useSubscription';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface ManagementOption {
  icon: IoniconsName;
  title: string;
  description: string;
  onPress: () => void;
  destructive?: boolean;
}

export function SubscriptionManagementScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    isPremium,
    subscriptionStatus,
    isLoading,
    checkSubscriptionStatus,
    refreshCustomerInfo,
    restorePurchases,
  } = useSubscription();

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  const handleManageSubscription = () => {
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';

    Linking.openURL(url).catch((err) => {
      console.error('Failed to open subscription management:', err);
      Alert.alert('Error', 'Unable to open subscription management.');
    });
  };

  const handleRestorePurchases = async () => {
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert(
          'Restore Complete',
          'Your purchases have been restored successfully.',
          [{ text: 'OK', onPress: () => refreshCustomerInfo() }]
        );
      }
    } catch (error) {
      console.error('Restore failed:', error);
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
    }
  };

  const handleContactSupport = () => {
    const email = 'support@supasecret.app';
    const subject = 'Subscription Support Request';
    const body = `User ID: ${subscriptionStatus?.productId || 'N/A'}\n\n`;

    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch((err) => {
      console.error('Failed to open email:', err);
      Alert.alert('Error', 'Unable to open email client.');
    });
  };

  const managementOptions: ManagementOption[] = [
    {
      icon: 'card-outline' as IoniconsName,
      title: 'Manage Subscription',
      description: 'Change plan, payment method, or cancel',
      onPress: handleManageSubscription,
    },
    {
      icon: 'refresh-outline' as IoniconsName,
      title: 'Restore Purchases',
      description: 'Recover subscriptions from previous purchases',
      onPress: handleRestorePurchases,
    },
    {
      icon: 'help-circle-outline' as IoniconsName,
      title: 'Contact Support',
      description: 'Get help with your subscription',
      onPress: handleContactSupport,
    },
  ];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = () => {
    if (!subscriptionStatus) return '#6B7280';
    switch (subscriptionStatus.status) {
      case 'active':
        return '#10B981';
      case 'trial':
        return '#3B82F6';
      case 'billing_issue':
        return '#F59E0B';
      case 'expired':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = () => {
    if (!subscriptionStatus) return 'Free';
    switch (subscriptionStatus.status) {
      case 'active':
        return 'Active';
      case 'trial':
        return 'Free Trial';
      case 'billing_issue':
        return 'Billing Issue';
      case 'expired':
        return 'Expired';
      default:
        return 'Free';
    }
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: '#9CA3AF', marginTop: 12 }}>Loading subscription...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 20,
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 32,
              height: 32,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>

          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 28,
              fontWeight: 'bold',
              marginBottom: 8,
            }}
          >
            Subscription
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: 16 }}>
            Manage your premium membership
          </Text>
        </View>

        {/* Subscription Status Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <View
            style={{
              backgroundColor: '#1F2937',
              borderRadius: 16,
              padding: 20,
              borderWidth: 2,
              borderColor: '#374151',
            }}
          >
            {/* Status Badge */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: getStatusColor(),
                  marginRight: 8,
                }}
              />
              <Text
                style={{
                  color: getStatusColor(),
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {getStatusText()}
              </Text>
            </View>

            {/* Tier */}
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 24,
                fontWeight: 'bold',
                marginBottom: 4,
              }}
            >
              {isPremium ? 'Premium' : 'Free'}
            </Text>

            {isPremium && subscriptionStatus ? (
              <>
                {/* Renewal Info */}
                <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 16 }}>
                  {subscriptionStatus.willRenew
                    ? `Renews on ${formatDate(subscriptionStatus.expiresAt)}`
                    : `Expires on ${formatDate(subscriptionStatus.expiresAt)}`}
                </Text>

                {/* Trial Badge */}
                {subscriptionStatus.inTrialPeriod && (
                  <View
                    style={{
                      backgroundColor: '#1E3A8A',
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ color: '#60A5FA', fontSize: 13, fontWeight: '500' }}>
                      🎉 You're in your free trial period
                    </Text>
                  </View>
                )}

                {/* Billing Issue Warning */}
                {subscriptionStatus.billingIssue && (
                  <View
                    style={{
                      backgroundColor: '#7C2D12',
                      borderRadius: 8,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ color: '#FCA5A5', fontSize: 13, fontWeight: '500' }}>
                      ⚠️ There's a billing issue with your subscription
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 16 }}>
                Upgrade to premium to unlock all features
              </Text>
            )}
          </View>
        </View>

        {/* Management Options */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          {managementOptions.map((option, index) => (
            <Pressable
              key={index}
              onPress={option.onPress}
              style={{
                backgroundColor: '#1F2937',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: option.destructive ? '#7F1D1D' : '#1E3A8A',
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                }}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={option.destructive ? '#FCA5A5' : '#60A5FA'}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: option.destructive ? '#FCA5A5' : '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '600',
                    marginBottom: 2,
                  }}
                >
                  {option.title}
                </Text>
                <Text style={{ color: '#9CA3AF', fontSize: 13 }}>
                  {option.description}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </Pressable>
          ))}
        </View>

        {/* Upgrade Button (for free users) */}
        {!isPremium && (
          <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
            <Pressable
              onPress={() => (navigation as any).navigate('Paywall')}
              style={{
                backgroundColor: '#3B82F6',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                Upgrade to Premium
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
