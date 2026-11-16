# Workout Tracker

A personal Hevy-style workout tracker — React + Supabase + Vercel.  
Works as a PWA: add it to your phone's home screen for a native-app feel.

## Features

- Log workouts in real time (exercises, sets, weight, reps)
- 60+ built-in exercises across 9 muscle groups
- Workout history with volume stats
- Progress charts (max weight + volume per session)
- Exercise library browser
- Works offline mid-workout (saves to localStorage, commits to Supabase on finish)

## Setup (one-time, ~10 minutes)

### 1. Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. In the dashboard → **SQL Editor** → paste the contents of `supabase/schema.sql` → Run
4. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key

### 2. Local development

```bash
cd workout-tracker
cp .env.example .env
# edit .env and paste your Supabase URL + anon key
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 3. Deploy to Vercel (for phone access)

1. Push this folder to a GitHub repo
2. Import the repo at [vercel.com](https://vercel.com)
3. In the Vercel project → **Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Redeploy

You'll get a `https://your-app.vercel.app` URL you can open on your phone.

### 4. Add to phone home screen

- **iOS Safari**: Share → Add to Home Screen
- **Android Chrome**: Menu → Add to Home Screen

The app opens full-screen, no browser chrome.

## Updating the app

Deploy a new version any time — your data lives in Supabase and is never touched by a frontend redeploy.
