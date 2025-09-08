import React from 'react';
import { View } from 'react-native';
import { BannerAdComponent } from './BannerAdComponent';
import { useSubscriptionStore } from '../../state/subscriptionStore';

interface FeedAdComponentProps {
  index: number;
  interval?: number;
  placement?: 'home-feed' | 'video-feed' | 'profile';
}

export const FeedAdComponent: React.FC<FeedAdComponentProps> = ({
  index,
  interval = 5,
  placement = 'home-feed'
}) => {
  const { isPremium } = useSubscriptionStore();

  if (isPremium) return null;

  // Ensure interval is at least 1 to prevent division by zero
  const safeInterval = Math.max(1, interval);

  // Use deterministic offset based on index for stable ad placement
  const offset = index % safeInterval;
  if ((index - offset) % safeInterval !== 0 || index === 0) return null;

  return (
    <View style={{ 
      backgroundColor: '#f8f9fa', 
      marginVertical: 8,
      borderRadius: 12,
      padding: 16
    }}>
      <BannerAdComponent
        size="medium"
        style={{ marginVertical: 0 }}
        placement={placement}
      />
    </View>
  );
};
