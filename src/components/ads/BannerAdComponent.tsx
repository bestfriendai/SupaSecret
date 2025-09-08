import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { useSubscriptionStore } from '../../state/subscriptionStore';
import { AdMobService } from '../../services/AdMobService';

interface BannerAdComponentProps {
  size?: 'banner' | 'large' | 'medium';
  style?: StyleProp<ViewStyle>;
  placement?: 'home-feed' | 'video-feed' | 'profile';
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({
  size = 'banner',
  style,
  placement = 'home-feed'
}) => {
  const { isPremium } = useSubscriptionStore();

  if (isPremium) return null;

  // Demo ad for Expo Go - real ads in development build
  const adHeight = size === 'large' ? 100 : size === 'medium' ? 250 : 50;

  return (
    <View style={[{
      alignItems: 'center',
      marginVertical: 10,
      backgroundColor: '#1a1a1a',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333',
      overflow: 'hidden'
    }, style]}>
      <Text style={{ fontSize: 10, color: '#666', marginBottom: 5, marginTop: 8 }}>
        Sponsored
      </Text>
      <View style={{
        width: '90%',
        height: adHeight,
        backgroundColor: '#2a2a2a',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
      }}>
        <Text style={{ fontSize: 16, color: '#4a9eff', marginBottom: 4 }}>
          📱 SupaSecret Premium
        </Text>
        <Text style={{ fontSize: 12, color: '#ccc', textAlign: 'center' }}>
          {AdMobService.isExpoGo()
            ? 'Demo Ad - Real ads in dev build'
            : 'Upgrade for ad-free experience'
          }
        </Text>
      </View>
    </View>
  );
};
