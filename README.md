# Gold AI

Ask naturally. Learn intelligently.

Gold AI is a mobile-first assistant for learning, research, writing, and creating. The current implementation includes the Phase 1 branded UI, Phase 2 Firebase Authentication foundation, Phase 3 profiles, Phase 4 server-side AI foundation, Phase 5 chat, and Phase 6 credits.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Firebase setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the Firebase Web App values for the project.
3. Enable Email/Password in Firebase Authentication.
4. Create or select a Firebase Realtime Database.
5. Apply the ownership rules in `database.rules.json`.

The app validates Firebase configuration before initializing Auth or Realtime Database. Without `.env.local`, the UI remains available but authentication actions show a friendly configuration message.

Private environment files are ignored by Git. Never place real provider secrets in `.env.example` or source files.

## Routes

- `/` public Gold AI home
- `/login` email/password login
- `/signup` account creation
- `/reset-password` password reset request
- `/api/ai` authenticated AI service endpoint
- `/credits` authenticated balance, usage, and transaction summary
- `/chat`, `/study`, `/create`, `/profile` authenticated areas

## Checks

```bash
npm run lint
npm run build
```

## AI service

The `POST /api/ai` endpoint requires an authenticated Firebase ID token:

```text
Authorization: Bearer <Firebase ID token>
```

The JSON body accepts a non-empty `message` and an optional `language`. The server verifies the token, loads only useful profile context, routes through the configured OpenAI or Gemini provider, and returns normalized provider usage metadata. Provider keys remain server-side.

Set `AI_DEFAULT_PROVIDER`, `AI_FALLBACK_PROVIDER`, `OPENAI_MODEL`, and `GEMINI_MODEL` in `.env.local` when testing the AI service. Phase 6 also requires Firebase Admin server credentials (`FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY`) for trusted credit mutations. Phase 7 payment initiation requires server-only `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_BASE_URL`, and `PESAPAL_IPN_URL`. For local testing, set `PESAPAL_IPN_URL` to a public HTTPS ngrok URL ending in `/api/payments/pesapal/ipn`; for Vercel, use the deployed HTTPS domain. Never commit `.env.local` or provider secrets.
