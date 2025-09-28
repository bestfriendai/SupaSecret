# Agent Guidelines for SupaSecret

## Build/Lint/Test Commands

- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run tests (if available)
- `npm start` - Start Expo development server
- `eas build --platform all --profile production` - Build for distribution

## Code Style Guidelines

- **Formatting**: Prettier with 120 width, 2-space tabs, double quotes
- **TypeScript**: Strict mode enabled, no implicit any/returns
- **Imports**: Use `@/*` aliases for src imports
- **Styling**: Tailwind CSS with NativeWind, dark mode class-based
- **Linting**: ESLint with Expo config, prettier integration
- **Components**: React Native with TypeScript, functional components preferred
- **State**: Zustand for state management, Supabase for backend
- **Error Handling**: Use proper TypeScript error types and try-catch blocks

## Distribution Build Notes

- Uses EAS Build with development, preview, and production profiles
- iOS: deployment target 15.1, supports tablets, bundle identifier com.toxic.confessions
- Android: min SDK 24, target SDK 35, package com.toxic.confessions
- New architecture enabled for both platforms
- Required permissions: Camera, microphone, storage, notifications
- Environment variables managed through EAS secrets for production builds

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase
