# SupaSecret 🤫

A modern, anonymous confession sharing app built with React Native, Expo, and Supabase. Share your secrets safely and anonymously with the world.

## ✨ Features

### 🎭 Anonymous Sharing
- **Text Confessions**: Share your thoughts anonymously with rich text support
- **Video Confessions**: Record and share video confessions with automatic transcription
- **Hashtag Support**: Organize and discover content with hashtags
- **Complete Anonymity**: No personal information required or stored

### 🎨 Modern UI/UX
- **Dark Theme**: Beautiful dark interface optimized for readability
- **Smooth Animations**: Fluid transitions and micro-interactions
- **Responsive Design**: Optimized for all screen sizes
- **Accessibility First**: Full screen reader support and keyboard navigation

### 🚀 Performance
- **Optimized Rendering**: Efficient list virtualization with FlashList
- **Smart Caching**: Intelligent video and data caching with LRU eviction
- **Debounced Interactions**: Smooth user experience with debounced inputs
- **Memory Management**: Automatic cleanup and memory optimization

### 🔒 Privacy & Security
- **End-to-End Anonymity**: No tracking or personal data collection
- **Secure Backend**: Supabase with Row Level Security (RLS)
- **Content Moderation**: Community-driven reporting system
- **Data Protection**: Encrypted storage and secure API communication

### 📱 Platform Features
- **Cross-Platform**: iOS and Android support
- **Offline Support**: View cached content without internet
- **Push Notifications**: Stay updated with community interactions
- **Haptic Feedback**: Enhanced tactile experience on supported devices

## 🛠️ Tech Stack

### Frontend
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and build tools
- **TypeScript** - Type-safe JavaScript
- **NativeWind** - Tailwind CSS for React Native
- **Zustand** - Lightweight state management
- **React Navigation** - Navigation library
- **Reanimated 3** - High-performance animations

### Backend
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Row Level Security** - Database-level security
- **Real-time Subscriptions** - Live data updates
- **Edge Functions** - Serverless functions

### Media & Storage
- **Expo AV** - Video recording and playback
- **Expo FileSystem** - Local file management
- **Supabase Storage** - Cloud file storage
- **FFmpeg** - Video processing and thumbnails

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Flipper** - Debugging and profiling
- **Expo Dev Tools** - Development utilities

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/supasecret.git
   cd supasecret
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app

### Database Setup

1. **Create a new Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy your project URL and anon key

2. **Run database migrations**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Push database schema
   supabase db push
   ```

3. **Set up Row Level Security**
   - Enable RLS on all tables
   - Configure policies for anonymous access
   - Set up storage bucket policies

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AnimatedModal.tsx
│   ├── AuthButton.tsx
│   ├── CharacterCounter.tsx
│   ├── ErrorBoundary.tsx
│   └── ...
├── navigation/          # Navigation configuration
│   └── AppNavigator.tsx
├── screens/            # Screen components
│   ├── HomeScreen.tsx
│   ├── CreateConfessionScreen.tsx
│   ├── TrendingScreen.tsx
│   └── ...
├── state/              # State management
│   ├── authStore.ts
│   ├── confessionStore.ts
│   ├── notificationStore.ts
│   └── ...
├── types/              # TypeScript type definitions
│   ├── confession.ts
│   ├── notification.ts
│   └── ...
├── utils/              # Utility functions
│   ├── accessibility.ts
│   ├── debounce.ts
│   ├── keyboardUtils.ts
│   ├── validation.ts
│   └── ...
└── lib/                # External service configurations
    └── supabase.ts
```

## 🎯 Key Features Implementation

### Anonymous Confessions
- No user authentication required for posting
- UUID-based identification for interactions
- Automatic content moderation and filtering

### Video Processing
- Real-time video recording with Expo AV
- Automatic thumbnail generation
- Speech-to-text transcription for accessibility
- Efficient video compression and storage

### Real-time Updates
- Live confession feed with Supabase subscriptions
- Real-time like counts and interactions
- Push notifications for engagement

### Performance Optimization
- Virtual scrolling with FlashList
- Image and video caching with LRU eviction
- Debounced user inputs and API calls
- Memory leak prevention and cleanup

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
- **Unit Tests**: Component and utility function tests
- **Integration Tests**: Store and API integration tests
- **E2E Tests**: Full user flow testing with Detox
- **Performance Tests**: Memory and rendering performance

## 📱 Building for Production

### iOS Build
```bash
# Build for iOS
npx expo build:ios

# Or with EAS Build
eas build --platform ios
```

### Android Build
```bash
# Build for Android
npx expo build:android

# Or with EAS Build
eas build --platform android
```

### Environment Configuration
- **Development**: Local Supabase instance
- **Staging**: Staging Supabase project
- **Production**: Production Supabase project with CDN

## 🔧 Configuration

### App Configuration
- **app.json**: Expo configuration
- **metro.config.js**: Metro bundler configuration
- **tailwind.config.js**: NativeWind styling configuration

### Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL`: Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `EXPO_PUBLIC_ENVIRONMENT`: Environment (dev/staging/prod)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Use conventional commit messages
- Ensure accessibility compliance
- Test on both iOS and Android

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** - For the amazing backend platform
- **Expo** - For the excellent development experience
- **React Native Community** - For the incredible ecosystem
- **Contributors** - For making this project better

## 📞 Support

- **Documentation**: [docs.supasecret.app](https://docs.supasecret.app)
- **Issues**: [GitHub Issues](https://github.com/yourusername/supasecret/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/supasecret/discussions)
- **Email**: support@supasecret.app

---

Made with ❤️ by the SupaSecret team
