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

## Application Authentication

The app owns authentication. Email/password accounts are stored in the Neon
Postgres `users` table with Node `scrypt` password hashes. Successful sign-in
creates a random opaque session token; only its SHA-256 hash is stored in
`auth_sessions`, while the browser receives an `HttpOnly`, `SameSite=Lax`
cookie. Neon Managed Auth is not enabled or used.

On startup, the server creates or migrates the `users`, `auth_sessions`, and
`password_reset_tokens` tables. Existing Neon Auth users do not have
transferable passwords or session cookies, so they can use the reset flow to
set an app password after this cutover. Existing profile/question/test data is
not deleted.

Set `AUTH_ADMIN_EMAILS` to a comma-separated list of trusted email addresses
before signup when those accounts should receive the admin role. Keep this
variable server-side. Password-reset emails use the Resend HTTP API. Configure
`RESEND_API_KEY`, `AUTH_EMAIL_FROM`, and `APP_URL`; the sender domain must be
verified in Resend. The reset token is one-time and expires after one hour.

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

For Vercel, configure `DATABASE_URL`, `AUTH_ADMIN_EMAILS`, `RESEND_API_KEY`,
`AUTH_EMAIL_FROM`, `APP_URL`, and `GEMINI_API_KEY` in the project environment
settings. The repository includes
a catch-all API function under `api/[...path].ts` for the protected routes.

Note: this repository is currently a Vite React SPA with an Express API. The
authentication boundary is app-owned and framework-independent; converting the
whole UI to Next.js would be a separate migration.
