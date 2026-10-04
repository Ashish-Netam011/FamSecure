# Prompts for generating the FarmRescue PPT

Two versions:

- **A. Drop-in prompt** — paste into an agent working inside `E:\Desktop\FarmRescue`.
- **B. Reusable template** — swap the project name and facts, reuse anywhere.

---

## A. Drop-in prompt (this repo)

```text
Build a proper, official-looking PowerPoint presentation for the FarmRescue project
in this repository. Deliver the .pptx in presentation/ and leave all changes uncommitted.

DO NOT INSTALL ANYTHING. No new npm packages, no global installs. python-pptx and
Pillow are already available — use those. Never run state-changing git commands
(no commit, no push, no reset, no stash).

STEP 1 — Gather the facts (do not invent anything)
- Read README.md in full, plus docs/prd.md, docs/trd.md, docs/architecture.md and
  docs/app-flow.md. The README is the primary source: architecture philosophy,
  P0 MVP feature list, tech stack, API table, demo walkthrough, docs index.
- Pull the concrete numbers and real strings from the code, not from memory:
  the risk-engine thresholds in src/domain/risk/rules.ts, the number of expert
  plans in src/domain/actions/recommendations.ts, the test count from `npm test`.
- Note the parked-feature decision: the Field Map (/field) and Plot Registry
  (/plots) are disabled in the demo build (404, not linked in the navbar)
  because the registry could only find plots registered inside FarmRescue
  (no government land-records verification) and two concurrent dev servers
  overwrote each other in the shared database. The implementation is preserved
  in src/_parked/. The deck must state this honestly.

STEP 2 — Capture real screenshots of the live app
- Start one dev server on a free port, e.g. `npx next dev -p 3457`
  (kill anything already listening on that port first).
- Capture these routes with headless Chrome at 1600x900:
  /  (farmer dashboard), /incidents/new (reporting wizard),
  /incidents/<demo-id> (emergency action screen), /field-worker (verification queue),
  /history (auditable history).
- Give every capture its own unique --user-data-dir, otherwise a shared Chrome
  profile silently returns the wrong page. Verify each PNG actually shows the
  page you expect before embedding it. Save them in presentation/shots/.
- Kill the dev server when the captures are done.

STEP 3 — Build the deck (7 slides, 16:9)
- Generate it from a committed script (presentation/build_deck_short.py) rather
  than hand-editing XML, so the deck can be regenerated.
- Theme: dark forest/green agricultural palette — deep green #0B2E1B backgrounds,
  primary green #15803D, accent emerald #10B981, mint panels #ECFDF5, slate text
  #1E293B / #5B6B80, red #DC2626 and amber #D97706 for risk. Headings in a
  semibold grotesque (Segoe UI Semibold), body Segoe UI. 13.333 x 7.5 in slides.
- Every slide: a dark header band with a small uppercase kicker, a large title,
  and a page number. No default PowerPoint theme, no clip art, no bullet-point walls.
- Slide outline:
  1. Cover — product name, tagline "Emergency Agricultural Early-Warning &
     Response Platform", the quote "What should I do when the farm suddenly goes
     wrong?", the one-rule pitch, tech stack strip.
  2. The Problem — three cards (invisible onset / generic, sometimes dangerous
     advice / no traceability), closing line: the agronomic knowledge exists,
     delivery is what fails.
  3. The Solution in One Rule — the non-negotiable invariant as a large quote,
     then the six-stage decision pipeline as connected cards (Inputs, Evidence,
     Risk rules, Safety gate, Action library, Explain & verify), plus the note
     that the AI layer runs strictly after these steps and cannot override them.
  4. Deterministic Risk Engine & Content Library — the real paddy waterlogging
     severity ladder (CRITICAL / HIGH / MODERATE / LOW / NORMAL) with actual
     thresholds, the pre-stored plan library, the safety gate, one real AVOID
     interception, and the review-cadence rule.
  5. The Product in Action — the emergency action screen screenshot at large
     size with DO NOW / AVOID / MONITOR / WHY THIS RECOMMENDATION / evidence
     freshness / reassessment explained beside it.
  6. Scope: Shipped, Parked and Next — three columns (shipped today, the parked
     Field Map + Plot Registry with the honest reason, the P1/P2/P3 roadmap),
     app screenshots beneath, and a one-line honest known-gaps note.
  7. Closing — the payoff line, the stat strip (tests passing, expert plans,
     API routes, decisions authored by the AI layer = 0), thank you.
- Add speaker notes to every slide — short, presentable, explaining the point
  rather than restating the slide text.
- Be rigorously honest. Any limitation you find in the docs goes on slide 6.
  Never claim a capability that is not in the code.

STEP 4 — Verify before delivering
- Reopen the .pptx with python-pptx: confirm the slide count, that all images are
  embedded, that notes exist, and that no shape falls outside the canvas.
- Render the deck to images with the locally installed PowerPoint via COM
  (`Presentations.Open(...).SaveAs(dir, 18)` for PNG, format 32 for PDF) and
  actually look at the rendered slides. Fix any clipped text, overlapping shapes
  or mis-sized screenshots, then regenerate.
- Also export a PDF alongside the .pptx.

Report the file paths, the slide list, and what you verified. Leave everything
uncommitted.
```

