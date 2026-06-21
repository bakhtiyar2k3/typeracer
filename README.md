# TypeRacer

A real-time multiplayer typing race inspired by [Monkeytype](https://monkeytype.com).
**Timed, infinite-scroll word tests** (15/30/60s solo, fixed 30s races), live 1v1
races with dual interpolated carets ("you" / opponent labels), matchmaking, Elo
ratings, leaderboards, profiles and match history.

The race model matches Monkeytype: words scroll up smoothly within a fixed 3-line
window, the clock is fixed and the words are endless — whoever has the higher WPM
when time runs out wins.

- **Frontend:** React + Vite + TailwindCSS + Zustand + React Router + Socket.io client
- **Backend:** Node.js + Express + Socket.io + JWT auth
- **Database:** MongoDB (Mongoose)

---

## Project structure

```
typeracer/
├── shared/                 # constants + types used by BOTH client and server
│   ├── constants/          # socket events, game config, theme, word list + generator
│   └── types/              # JSDoc typedefs for socket payloads
├── server/
│   ├── config/             # env + db connection
│   ├── controllers/        # auth, user/profile, leaderboard
│   ├── models/             # User, Match (Mongoose)
│   ├── routes/             # REST routes
│   ├── middleware/         # auth, validation (zod), rate limit, error handler
│   ├── services/           # rating (Elo), stats, word generation
│   ├── socket/             # matchmaking queue, race manager, socket init
│   ├── utils/              # logger, jwt, ApiError, asyncHandler
│   └── scripts/            # seed (demo data), smoke (e2e test), serve-memory (run without Mongo)
└── client/
    └── src/
        ├── components/     # layout, typing engine UI, race UI, ui primitives
        ├── pages/          # Home, Race, Leaderboard, Profile, Login, Register
        ├── hooks/          # useTypingEngine, useRace, useIsMobile
        ├── store/          # Zustand auth store (persisted)
        ├── services/       # REST api client, config
        ├── socket/         # singleton socket.io connection
        └── utils/          # pure typing-engine math
```

---

## Prerequisites

- **Node.js 18+** (developed on v24)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`, or a MongoDB Atlas
  connection string. (No local Mongo? See *Verifying without MongoDB* below.)

---

## Setup & run

### 1. Backend

```bash
cd server
npm install
cp .env.example .env          # then edit MONGODB_URI / JWT_SECRET as needed
npm run dev                   # http://localhost:4000
```

Optional — populate demo users so the leaderboard isn't empty:

```bash
npm run seed                  # creates 6 demo accounts (password: password123)
```

### 2. Frontend

```bash
cd client
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api` to the backend, and the Socket.io client
connects to `http://localhost:4000` (override via `client/.env` → `VITE_SERVER_URL`).

### From the repo root (convenience)

```bash
npm run install:all
npm run dev:server            # terminal 1
npm run dev:client            # terminal 2
```

---

## Run with Docker (full stack)

The whole app — MongoDB, the API/socket server, and the nginx-served SPA — runs
with one command. Nothing to install except Docker.

```bash
cp .env.docker.example .env       # then set a strong JWT_SECRET
docker compose up --build         # builds images and starts everything
# open http://localhost:8080
```

- The **client** (nginx) is the only exposed port (`8080` by default) and reverse-
  proxies `/api` and `/socket.io` to the **server**, so the app lives behind a
  single origin — no host URLs are baked into the build.
- The **server** waits for Mongo to be healthy, runs with `NODE_ENV=production`
  (which requires a real `JWT_SECRET`), and connects to `mongodb://mongo:27017`.
- Mongo data persists in the `mongo-data` volume.

Common commands:

```bash
docker compose up --build -d      # run in the background
docker compose logs -f            # tail logs
docker compose down               # stop (add -v to also wipe the db volume)
```

To serve from a real domain, set `CLIENT_ORIGIN=https://your-domain` (and
`APP_PORT`) in `.env`, and put TLS in front (e.g. a proxy or `nginx` with certs).

---

## Playing

1. Open `http://localhost:5173` — start typing immediately for solo practice.
   Pick 15 / 30 / 60s; words scroll endlessly until the clock runs out.
2. Click **find match** → you're placed in the matchmaking queue.
3. Open a **second browser/incognito window** and click find match to be matched
   into the same room (both get the same word stream).
4. Watch the `3 · 2 · 1 · GO` countdown, then race for 30s. Both carets move live
   and smoothly with "you" / opponent labels; highest WPM at time-up wins, and
   results, placement and Elo points show at the end.
5. If your opponent closes/refreshes their tab, your race ends right away
   ("opponent left", no result) and you can immediately find a new match.

**Controls:** type to start · `Backspace` (only into a still-incorrect word) ·
`Ctrl+Backspace` deletes a whole word · `Tab` restarts (solo only).

**Sounds:** correct keystrokes (and backspace) play a hit sound, mistakes play
an error sound. Toggle them with the speaker icon in the navbar (preference is
saved). Audio is decoded once and played via Web Audio buffer sources, so it
stays smooth even at high typing speed.

> **Testing multiplayer alone?** Just open two tabs — each browser tab gets its
> own guest identity (guests persist per-tab via `sessionStorage`; registered
> logins persist across tabs via `localStorage`), so two tabs race each other.

No MongoDB installed? Run the backend on an in-memory Mongo instead:
`cd server && npm run dev:mem`.

> Ranked multiplayer is desktop/tablet only. On mobile the UI offers solo
> practice and hides the race flow (per MVP spec).

---

## How the spec maps to the code

| Feature | Where |
| --- | --- |
| Timed, infinite scrolling words (3-line window, smooth scroll) | `client/src/components/typing/TypingText.jsx`, `hooks/useTypingEngine.js`, `utils/typingEngine.js` |
| Random word stream (plain common words) | `shared/constants/words.js` (`generateWords`), server `services/wordService.js` |
| Solo 15/30/60s selector · fixed 30s races | `pages/HomePage.jsx` · `shared/constants/game.js` (`RACE_DURATION_MS`) |
| Dual live carets (you/opponent labels, 40ms relay, RAF interpolation) | `socket/raceManager.js` + `components/typing/TypingText.jsx` |
| Same word stream for both players | server generates once per room (`wordService.forRace`) |
| Winner = highest WPM at time-up | `services/statsService.js` (rank by correct chars) |
| Opponent leaves → race ends immediately, **no result saved** | `raceManager.#abortRoom` / `handleLeave` |
| Refresh/disconnect frees the opponent; never stuck waiting | `raceManager.abortIfInRoom` + `matchmaking.join` |
| Matchmaking queue + rooms + countdown | `server/socket/matchmaking.js`, `raceManager.js`, `hooks/useRace.js` |
| JWT auth + bcrypt + guest mode | `controllers/authController.js`, `middleware/auth.js`, `store/authStore.js` |
| Profiles, stats, match history (latest 20) | `controllers/userController.js`, `pages/ProfilePage.jsx` |
| Leaderboard (by rating, min 20 games) | `controllers/leaderboardController.js`, `pages/LeaderboardPage.jsx` |
| Elo rating (+20/−10, opponent-adjusted, start 1000) | `services/ratingService.js` |
| Memory cleanup (timers, rooms) | `raceManager` teardown + idle reaper |
| Input validation | `middleware/validate.js` + `validation/*` (zod) |
| Keystroke sounds (hit/error, Web Audio, mute toggle) | `services/sound.js`, `hooks/useTypingEngine.js`, `components/ui/SoundToggle.jsx` |

### A note on letter colors
The spec lists "correct = yellow". This implementation uses the **authentic
Monkeytype** scheme (correct = bright `#d1d0c5`, pending = gray, incorrect = red,
caret = accent yellow) because *"UI should closely replicate Monkeytype"* is the
stated top priority. To make correct letters yellow instead, change the
`CORRECT` entry in `stateClass` inside `client/src/components/typing/TypingText.jsx`
to `text-accent`.

---

## Verifying without MongoDB

The repo ships an end-to-end smoke test that boots an **in-memory MongoDB**, runs
the real server, and drives three two-player scenarios over real sockets: a normal
timed race (winner by WPM, Elo + persistence), an **aborted** race (opponent leaves
→ no result saved), and **recovery** (the freed player re-queues and matches again):

```bash
cd server
npm run smoke
```

Expected tail: `✅ SMOKE TEST PASSED`.

---

## Production build

```bash
cd client && npm run build       # outputs client/dist
cd server && npm start           # serve API + sockets; host dist behind any static server / CDN
```

Set real values for `JWT_SECRET`, `MONGODB_URI`, `CLIENT_ORIGIN` and
`NODE_ENV=production` in `server/.env`.
