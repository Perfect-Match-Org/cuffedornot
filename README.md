# CuffedOrNot

Are you cuffed or not? We asked your Spotify and it told us everything.

CuffedOrNot is a Cornell University event where students paste their Receiptify URL, get roasted by an algorithm, and find out their relationship status based on nothing but music taste. Deployed at [cuffedornot.perfectmatch.ai](https://cuffedornot.perfectmatch.ai) as part of the [PerfectMatch](https://perfectmatch.ai) platform.

## Stack

- Next.js 14 (Pages Router) + TypeScript
- Tailwind CSS 3.4
- MongoDB + Mongoose
- next-auth v4 (Google OAuth, Cornell `.edu` only)
- Recharts

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll need the following in your `.env.local` (see `.env.example` for the full list):

```
MONGODB_URI
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL
```

## How It Works

1. Sign in with a Cornell `.edu` Google account.
2. Head over to [Receiptify](https://receiptify.herokuapp.com) and log in with Spotify. Once you're looking at your receipt, copy the URL from your browser.
3. Paste it in. We pull your top tracks and artists across short, medium, and long term — all server-side, your token never touches our logs.
4. The algorithm looks at things like your recent emotional vibe, how your mood has shifted over time, and whether your genre taste has been taking a concerning turn. You get a score from 0–100 and a verdict.
5. Optionally get matched with someone else who submitted. Matches are released after the event.

## Scoring

Your score is based on five signals derived from your Spotify audio features — valence, genre drift, mood shifts over time, and a couple other things. Higher score = more cuffed. The breakdown is intentionally opaque (it's more fun that way).

## Matching

After the event closes, matching runs locally via `scripts/run_matching.py`. It uses `scipy` to compute optimal 1-to-1 pairings and writes results back to MongoDB.

```bash
cd scripts
# Windows: setup.bat  |  Unix: ./setup.sh
python run_matching.py
```

## Development Notes

- Spotify's extended API access is locked down for new apps, so we route through Receiptify's token. This means all Spotify calls run server-side under Receiptify's OAuth client — be mindful of rate limits during peak traffic.
- The matching script requires Python + scipy and is intentionally not on Vercel. Run it locally after collecting submissions.
- Admin panel lives at `/admin` and is gated by a hardcoded email list in `config/admins.ts`.
