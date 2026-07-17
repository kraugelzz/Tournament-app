# Boardgame Tournament

เว็บจัดการแข่งขันหมากกระดาน 7 หมวด (หมากรุกไทย, หมากรุกสากล, หมากล้อม, หมากฮอส, ครอสเวิร์ด, เอแมท, บอร์ดเกม).

## Setup
1. `npm install`
2. Create a Firebase project, enable Firestore.
3. Copy `.env.example` to `.env.local` and paste your Firebase web config.
4. `npm run dev`

## Test
`npm test`

## Deploy
1. `npm run build`
2. `firebase deploy` (deploys hosting + firestore rules)

## Phase 2 (not yet built)
Swiss and knockout pairing formats.
