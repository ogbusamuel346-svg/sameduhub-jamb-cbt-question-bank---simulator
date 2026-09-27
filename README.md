<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5c3a7481-a91d-45df-bf0a-6695936a27be

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Neon Authentication

Authentication is handled by Neon Managed Auth. The app uses Neon Auth for
email/password sign-up, sign-in, session restoration, sign-out, and password
reset; candidate details are stored in the Neon `users` profile table using
the Neon Auth user id.

1. Deploy the existing `auth: true` declaration in `neon.ts` with the Neon CLI.
2. Pull the linked branch environment with `neon env pull`. The Vite config
   automatically exposes `NEON_AUTH_BASE_URL` to the browser as
   `VITE_NEON_AUTH_URL`; setting the Vite variable explicitly is also supported.
3. Add the production origin to Neon Auth's trusted domains with
   `neon neon-auth domain add https://your-domain.example`.
4. Keep `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_JWKS_URL` server-side.

Do not put a database password in browser code or commit it to `.env.example`.

## Admin Question Generator

Admins can open **Question Bank → AI Generator** to choose a JAMB subject,
syllabus topic, difficulty, and 1–50 questions. Generation uses the
server-side `GEMINI_API_KEY` and the JAMB IBASS syllabus reference at
https://ibass.jamb.gov.ng/.

Generated items are clearly labeled as AI practice drafts, are not official
JAMB questions, and remain out of Neon until an authenticated admin reviews,
edits, and approves them. Approved questions are stored in the Neon `questions`
table and organized by subject, topic, and difficulty.

For Vercel, configure `DATABASE_URL`, `NEON_AUTH_BASE_URL`,
`NEON_AUTH_JWKS_URL`, `VITE_NEON_AUTH_URL`, and `GEMINI_API_KEY` in the
project environment settings. The repository includes a catch-all API
function under `api/[...path].ts` for the protected Neon routes.
