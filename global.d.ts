/**
 * Global TypeScript declarations
 */

// React Native global __DEV__ variable
declare const __DEV__: boolean;

declare module "react-native-worklets-core" {
  const WorkletsCore: any;
  export default WorkletsCore;
  export const Worklets: any;
}
