# Appendix E — UX Design Tokens, Components and iOS Icon Contract

**Companion:** [Production PWA Generation Playbook](../PWA_Generation_Playbook.md)  
**Goal:** Convert subjective design advice into consistent, reproducible component and asset requirements. Tokens are defaults, **not** a brand to copy blindly.

## E.1 Design principles

**Compact inside. Spacious outside. One primary action. One clear answer.**

- Resolve the user's intended task, not their incidental wording or sample language.
- Prominent text = current state; secondary = next meaningful change; tertiary = metadata and history.
- Do not duplicate the result in an explanatory paragraph, metadata and toast.
- Hide empty panels; normal online operation should not consume space.
- Treat unknown, no-data, and an actual negative state as separate cases.
- A visual transition needs a real domain transition, not just decorative gradients.
- Touch targets, legibility, contrast and semantics outrank minimalism.

## E.2 Adjustable CSS tokens

~~~css
:root {
  --app-max-width: 580px;
  --page-gutter: 16px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  --radius-sm: 8px;
  --radius-control: 12px;
  --radius-card: 16px;
  --radius-pill: 999px;
  --min-control-height: 44px;
  --touch-target: 44px;

  --font-body: system-ui, -apple-system, sans-serif;
  --font-display: system-ui, -apple-system, sans-serif;
  --font-xs: 11px;
  --font-sm: 13px;
  --font-base: 16px;
  --font-heading: clamp(20px, 5vw, 34px);
  --font-result: clamp(28px, 7vw, 44px);

  --bg: #0b1627;
  --surface: #172b43;
  --surface-strong: #1d3855;
  --border: #395573;
  --text: #f1f5ff;
  --muted: #b9c9dc;
  --focus: #fcd174;

  --state-a: #14578e;
  --state-b: #f2c962;
  --state-unknown: #526a83;
  --warning: #edac5c;
  --error: #db7777;
  --success: #81d5ab;
}
~~~

Spacing guideline: **10–16px inside** action cards, **24–32px between sections**. Min-heights should be justified by content and touch accessibility, not blank decorative space.

## E.3 Responsive root-to-leaf sizing

~~~css
*, *::before, *::after { box-sizing: border-box; }
html, body, #app { width: 100%; max-width: 100%; min-width: 0; }
body { margin: 0; }
.shell {
  width: 100%;
  max-width: var(--app-max-width);
  min-width: 0;
  margin-inline: auto;
  padding: 24px var(--page-gutter) 32px;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}
.shell > :not(.toast) { width: 100%; max-width: 100%; min-width: 0; }
header, main, section, .card, .history-list { min-width: 0; max-width: 100%; }
.input-row { display: flex; gap: var(--space-2); min-width: 0; }
.input-row input { width: 0; flex: 1 1 0; min-width: 0; }
.input-row button { flex: 0 0 auto; }
.history-list { display: grid; grid-template-columns: minmax(0, 1fr); }
.long-label { min-width: 0; overflow-wrap: anywhere; }
.shell > footer { margin-top: auto; padding-top: var(--space-8); }
~~~

Do not camouflage width bugs with page-wide overflow clipping. Debug the complete ancestor chain. Shorten and group taglines if a final word becomes orphaned. A too-long one-line heading must wrap at narrow widths.

### Landscape composition

Portrait layout is centered at a deliberately narrow width, e.g. **max-width: 580px**. A sufficiently wide landscape viewport (e.g. at least **740px**) can use a **920px maximum** shell and a two-column layout: **location/search on the left**, **primary action and current result on the right**, recent history below. Small landscape viewports remain single-column.

~~~css
.workspace, .workspace__result { min-width: 0; max-width: 100%; }
@media (orientation: landscape) and (min-width: 740px) {
  .shell {
    max-width: 920px;
    padding-inline: max(18px, env(safe-area-inset-left))
                    max(18px, env(safe-area-inset-right));
  }
  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
    gap: 20px;
    align-items: stretch;
  }
  .workspace__result {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}
