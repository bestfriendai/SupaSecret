# Environment Variable Security Guide

Security Overview
- All EXPO_PUBLIC_ variables are embedded in the app bundle and can be extracted
- Never store sensitive secrets in environment variables that go to the client
- Use backend proxies for sensitive API operations
- Implement proper validation and fallback mechanisms

Current Environment Variable Analysis

✅ Safe for Client-Side (Current Usage)
- EXPO_PUBLIC_SUPABASE_URL: Public Supabase endpoint (safe)
- EXPO_PUBLIC_SUPABASE_ANON_KEY: Anonymous key with RLS policies (safe)
- EXPO_PUBLIC_PROJECT_ID: Expo project ID (safe)
- EXPO_PUBLIC_ADMOB_*: AdMob IDs and app IDs (safe, meant to be public)
- EXPO_PUBLIC_FIREBASE_*: Firebase client configuration (safe)

⚠️ Requires Careful Handling
- EXPO_PUBLIC_OPENAI_API_KEY: API key with usage limits (consider backend proxy)
- EXPO_PUBLIC_ANTHROPIC_API_KEY: API key with billing implications (consider backend proxy)
- EXPO_PUBLIC_GROK_API_KEY: Third-party API key (consider backend proxy)
- EXPO_PUBLIC_REVENUECAT_*: RevenueCat keys (generally safe but monitor usage)

❌ Never Include in Client
- Database service role keys
- Private API keys with admin access
- Payment processor secret keys
- Server-to-server authentication tokens
- Encryption keys for sensitive data

Security Best Practices

1. Environment Variable Classification
- Public: Safe to embed in app bundle (URLs, public IDs)
- Limited: API keys with rate limits and usage monitoring
- Private: Must never be in client code (use backend proxy)

2. Backend Proxy Pattern
- Create serverless functions for AI API calls
- Proxy payment processing through your backend
- Handle sensitive data processing server-side
- Return only safe, processed results to the client

3. API Key Rotation Strategy
- Use environment-specific keys (dev, staging, production)
- Implement key rotation without app updates
- Monitor API key usage and set up alerts
- Have emergency key revocation procedures

4. Validation and Monitoring
- Validate all environment variables at app startup
- Monitor API usage and detect anomalies
- Implement rate limiting on the client side
- Log security-relevant events

5. Development vs Production
- Development: Use test/sandbox keys, allow more permissive access
- Production: Use production keys, implement strict validation
- Staging: Mirror production security but with test data

Implementation Recommendations

Immediate Security Improvements
1. Add Environment Variable Validation
   - Implement startup validation for all required variables
   - Add format validation (URL format, key patterns)
   - Fail fast in production if critical variables are missing

2. Implement API Key Monitoring
   - Add usage tracking for all API keys
   - Implement client-side rate limiting
   - Add error handling for API key issues

3. Secure Supabase Configuration
   - Verify RLS policies are properly configured
   - Ensure anon key has minimal required permissions
   - Implement proper session management

4. Add Security Headers and Validation
   - Validate all API responses
   - Implement proper error handling
   - Add request/response logging for debugging

Backend Proxy Implementation

1. Create Serverless Functions
- Implement Edge Functions in Supabase, or use Vercel/Netlify/AWS Lambda

2. Proxy Pattern Example
- Client sends request to your backend endpoint
- Backend validates request and user permissions
- Backend calls third-party API with server-stored secret
- Backend returns processed, safe response to client

3. Authentication and Authorization
- Verify user authentication before proxy calls
- Implement rate limiting per user
- Add usage quotas and billing integration

Environment Variable Management

EAS Secrets Management
- Use EAS secrets for sensitive build-time variables
- Keep client-side variables in environment profiles
- Document which variables are build-time vs runtime
- Implement proper secret rotation procedures

Local Development Security
- Use .env.local for local development (gitignored)
- Provide .env.example with placeholder values
- Document required variables and their purposes
- Use different keys for development and production

Security Monitoring

API Usage Monitoring
- Monitor all third-party API usage
- Set up alerts for unusual usage patterns
- Implement automatic key rotation on breach detection
- Track API costs and usage quotas

Client-Side Security
- Implement proper error handling to avoid information leakage
- Add request/response validation
- Implement timeout and retry logic
- Add security event logging

Incident Response
- Have procedures for API key compromise
- Implement emergency key revocation
- Plan for service degradation scenarios
- Document recovery procedures

Compliance Considerations
- Ensure GDPR compliance for EU users
- Implement proper data retention policies
- Add user consent management
- Document data processing and storage practices

