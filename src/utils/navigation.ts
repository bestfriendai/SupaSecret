/**
 * Safe navigation utilities to prevent GO_BACK errors
 * Handles cases where there's no screen to go back to
 */

import { NavigationProp, CommonActions } from '@react-navigation/native';

/**
 * Safely go back or navigate to a fallback route
 * Prevents "GO_BACK action was not handled" errors
 */
export const safeGoBack = (
  navigation: NavigationProp<any>,
  fallbackRoute?: string,
  fallbackParams?: any
) => {
  // Check if we can go back
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else if (fallbackRoute) {
    // Navigate to fallback route
    navigation.navigate(fallbackRoute, fallbackParams);
  } else {
    // Default fallback to main tabs
    navigation.navigate('MainTabs');
  }
};

/**
 * Reset navigation stack to a specific route
 * Useful for auth flows or when you want to clear the stack
 */
export const resetToRoute = (
  navigation: NavigationProp<any>,
  routeName: string,
  params?: any
) => {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName, params }],
    })
  );
};

/**
 * Navigate and replace current screen
 * Useful when you don't want users to go back to the current screen
 */
export const navigateAndReplace = (
  navigation: NavigationProp<any>,
  routeName: string,
  params?: any
) => {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName, params }],
    })
  );
};

/**
 * Check if navigation can go back
 */
export const canGoBack = (navigation: NavigationProp<any>): boolean => {
  return navigation.canGoBack();
};

/**
 * Safe navigation for auth screens
 * Goes back if possible, otherwise goes to main tabs
 */
export const safeGoBackFromAuth = (navigation: NavigationProp<any>) => {
  safeGoBack(navigation, 'MainTabs');
};

/**
 * Safe navigation for modal screens
 * Goes back if possible, otherwise dismisses to main tabs
 */
export const safeGoBackFromModal = (navigation: NavigationProp<any>) => {
  safeGoBack(navigation, 'MainTabs');
};

/**
 * Safe navigation for detail screens
 * Goes back if possible, otherwise goes to home tab
 */
export const safeGoBackFromDetail = (navigation: NavigationProp<any>) => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    // Navigate to home tab specifically
    navigation.navigate('MainTabs', { screen: 'Home' });
  }
};

/**
 * Navigation helpers for specific app flows
 */
export const NavigationHelpers = {
  // Go to home tab
  goToHome: (navigation: NavigationProp<any>) => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  },

  // Go to videos tab
  goToVideos: (navigation: NavigationProp<any>) => {
    navigation.navigate('MainTabs', { screen: 'Videos' });
  },

  // Go to profile tab
  goToProfile: (navigation: NavigationProp<any>) => {
    navigation.navigate('MainTabs', { screen: 'Profile' });
  },

  // Go to create tab
  goToCreate: (navigation: NavigationProp<any>) => {
    navigation.navigate('MainTabs', { screen: 'Create' });
  },

  // Go to trending tab
  goToTrending: (navigation: NavigationProp<any>) => {
    navigation.navigate('MainTabs', { screen: 'Trending' });
  },

  // Navigate to secret detail
  goToSecretDetail: (navigation: NavigationProp<any>, confessionId: string) => {
    navigation.navigate('SecretDetail', { confessionId });
  },

  // Navigate to video player
  goToVideoPlayer: (navigation: NavigationProp<any>, confessionId: string) => {
    navigation.navigate('VideoPlayer', { confessionId });
  },

  // Navigate to saved screen
  goToSaved: (navigation: NavigationProp<any>) => {
    navigation.navigate('Saved');
  },

  // Navigate to video record
  goToVideoRecord: (navigation: NavigationProp<any>) => {
    navigation.navigate('VideoRecord');
  },

  // Navigate to paywall
  goToPaywall: (navigation: NavigationProp<any>, feature?: string, source?: string) => {
    navigation.navigate('Paywall', { feature, source });
  },
};

/**
 * Debug navigation state (development only)
 */
export const debugNavigationState = (navigation: NavigationProp<any>) => {
  if (__DEV__) {
    const state = navigation.getState();
    console.log('🧭 Navigation State:', {
      canGoBack: navigation.canGoBack(),
      routeNames: state?.routeNames,
      index: state?.index,
      routes: state?.routes?.map(route => ({ name: route.name, key: route.key })),
    });
  }
};
