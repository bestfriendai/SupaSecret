import React from 'react';
import { View } from 'react-native';
import { BannerAdComponent } from './BannerAdComponent';
import { useSubscriptionStore } from '../../state/subscriptionStore';

interface FeedAdComponentProps {
  index: number;
  interval?: number;
}

export const FeedAdComponent: React.FC<FeedAdComponentProps> = ({ 
  index, 
  interval = 5 
}) => {
  const { isPremium } = useSubscriptionStore();

  if (isPremium) return null;
  
  // Show ad every 'interval' posts, with some randomization
  const adInterval = Math.floor(Math.random() * 2) + interval;
  if (index % adInterval !== 0 || index === 0) return null;

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
      />
    </View>
  );
};
