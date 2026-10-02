# EcoStream Live — local workspace

Run from this directory:

```powershell
npm install
npm run dev
```

Open the localhost address printed by Vite. The same server serves the app and /api routes; no separate API command is needed. Use Overview → Add waste record. Reports supports filtering, pagination, details, deletion and CSV/JSON export. Settings are saved to data/ecostream.json along with records. Back up this file to preserve your data.

Checks: npm test and npm run build. npm exec vite preview also serves the local API.

This is a local development implementation. Cloud telemetry, notifications, organization authentication, MFA, digital signatures and regulatory certification are not connected. Empty datasets are shown honestly; no sample records or emissions calculations are fabricated. Do not expose this development server publicly.

