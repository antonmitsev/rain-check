# RainCheck — AI Agent Guide

Read [the reusable PWA Generation Playbook](docs/PWA_Generation_Playbook.md) and its [Reference Architecture](docs/playbook/appendix-c-reference-architecture.md), [Domain Specification](docs/playbook/appendix-d-domain-specification.md) and [UX/Icon System](docs/playbook/appendix-e-ux-design-system.md) before planning significant PWA, responsive layout, offline storage, Service Worker, deployment, or UX changes.

The playbook is **generic guidance**, not an instruction to rebuild RainCheck. For RainCheck-specific behavior, use [requirements](docs/requirements.md), [architecture](docs/architecture.md), [PWA documentation](docs/pwa.md), and [Apache/cPanel deployment](docs/hosting-cpanel.md).

## Project conventions

- Keep user-facing UI and technical documentation in **English** unless explicitly instructed otherwise.
- Preserve the one-primary-action UX, concise status, offline history, accessibility, and narrow-screen layout.
- Keep **580px max-width** in portrait/single-column layouts and **920px max-width** on wide landscape (minimum 740px), with search on the left and Check weather/results on the right; make all nested elements shrink to mobile width and avoid `overflow-x: hidden` workarounds.
- Preserve the dedicated **180×180 Apple touch icon** and ensure the icon generation script runs before every Vite build.
- Never treat locally saved forecasts as live data. Opening a recent-history item must not call external APIs.
- For PWA updates, protect cached offline startup and preserve browser `localStorage` data.
- Run the complete `npm run build` command for deployment packaging; plain `vite build` does not generate the complete precache manifest.
- When changing a feature, update its corresponding English documentation in the same work.
- **One task = one atomic commit on `main`**, including implementation, integration, documentation, and any requested related changes. Prepare all file changes before creating the commit; do not commit each file or phase separately. Make one descriptive commit title and a concise bullet-point body that covers completed work and verification.
- If a task requires history rewriting, explain the effect on published SHAs and existing clones first; never force-push or rewrite `main` without explicit permission for that specific operation.
- **Do not run automated or visual tests unless the user explicitly asks for testing.** Clearly state what was changed and what remains unverified.
