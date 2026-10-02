# Stitch implementation

The client was repaired using eight saved exports from approved Stitch project 11869193744324078484. The HTML references, screen identities and source hashes are cached in `.loom-design`. The original client source was backed up in `.loom-backups` before replacement.

Routes: `/jobs`, `/jobs/:jobId`, `/technical-gaps`, `/recommendations`. These implement the desktop/mobile Job Search, Job Details, Technical Gap Analysis and Learning Roadmap designs using React, shared components and responsive CSS. CareerPath branding, palette, typography and layout structure come from the approved references.

Run from this directory:

```powershell
npm install
npm start
```

Open the Vite URL printed in your terminal. `npm test` runs the finite client tests and `npm run build` creates the production bundle.

The UI displays explicitly labeled sample candidate, job and course data from the design when the live API is unavailable. Search, gap analysis and recommendation API integrations remain connected; sample scores are not real model results. Preview applications do not submit job applications. Saved jobs and learning completion are local session state.

Browser checks covered desktop and 390px mobile rendering and navigation, filter/reset behavior, and the detail/roadmap screens. This is a manual visual review, not an automated pixel-equality score. The general pipeline's design reviewer is a source-level model review, followed by structural coverage checks and build/test validation; those checks alone cannot prove visual fidelity.