~~~

Keep source order intuitive, preserve actual touch targets, and allow natural vertical scrolling on short landscape screens. This is a **composition breakpoint**, not a universal requirement to use 740/920 for all products.

## E.4 Content hierarchy

| Level | Content | Treatment |
| --- | --- | --- |
| P0 | Primary user result | Large bold display text |
| P1 | Next meaningful transition/time | Linked to P0 within the same component |
| P2 | Approximation, time retrieved, cached provenance | One short muted line |
| P3 | History, contextual selections, settings | Below result, only if relevant |
| P4 | Attribution, creator, build metadata | Small footer/secondary content |

Example:

~~~text
RAINING    →    STOPS AT
                 17:00
APPROXIMATE · Fetched on 16 Oct, 14:30
~~~

Saved example: CACHED · APPROXIMATE · Fetched on 16 Oct, 14:30.

Do not put a repeated full provider sentence below this result. When no transition time is available, replace it with **TIME UNKNOWN**. When a valid forecast horizon contains no transition, display a separate **NO CHANGE EXPECTED** state.

**Grouped tagline pattern:**

~~~html
<div class="eyebrow">
  <span class="eyebrow-lead">AT A GLANCE</span>
  <span class="eyebrow-detail">| ONE CHECK · NO SIGN-UP</span>
</div>
~~~

~~~css
.eyebrow { display: flex; flex-wrap: wrap; gap: 2px 8px; }
.eyebrow-lead, .eyebrow-detail { white-space: nowrap; }
~~~

Individual groups must fit the smallest supported phone viewport. Shorten text or choose a compact variant rather than reducing font size indefinitely.

## E.5 Result visualization contract

| Data state | Background | UI example |
| --- | --- | --- |
| A → B at T | A→B gradient | ACTIVE → ENDS AT T |
| B → A at T | B→A gradient | IDLE → STARTS AT T |
| A, unknown next time | Solid A | ACTIVE → TIME UNKNOWN |
| B, valid no-change horizon | Solid B | IDLE → NO CHANGE EXPECTED |
| Unknown current | Neutral | UNKNOWN |
| Historical snapshot | Same domain styling + CACHED | Do not imply live data |

~~~css
.result {
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 14px;
}
.result[data-transition="a-to-b"] {
  background: linear-gradient(105deg, var(--state-a), var(--state-b));
}
.result[data-transition="b-to-a"] {
  background: linear-gradient(105deg, var(--state-b), var(--state-a));
}
.result[data-transition="unknown"] { background: var(--surface-strong); }
.result-phases {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: var(--space-2);
  align-items: center;
}
~~~

Apply phase-specific foreground contrast to dark and light ends of a gradient. Never place white copy over bright yellow without adjusting contrast.

## E.6 Component specifications

**Primary CTA:** One short label, no redundant explanatory line. Full width in a compact utility. Minimum touch height; disabled only while work truly cannot proceed. Check offline cache before showing a loading state.

**History card:** One card wrapper with **two sibling buttons**: open result and delete. Delete control inside upper-right corner, never detached outside the card. Keep a discreet visible X but give it a safe effective touch target (aim for **44×44px**); label it for assistive technology. Opening or deleting must never cause network requests. Hide the entire history section when empty. Truncate or wrap long text inside available width.

**Toast:** Fixed-position at safe-area aware screen top, slides down when appearing and left when closing. Cancel the prior entry's hide and exit timers when showing a new message. Respect reduced motion and ARIA live-region semantics. Avoid a permanent answer/status card.

**Connection:** Suppress normal ONLINE banner; show OFFLINE or origin-unreachable warning only when relevant. A browser online hint is not proof of a working data API. Offline history remains usable.

**Footer:** A full-height column with margin-top:auto places credits at the bottom of short screens but after long content. Never position the footer fixed over controls.