---

## B. Reusable template

Swap the bracketed parts and reuse for any project.

```text
Build a proper, official-looking PowerPoint presentation for [PROJECT NAME],
which lives in this repository ([one-line description of what it is]).

DO NOT INSTALL ANYTHING — use python-pptx and Pillow, which are already available.
Never run state-changing git commands. Leave all changes uncommitted.

Facts first:
- Read [README.md, docs/...] in full and treat them as the only source of truth.
- Extract real numbers and real strings from the code rather than inventing them
  ([rule thresholds, counts, endpoint lists, test output]).
- List what is NOT finished or was deliberately disabled, and plan to show it.

Real evidence:
- Start the app and capture headless screenshots of the key screens at 1600x900
  into presentation/shots/, using a unique browser profile per capture, and
  verify each image shows the intended page before embedding it.

Build it as a script:
- Write presentation/build_deck.py that generates the .pptx, so the deck is
  reproducible and reviewable as code.
- [N] slides, 16:9 (13.333 x 7.5 in). Custom theme — do not use the default
  template. Palette: [PRIMARY], [ACCENT], [PANEL], [TEXT], [WARNING].
  Headings [FONT], body [FONT]. Dark header band with uppercase kicker + title
  and a page number on every slide.
- Outline: cover with a one-line pitch; the problem; how it works; the core
  technical mechanism with real numbers; the product on real screenshots;
  scope + honest limitations + roadmap; closing with a stat strip.
- Speaker notes on every slide.
- No placeholder text, no fake metrics, no lorem ipsum, no unverified claims.

Verify:
- Reopen the .pptx with python-pptx (slide count, images, notes, nothing
  off-canvas), then render it to images and visually inspect every slide.
  Fix layout problems and regenerate. Export a PDF too.

Report the paths and what you verified.
```

---

## C. Variations

- **Full technical deck (18 slides)** — same instructions but expand slide 3 into
  separate slides for architecture, roles & personas, core capabilities, roles,
  the risk engine, the recommendation library, evidence & human verification,
  persistence & audit, tech stack and the demo script.
- **3-slide elevator cut** — problem, the one rule, one screenshot with the payoff line.
- **Non-technical audience** — drop the API/threshold detail, lead with the farmer's
  story, and keep exactly one screenshot of the action screen.

## D. Why the prompt is shaped like this

- **"Do not install anything / use python-pptx"** — python-pptx is already present
  and writes real OOXML; adding tooling is unnecessary risk.
- **"Extract real numbers from the code"** — decks fail when a slide claims
  "50+ rules" and the repo has 12. Cite the file.
- **"Unique browser profile per screenshot"** — a shared Chrome profile makes the
  singleton process return the wrong page, which is easy to miss and embarrassing.
- **"Build it as a script"** — a .pptx is hard to review; the generator can be
  diffed, re-run and corrected.
- **"Render and look at it"** — geometry that looks fine in an object model can
  still clip. Only the rendered image tells the truth.
- **"Show what is unfinished"** — a voluntary limitations slide buys credibility
  for every claim that follows it.
