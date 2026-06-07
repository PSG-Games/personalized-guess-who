# Plan: Personalized Guess Who — Cards from Real Materials

**Source PRD**: `.claude/prds/personalized-guess-who.prd.md`
**Selected Milestone**: 1 — Cards from real materials
**Complexity**: Medium

## Summary
This plan covers Milestone 1: standing up the web app from nothing and building the full "upload a real scanned page → get usable character cards" pipeline, entirely client-side. It bundles project scaffolding and a GitHub Pages deploy pipeline, in-browser OCR and face detection, a name-to-face pairing heuristic backed by a human review/correction step, custom inside-joke trait entry, and lightweight local persistence. It deliberately tackles the riskiest unknown — whether automated extraction on real yearbook/roster materials is good enough to feel "magic" rather than tedious — before any auth, room, or multiplayer infrastructure exists.

## Patterns to Mirror
No existing code in this project to mirror — it's a greenfield build; the only thing in the repo so far is the PRD. Rather than invent conventions, this plan establishes them from your own global web rules from the start, so later milestones have something real to follow:
- **File organization** — feature folders (`components/<feature>/`), `hooks/`, `lib/`, `styles/`, design tokens as CSS custom properties — per `~/.claude/rules/ecc/web/coding-style.md`
- **Component composition** — compound components for related UI, container/presentational split — per `~/.claude/rules/ecc/web/patterns.md`
- **Storage access** — repository-style abstraction (consistent interface, swappable backing store) — per `~/.claude/rules/ecc/common/patterns.md`

## Files to Change
| File | Action | Why |
|---|---|---|
| `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.*`, `.github/workflows/deploy.yml` | CREATE | Project scaffold (Vite + React + TS), lint/format/type-check tooling, and a GitHub Pages build-and-deploy pipeline |
| `src/main.tsx`, `src/App.tsx` | CREATE | App bootstrap and root shell |
| `src/components/upload/UploadPage.tsx` | CREATE | Upload UI; orchestrates the local-only upload → extract → review flow |
| `src/lib/ocr.ts` | CREATE | Tesseract.js wrapper — runs OCR on the uploaded image fully client-side |
| `src/lib/faceDetection.ts` | CREATE | Client-side face-detection wrapper — returns faces with bounding boxes / crops |
| `src/lib/cardAssembly.ts` | CREATE | Pure heuristic that pairs extracted names with detected faces into draft cards |
| `src/components/upload/ExtractionReview.tsx` | CREATE | Review/correction UI — lets the user fix mismatches before anything is saved |
| `src/components/cards/CharacterCard.tsx`, `src/components/cards/TraitEditor.tsx` | CREATE | Card display and custom/inside-joke trait entry |
| `src/lib/storage.ts` | CREATE | Local persistence (IndexedDB) so finished cards survive a reload |
| `src/types/card.ts` | CREATE | Shared TypeScript types for cards and traits |

## Tasks

### Task 1: Scaffold the project and the deploy pipeline
- **Action**: Initialize a Vite + React + TypeScript project; add ESLint, Prettier, and TypeScript checking per the standard hook setup; add a GitHub Actions workflow that builds and deploys the static output to GitHub Pages with the correct base path.
- **Mirror**: File-organization conventions from `~/.claude/rules/ecc/web/coding-style.md` — set up `components/`, `hooks/`, `lib/`, `styles/` from day one, not as an afterthought.
- **Validate**: `npm run build` produces a working static bundle, and a minimal "hello world" page deploys and loads correctly from GitHub Pages.

### Task 2: Build the local-only upload flow
- **Action**: Build an upload component that accepts an image file (a scanned page) and keeps it entirely in browser memory / local component state. No code path ever sends the image to a server.
- **Mirror**: Semantic HTML and accessible markup per `~/.claude/rules/ecc/web/coding-style.md`.
- **Validate**: Upload a real scan from the group's materials; confirm via the browser's network inspector that no image bytes leave the device.

### Task 3: Integrate in-browser OCR
- **Action**: Wire up Tesseract.js to run against the uploaded image and return text blocks with their positions (bounding boxes), entirely in-browser.
- **Mirror**: N/A — no project pattern yet; follow Tesseract.js's documented browser/WASM usage.
- **Validate**: Run against one of the group's actual scanned pages; manually confirm a majority of names are extracted with usable position data.

