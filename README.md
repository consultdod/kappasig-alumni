# Kappa Sigma Alumni Portal
**Kappa Sigma Fraternity Alumni — University of Louisiana at Lafayette**

A private member communication platform built with Next.js + Supabase + Vercel. Free to run.

---

## Phase 1 — What's included

- ✅ Login / Logout with session management
- ✅ Forgot password & reset password flows
- ✅ Admin-only invite system (sends Supabase invite emails)
- ✅ Member registration via invite link
- ✅ Full sidebar navigation (desktop + mobile drawer)
- ✅ Dashboard with stats, upcoming events, recent messages
- ✅ My Profile — name, phone, grad year, bio, privacy controls
- ✅ Email opt-in preferences (admin emails always delivered)
- ✅ Admin: Manage Members — activate/deactivate, promote/demote
- ✅ Admin: Send Invitations — single or bulk email invites
- ✅ Full Supabase schema with Row Level Security (RLS)

---

## Quick Setup (30 minutes)

### Step 1 — Create your Supabase project
1. Go to supabase.com > New Project
2. Name it kappasig-alumni, set a DB password, pick US East region

### Step 2 — Run the database schema
1. Supabase Dashboard > SQL Editor > New Query
2. Paste the contents of supabase/schema.sql and click Run

### Step 3 — Create storage buckets
Supabase Dashboard > Storage > New Bucket:
- photos (Private ON)
- documents (Private ON)
- avatars (Private OFF)

### Step 4 — Set environment variables
cp .env.example .env.local
Fill in with your Supabase + Resend credentials.

### Step 5 — Run locally
npm install
npm run dev

### Step 6 — Create your first admin
1. Supabase Dashboard > Auth > Users > Invite User (your email)
2. Click the link, register at /register
3. In SQL Editor: UPDATE public.members SET role = 'admin' WHERE email = 'your@email.com';

### Step 7 — Deploy to Vercel (free)
npx vercel

---

## Coming Next
- Phase 2: Messaging (broadcast + member-to-member)
- Phase 3: Events & RSVP
- Phase 4: Photos & File Library
- Phase 5: Member Directory & Polish
