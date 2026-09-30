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
2. Set the `OPENROUTER_API_KEY` in [.env.local](.env.local) to your OpenRouter API key
3. Run the app:
   `npm run dev`

## Application Authentication

Supabase Auth owns email/password accounts, sessions, and password recovery.
The browser keeps the Supabase session and sends its access token to the API as
`Authorization: Bearer ...`. The API verifies that token with Supabase before
reading or writing the Neon-backed profile, question bank, or test history.

Neon still stores the application profile in `users`. On first authenticated
request, the API creates or links the Neon profile using the Supabase user ID;
existing profiles with the same email are linked without deleting their
question or test data.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel and in
your local environment. Add the production site URL (`https://sam-cbt.vercel.app`)
to Supabase Authentication → URL Configuration → Redirect URLs. Set
`AUTH_ADMIN_EMAILS` to a comma-separated list of trusted Supabase email
addresses before those accounts first sign in if they should receive the admin
role.

Do not put a database password in browser code or commit it to `.env.example`.

## Admin Question Generator

Admins can open **Question Bank → AI Generator** to choose a JAMB subject,
the full subject syllabus or one syllabus topic, a fixed or balanced difficulty,
and 1–60 questions. Whole-subject generation distributes the batch across all
configured syllabus topics. Generation uses the server-side `OPENROUTER_API_KEY`
and the JAMB IBASS syllabus reference at
https://ibass.jamb.gov.ng/.
To support small OpenRouter token limits, requests are generated in batches of
three questions with up to 1,200 output tokens per request; the admin screen
submits and tracks those batches until it reaches the requested set.

Generated items are clearly labeled as AI practice questions, are not official
JAMB questions, and are published automatically for candidate practice after
validation. Admins can still edit or remove them from the question bank. They
are organized by subject, topic, and difficulty.

For Vercel, configure `DATABASE_URL`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `AUTH_ADMIN_EMAILS`, and `OPENROUTER_API_KEY` in
the project environment settings. The repository includes
a catch-all API function under `api/[...path].ts` for the protected routes.

Note: this repository is currently a Vite React SPA with an Express API. The
authentication boundary is app-owned and framework-independent; converting the
whole UI to Next.js would be a separate migration.
