# RainCheck — AI Agent Guide

Read [the reusable PWA Generation Playbook](docs/PWA_Generation_Playbook.md) before planning significant PWA, responsive layout, offline storage, Service Worker, deployment, or UX changes.

The playbook is **generic guidance**, not an instruction to rebuild RainCheck. For RainCheck-specific behavior, use [requirements](docs/requirements.md), [architecture](docs/architecture.md), [PWA documentation](docs/pwa.md), and [Apache/cPanel deployment](docs/hosting-cpanel.md).

## Project conventions

- Keep user-facing UI and technical documentation in **English** unless explicitly instructed otherwise.
- Preserve the one-primary-action UX, concise status, offline history, accessibility, and narrow-screen layout.
- Keep the centered **580px maximum-width** desktop layout and make all nested content shrink within the mobile viewport; avoid covering width bugs with `overflow-x: hidden`.
- Never treat locally saved forecasts as live data. Opening a recent-history item must not call external APIs.
- For PWA updates, protect cached offline startup and preserve browser `localStorage` data.
- Run the complete `npm run build` command for deployment packaging; plain `vite build` does not generate the complete precache manifest.
- When changing a feature, update its corresponding English documentation in the same work.
- **Do not run automated or visual tests unless the user explicitly asks for testing.** Clearly state what was changed and what remains unverified.