### Task 4: Integrate in-browser face detection
- **Action**: Spike both MediaPipe Face Detector (`@mediapipe/tasks-vision`) and `face-api.js` against a couple of the group's real scans, pick whichever is more accurate and easier to keep fully client-side, then wire it up to return detected faces with bounding boxes/crops.
- **Mirror**: N/A — follow the chosen library's documented client-side usage.
- **Validate**: Run against the same real scan; manually confirm most faces are detected and cropped sensibly.

### Task 5: Pair extracted names with detected faces into draft cards
- **Action**: Write a small, pure heuristic function that proposes name–face pairings from spatial proximity (e.g., "this name sits directly below or beside this face"), producing a list of draft cards.
- **Mirror**: Small, focused pure functions per the "Long Functions" / KISS guidance in `~/.claude/rules/ecc/common/coding-style.md` — this kind of logic should stay simple and unit-testable, not clever.
- **Validate**: Unit tests against fixture bounding-box data covering the layouts the group's materials actually use (grid-of-photos-with-captions vs. list-with-name-beside-photo); spot-check against the real scan.

### Task 6: Build the review-and-correction UI
- **Action**: Build a UI that shows each draft card (face crop + extracted name) and lets the user fix a wrong pairing, correct an OCR typo, re-crop a face, or discard a bad extraction — before anything is saved as a real card.
- **Mirror**: Compound-component pattern (parent owns shared review-list state, children consume it) per `~/.claude/rules/ecc/web/patterns.md`.
- **Validate**: Run the full review flow on a real scan end-to-end and confirm every card can be corrected to be fully accurate, even where extraction got it wrong.

### Task 7: Add custom / inside-joke trait entry
- **Action**: Extend the card data model and UI so the user can type free-form custom traits onto a card — the part extraction can never provide, and the thing that makes this game personal instead of generic.
- **Mirror**: Naming and component conventions from `~/.claude/rules/ecc/web/coding-style.md`.
- **Validate**: Add several custom traits across multiple cards; confirm each is attached to the right card and saved with it.

### Task 8: Persist finished cards locally
- **Action**: Save completed cards to browser-local storage (IndexedDB) behind a small repository-style interface, so cards survive a page reload. This is the seed Milestone 2's pack/room management will build on — no pack UI yet, just durable storage of what Milestone 1 produces.
- **Mirror**: Repository pattern (consistent interface over storage mechanics, swappable later) per `~/.claude/rules/ecc/common/patterns.md`.
- **Validate**: Create several cards, reload the page, confirm they're all still there with traits intact.

## Validation
```bash
npm install
npm run lint
npm run typecheck
npm run build
npm run dev   # then manually run the full upload -> extract -> review -> trait -> save flow
              # against real scanned material from the friend group
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| OCR/face-detection libraries are heavy (model downloads, WASM init) and feel slow on real devices | Medium | Load models lazily — only after an image is uploaded — show clear progress feedback, and test on the actual devices the friend group uses, not just a dev machine |
| Automatic name-to-face pairing is unreliable across different page layouts | High | Treat pairing as a *draft proposal* the user always reviews (Task 6), not something that has to be perfect — the correction step is core to the design, not a fallback |
| The chosen face-detection library is harder to integrate or less accurate than expected | Medium | The Task 4 spike compares two real options against real materials *before* committing, so this gets resolved with evidence, early, while it's still cheap to change direction |
| GitHub Pages base-path / static-build quirks block shipping later | Low | Task 1 proves the deploy pipeline with a trivial page before any real feature is built on top of it |

## Acceptance
- [ ] All 8 tasks complete
- [ ] `npm run build` succeeds and the app deploys and loads from GitHub Pages
- [ ] A real scanned page from the group's own materials produces usable character cards end-to-end: upload → extract → review/correct → add inside-joke traits → persists across reload
- [ ] No raw image bytes are ever sent to a server (verified via network inspection)
- [ ] Patterns mirrored from the global web rules, not reinvented ad hoc
