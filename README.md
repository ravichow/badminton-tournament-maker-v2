# Badminton Tournament Maker v2 🏸

A fast, responsive, and resilient badminton doubles tournament manager deployed on **Cloudflare Pages** and powered by **Cloudflare D1** serverless SQLite database.

**Live Application**: [https://badminton-tournament-maker.pages.dev](https://badminton-tournament-maker.pages.dev)

---

## ✨ Features

- **Cloudflare D1 Integration**: Lightning-fast, zero-maintenance serverless SQLite storage replacing Firebase.
- **Offline-First Resilience**: Fully functional without internet connection via graceful `localStorage` caching.
- **Active Conflict Gate**: Automatically detects in-progress tournaments and guides the organizer to close or delete before creating new ones.
- **Interactive QR Code & Sharing**: Direct `?t=<tournament-id>` link sharing for spectators and court tablets.
- **Dynamic 2-Court Balancing**: Simultaneous dispatching across Court 1 and Court 2 without player overlaps or conflicts.
- **Tournament Formats**: Group stages with automatic tiebreaks, single-elimination playoffs (Grand Finale & 3rd Place Match).
- **Themes & Accessibility**: Warm Forest (Light) & Midnight Athletic (Dark), plus "Court Vision" high-contrast enlarged text mode for mobile and court-side screens.
- **Printable Glance Sheets & PDF Export**: Instant export of summary bracket sheets and debrief reports.

---

## 🛠 Tech Stack & Architecture

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Serverless API**: Cloudflare Pages Functions (`functions/api/tournaments.ts`, `functions/api/roster.ts`)
- **Database**: Cloudflare D1 SQLite (`badminton-tournament-maker-v2-db`)
- **Hosting & CI/CD**: Cloudflare Pages

---

## 🚀 Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ravichow/badminton-tournament-maker-v2.git
   cd badminton-tournament-maker-v2
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize local D1 database schema**:
   ```bash
   npm run d1:init:local
   ```

4. **Start Vite development server**:
   ```bash
   npm run dev
   ```

5. **Run test suite**:
   ```bash
   npm test
   ```

6. **Build for production**:
   ```bash
   npm run build
   ```

7. **Deploy to Cloudflare Pages**:
   ```bash
   npm run pages:deploy
   ```

---

## 📄 License

MIT
