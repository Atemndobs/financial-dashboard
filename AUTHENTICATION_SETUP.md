# Authentication Setup (Clerk)

This dashboard now uses Clerk for authentication.

## Required Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Optional redirects:

```env
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/signup
```

## What is configured

- `middleware.ts` protects all non-auth routes.
- `app/layout.tsx` wraps the app in `ClerkProvider`.
- `app/auth/login/page.tsx` uses Clerk `useSignIn`.
- `app/auth/signup/page.tsx` uses Clerk `useSignUp`.
- `components/user-menu.tsx` uses Clerk user/session hooks.

## Route behavior

- Signed-out users are redirected to `/auth/login`.
- Signed-in users visiting `/auth/*` are redirected to `/`.

## Notes

- If sign-up is not completing, verify your Clerk sign-up requirements (email verification, password policy, etc.).
- For production, set all Clerk environment variables in Vercel project settings.