## E.7 PWA icon contract, especially iOS Safari

A PWA icon is a product asset, not an optional browser embellishment. If the icon fails to load on iOS, a Home Screen shortcut can appear as a **letter (for example, R)** rather than the intended artwork. A standard web manifest alone is not sufficient: provide an **explicit PNG Apple touch icon**.

| Asset | Dimensions / format | Purpose |
| --- | --- | --- |
| icons/apple-touch-icon.png | **180×180 PNG** | iPhone Safari Add to Home Screen |
| icons/icon-192.png | 192×192 PNG | Web manifest and Android |
| icons/icon-512.png | 512×512 PNG | Web manifest and Android |
| icons/favicon-32.png | 32×32 PNG | Browser tabs |
| Optional icons/icon-maskable-512.png | 512×512 PNG with safe-area artwork | Android adaptive icon |
| Editable master | SVG or equivalent | One source for all raster variants |

**Design constraints:** square, opaque background for Apple touch, high contrast, legible at icon scale, no tiny text or transparent corners. Let iOS mask the home-screen icon shape. Do not label icons maskable unless their meaningful artwork fits maskable safe bounds. Use purpose **any** for normal icons.

**HTML requirements:**

~~~html
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" sizes="32x32" type="image/png" href="./icons/favicon-32.png">
<link rel="icon" sizes="192x192" type="image/png" href="./icons/icon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Example App">
~~~

**Manifest:** include real 192/512 PNGs with type image/png and purpose any. Link paths must match build output, document root, and Service Worker precache.

**Generation:** export all PNGs consistently from one icon source during build, or commit the binary variants plus a reproducible export script. Do not ship a manifest referencing missing images.

**Recovery for an already installed iPhone PWA:** deploy the new build, then remove the **existing Home Screen shortcut** and re-add through **Safari → Share → Add to Home Screen → Add**. iOS may retain old Home Screen artwork even after the worker updates. Removing a shortcut is different from clearing all website data: avoid erasing the user's saved data. Verify the 180px PNG is reachable on the deployed HTTPS origin.

## E.8 Accessibility and quality targets

| Item | Target |
| --- | --- |
| Contrast | WCAG AA baseline: at least 4.5:1 for ordinary text, 3:1 for large text |
| Primary control | At least about 44 CSS px high |
| Small icon action | About 44×44 CSS px effective touch target |
| Keyboard | Sensible tab sequence, visible focus-visible outlines |
| Assistive technology | Correct semantics, names for icon-only buttons |
| Reduced motion | Disable or soften decorative animation |
| Loading/errors | No indefinite spinner; explain recoverable conditions |
| Mobile widths | No horizontal scrolling from content minimum widths |
| Language | HTML lang and interface strings use the chosen locale |
| Gradient | Never convey state only with color; label each phase |

## E.9 UX acceptance checklist

- [ ] A one-task utility has one clear primary action.
- [ ] No unnecessary second line beneath that action.
- [ ] Main result is a single concise component with provenance.
- [ ] Empty history and normal ONLINE banner consume no space.
- [ ] The desktop shell is centered and bounded.
- [ ] Wide landscape screens use side-by-side inputs and primary result with a larger but capped shell; short/narrow landscape screens do not squeeze forms.
- [ ] iPhone-scale viewports do not overflow horizontally.
- [ ] Long names, build numbers and forms can shrink or wrap.
- [ ] Grouped taglines do not split awkwardly.
- [ ] History deletion stays within the card and is accessible.
- [ ] Toast, offline warning and footer do not overlay essential interactions.
- [ ] iOS installation uses a **real 180×180 PNG touch icon**.
- [ ] Every asset is present in the final build and on the expected URL.
- [ ] Existing iPhone Home Screen icon replacement is explained.
- [ ] All implemented but untested changes are clearly identified.

**Related:** [Appendix C](appendix-c-reference-architecture.md) and [Appendix D](appendix-d-domain-specification.md).
