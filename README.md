
# ⚡ VoltStore — Vercel-ready (Free tier)
This build is ready for **Vercel Hobby** (free). Sessions use cookies (works on serverless).

## Deploy on Vercel
1. Create a new GitHub repo and push this folder, or import the ZIP directly in Vercel.
2. In Vercel dashboard → **Add New Project** → import repo (or "Import Project" and upload).
3. **Environment Variables** (Project Settings → Environment Variables):
   - `STRIPE_SECRET_KEY` (live or test)
   - `SESSION_SECRET` (any strong random string)
   - `BASE_URL` (e.g. `https://your-project.vercel.app` after first deploy)
4. Deploy. Your app will be available at a free `vercel.app` URL.

**Note:** The filesystem on serverless is ephemeral. `data/orders.json` is fine for demos,
but for production use, store orders in a database (Vercel Postgres, Supabase, etc.).
