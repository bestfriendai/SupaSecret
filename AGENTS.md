# Agent Guidelines

## Commands

- `npm run lint` - Run ESLint (extends expo, prettier configs)
- `npm run typecheck` - Run TypeScript type checking with strict mode
- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS

## Code Style

- TypeScript strict mode enabled, extends expo/tsconfig.base
- ESLint: extends expo and prettier configs, prettier/prettier rule enforced
- Prettier: 120 width, 2-space tabs, double quotes (singleQuote: false)
- Import order: third-party, relative, absolute (import/first rule disabled)
- Use functional React components with hooks, Zustand for state management
- Style with Tailwind CSS via NativeWind, clsx for conditional classes
- Error handling: try/catch with proper logging patterns
- Naming: camelCase for variables/functions, PascalCase for components
