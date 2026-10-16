# About-page alignment and biography — 16 October 2026

final result: passed

The publications prompt retains its left alignment and is vertically centred between its divider and the bottom of the desktop hero, following Austen’s clarification. The Research Assistant link now includes the local external-link arrow on desktop and mobile. The three professional disciplines form a centred row, with equal padding on both sides of each title and a closing vertical bar after AI Researcher. On narrow screens they stack with centred text and aligned bars. The biography opens with the broader aim of inferring the physics of complex astrophysical systems from spectra; the second paragraph begins “Previously” and connects Southampton, SPECULATE, IBM Research and UKAEA. The plain-text summary carries the same copy.

## Evidence and checks

- Follow-up spacing and copy: `/private/tmp/austen-title-spacing.jpg` and `/private/tmp/austen-title-spacing-mobile.jpg`. Desktop titles have 28px padding on each side; the final right border is present. Checked at 1120px and 320px CSS widths, with no page overflow. All four sections and the browser console checked again. Viewport overrides reset; no script changes or additional automated tests were needed for this static refinement.
- Before: `/private/tmp/austen-about-before-alignment.jpg`. Final desktop: `/private/tmp/austen-about-polished.jpg`. Narrow layout: `/private/tmp/austen-about-polish-mobile.jpg`. Compared against the supplied screenshot and established design; the alignment, arrow and copy changes are intentional. Existing colours, fonts, portrait and heading sizes remain.
- The Cambridge block was subsequently lowered by 54px in total, and the publications text by 16px, leaving more room below the headline and bringing the two blocks 38px closer. The desktop publications text remains vertically centred, with approximately 18px above and 17px below. The arrow remains at the right edge. Current evidence: `/private/tmp/austen-hero-spacing-lower.jpg`. Desktop and 320px layouts, all four sections, the publications link and browser console were checked during the spacing pass; the final additional desktop offset was visually checked again. Mobile spacing retains its existing override.
- Checked the desktop layout and 1120px and 320px CSS viewports. The affiliation logo shrinks slightly near the desktop breakpoint so its role and institute remain on single lines. At 320px, document scroll width equals client width; the publication link, role link and professional titles fit. Temporary viewport overrides were reset without changing browser zoom.
- All four sections, browser Back, publication filtering, photo viewing with previous/next and Escape, the CV Education shortcut, and pause/resume, previous/next, replay and skip controls checked. No browser console warnings or errors.
- This pass changes static markup, styling and biography only. No new automated tests were added. The existing physics and navigation scripts are unchanged; their 18 checks passed in the preceding pass.

Final captures reviewed; no actionable layout issues remain for this change. The local preview is open. No deployment was performed, and this pass makes no additional claim about the previously reported idle flash.

---

# Section-loading flash investigation — 15 October 2026

Targeted fixes and checks passed. The recurring idle flash reported by Austen has not been reproduced, so its cause remains unconfirmed.

## Findings and changes

- The site has no timed section navigation or page reload. The model clock is confined to About; ORCID is fetched once after page initialization.
- Before the deferred navigation script ran, all four sections were visible. A direct link or reload could therefore expose About before the selected section was restored. A small inline bootstrap and temporary CSS rule now select the appropriate section before external scripts load. The rule is removed after normal navigation initializes.
- About’s canvas could still redraw from resize/visibility callbacks while its section was hidden. Drawing and resizing now return immediately outside About, and resume normally on return.
- No citation counts, author tags or sorting were added.

## Verification

- Before/after fixtures held external scripts until a button was pressed. At `#cv`, the old version exposed all four sections; the new version exposed only CV both before and after initialization.
- Repeated the held-script check at 320 × 700 for Publications. Only Publications was visible before and after initialization; no horizontal overflow.
- Main preview reload, all four sections, browser Back, and resumed About animation checked. No browser console errors or warnings.
- All 18 regression checks pass, including deep-link startup and 90 seconds of simulated inactivity on CV with resize/visibility callbacks and no canvas paints.
- The original CV stayed selected across the investigation’s spaced observations. These were not continuous frame captures and do not rule out the user’s reported intermittent flash.

## Approved affiliation applied

The approved concept is now implemented: white University of Cambridge logo, Research Assistant and Institute of Astronomy occupy the empty desktop hero area. The block links to Austen’s IoA profile. At 1100px and below, the role remains in the biography area, with “Research Assistant” linked to the same profile; only one affiliation treatment is visible at a time.

- Approved reference: `/private/tmp/austen-cambridge-affiliation-concept.jpg`. Applied desktop capture: `/private/tmp/austen-cambridge-affiliation-applied.jpg`, both 1469 × 940. The animation phase differs; typography, spacing, logo, colours and copy retain the approved layout.
- Desktop, 1100 × 900 and 320 × 700 checked. No horizontal overflow; the mobile role link fits and has a visible keyboard focus outline. Mobile evidence: `/private/tmp/austen-cambridge-affiliation-mobile.jpg`.
- All four navigation sections and browser Back checked again; no browser errors or warnings. All 18 regression checks and diff whitespace checks pass.
- A fresh visible local tab was opened at `http://127.0.0.1:8000/?preview=cambridge-affiliation-1#about` for Austen’s idle-flash check. Its intro completed normally. The recurring idle flash remains unconfirmed, as described above.

Desktop and narrow captures reviewed; no actionable layout findings remain for this change.

No deployment was performed.

---

## Previous refinement report

# Research profiles and CV logos — 15 October 2026

final result: passed

Added Google Scholar alongside ORCID, with the full ORCID identifier visible. CV dates now carry official white organisation marks for Cambridge, Southampton, IBM, UKAEA, IAC and La Laguna, including the two Southampton education entries. Original logo files and source URLs are retained in `assets/images/organisations/README.md`. This is an intentional extension of the established blueprint design; biography, dates and publication data are unchanged.

## Evidence and checks

- Before: `/private/tmp/aw-publications-before-profiles.jpg`, `/private/tmp/aw-cv-before-logos.jpg`.
- After: `/private/tmp/aw-publications-with-profiles.jpg`, `/private/tmp/aw-cv-with-logos.jpg`; handoff view `/private/tmp/austen-cv-logos.jpg`.
- Mobile: `/private/tmp/aw-publications-profiles-mobile.jpg`, `/private/tmp/aw-cv-logos-mobile.jpg` at 320 × 700. Full ORCID identifier fits on one line; document scroll width equals the 305px content width. Tablet checked at 1100 × 900; the timeline retains two readable columns.
- All eight logo placements load correctly and preserve aspect ratios. SVGs have no scripts, foreign objects or external asset references. No remote images are requested by the site.
- Research-profile URLs match the confirmed ORCID ID and supplied Scholar URL. Keyboard focus moves from ORCID to Scholar. Live ORCID refresh and the 2025 filter (three publications) still work.
- All four site sections and the Education shortcut checked; no browser errors or warnings. Local asset paths, image dimensions/alt text, unique HTML IDs and diff whitespace pass.
- No new automated tests were added for these static HTML/CSS changes. Animation code and the downloadable PDF were not changed. No deployment was performed.

Final desktop and narrow captures were visually reviewed. No actionable P0/P1/P2 findings remain.

---

## Previous refinement report

# Identity, emulator and transit polish — 15 October 2026

final result: passed

## Scope

Refinement of the established blueprint design following Austen’s latest request. The professional titles lead into the Cambridge affiliation; the fuller research biography sits below a separate rule. The Hycean-group reference is in that biography. The sidebar says “Email Me!” and the model disclosure no longer includes the scale caveat. Typography, palette, portrait and navigation remain consistent with the approved design.

Figure 5 now uses a cylindrical database, six neuron layers and a travelling activation. The output spectrum holds until activation reaches the last layer, then morphs between P Cygni, double-peaked emission and broad emission. The laptop and prediction plot share the same spectrum. On narrow screens the prediction sits beneath the network. These remain illustrative profiles, not SPECULATE outputs or measured benchmarks.

The exoplanet’s transit changes absorption-band cores and wings as well as brightness. The existing ×12 display amplification remains labelled, and geometry still determines transit and secondary eclipse.

## Visual evidence

- Previous homepage: `/private/tmp/aw-home-refined-desktop.jpg`.
- Current desktop and handoff: `/private/tmp/austen-identity-network.jpg`, 1469 × 1060, captured from the actual local site at a 1484 × 1359 viewport.
- Before/after comparison: `/private/tmp/aw-identity-comparison.jpg`. Both sides use the first 1060px at original scale; different selected systems are intentional.
- Tablet: `/private/tmp/aw-identity-tablet.jpg`, viewport 1100 × 900.
- Narrow mobile: `/private/tmp/aw-identity-mobile-320.jpg`, viewport 320 × 700.
- Three synchronized emulator profiles: `/private/tmp/aw-network-profiles.jpg`, captured at exact phases in a temporary review page. The final database proportions and connection contrast were subsequently refined and checked in the current desktop capture.
- Transit line-shape detail: `/private/tmp/aw-transit-reshaped.jpg`.

## Findings resolved

- **P2 — Narrow title overflow:** “Machine Learning Engineer” exceeded the main column at 320px. The smallest breakpoint now fits the full title on one line; document scroll width equals its 305px content width.
- **P2 — Orphaned punctuation:** the Cambridge link’s terminal period could wrap alone. It now stays with the linked affiliation.
- **P2 — Crowded mobile network:** the wider six-layer network now has a separate full-width prediction plot underneath it.

Final screenshots were visually inspected. No actionable P0/P1/P2 findings remain.

## Verification

- Desktop, 1100px, 390px and 320px layouts checked; no horizontal overflow.
- All four navigation sections, publication year filtering, the model disclosure, all six system selections, pause/resume, replay/skip, photo navigation/close and all CV shortcuts exercised. The live ORCID list refreshed with six publications.
- Three emulator output changes and transit line shapes inspected at controlled phases. The output holds until the last-layer event and remains continuous between cycles.
- All 15 physics, rendering and control regression tests pass. New checks cover transit band shapes and emulator timing/continuity. JavaScript syntax and diff whitespace checks pass.
- No browser errors or warnings. Physical-device touch, a fresh Safari run and a screen-reader session were outside this pass.
- The local preview remains on port 8000. No deployment was performed.

---

## Previous refinement report

# Homepage and spectra refinement — 15 October 2026

final result: passed

## Scope and sources

Austen requested less instructional copy, no recent-publications block on the homepage, a more specific biography centred on his current Cambridge role, the restored “STARS / SPECTRA / MODELS” strip, and more legible spectra. This is an intentional revision to the preceding design, not a screenshot clone.

The biography was checked against [Austen’s Institute of Astronomy profile](https://www.ast.cam.ac.uk/people/austen.wallis) in the browser on 15 October 2026. The homepage now covers the Hycean group, M-dwarf spectroscopy, stellar variability in JWST observations, Bayesian inference, SPECULATE, IBM Research and UKAEA. The homepage has no PhD-status label; the CV retains “PhD candidate” without repeating “in progress”. No awarded degree was inferred.

## Visual evidence

- Previous homepage: `/private/tmp/aw-ui-after-about.jpg` (1469 × 1419).
- Revised homepage: `/private/tmp/aw-home-refined-desktop.jpg` (1469 × 1359), viewport 1484 × 1359.
- Side-by-side comparison: `/private/tmp/aw-home-refined-comparison.jpg`. Both captures are placed at their original scale, with the top 960px shown. The earlier capture has Jupiter selected; the revised capture has the exoplanet selected. Scene differences are intentional, not fidelity defects.
- Revised mobile homepage: `/private/tmp/aw-home-refined-mobile.jpg` (375 × 1742), viewport 390 × 844.
- Narrow layout: `/private/tmp/aw-home-refined-320.jpg` (305 × 1957), viewport 320 × 700.
- Handoff capture: `/private/tmp/austen-homepage-refined.jpg`, a 1469 × 950 crop including navigation, animation, controls and the complete biography.

## Required visual surfaces

Typography, the two existing typefaces, the shared 2pt font increment, navy/white/cyan palette, sidebar, framed portrait and Lucide icons remain consistent. The restored top strip fits at 320px. The biography uses a larger role statement and two short research paragraphs. Publications are accessed through the live-count “Explore my work” link, visible once on both desktop and mobile. The information popup contains only the model description and a short scale note.

Spectral plotting height increases from 48 to 106px on desktop and from 23 to 83px in the narrow stacked spectrum. The star-only spectrum is dashed; the system spectrum is solid with the planet’s contribution amplified ×12, labelled in the plot. Stellar molecular bands are more pronounced in the illustrative template. Both traces coincide at full secondary eclipse. Photometry and orbital timing remain coupled to the same geometric model. Compact rotation indicators keep shorter panels so they do not consume the extra plotting space intended for spectra.

## Findings resolved

- **P2 — Mobile publication link overflow:** the restored mobile call to action needed a smaller gap before its arrow. At 320px, document scroll width now equals its 305px content width, with the scrollbar gutter excluded.
- **P2 — Excess empty plot space:** AGN/Jupiter rotation indicators and the emulator diagram now use shorter panels while spectra retain the taller plotting area.

The comparison and final screenshots were reviewed after these fixes. No actionable P0/P1/P2 findings remain.

## Verification

- Inspected the homepage at desktop, 1100px, 390px and 320px widths.
- All six scenes and the HPC intro inspected at mobile width; transit and total eclipse checked at exact phases in a temporary preview. That preview and server were closed afterward.
- All four tabs, the mobile publication link, live ORCID refresh (six publications), year filtering, and the concise model disclosure checked. No browser errors or warnings.
- All 13 existing physics/rendering/clock checks pass. JavaScript syntax, diff whitespace, 23 local assets and unique HTML IDs verified. The removed recent list has no remaining runtime dependency.
- The normal local preview remains available on port 8000. No publishing was performed. Physical-device touch and a fresh Safari/screen-reader run were outside this pass.

---

## Earlier UI polish review

# UI polish review — 15 October 2026

final result: passed

## Target and evidence

This pass refines the existing blueprint site in response to Austen's request for less landing-page text, stronger visual hierarchy and easier navigation. The existing design and supplied screenshot are the visual sources; the intentional changes below are not treated as cloning discrepancies.

Source detail: `/var/folders/0r/f1m_v84s4l527n_p84szp8r00000gp/T/codex-clipboard-c6e64260-b895-4b5f-bf4a-a6ccfd759aed.png`.

Implementation: `http://127.0.0.1:8000/`, inspected in the Codex in-app browser.

Browser captures use CSS-pixel output. Desktop viewport: 1484 × 1359; mobile: 390 × 844. Full-page captures exclude the 15px vertical scrollbar/gutter. No independent image scaling was used in comparisons. The original Publications page lacked a scrollbar (1484px capture); the revised stable gutter leaves 1469px of content. That 15px difference is recorded, not mistaken for design drift.

| Page | Source capture / pixels | Implementation capture / pixels |
| --- | --- | --- |
| About | `/private/tmp/aw-ui-before-about.jpg` · 1469 × 1691 | `/private/tmp/aw-ui-after-about.jpg` · 1469 × 1419 |
| Publications | `/private/tmp/aw-ui-before-publications.jpg` · 1484 × 1359 | `/private/tmp/aw-ui-after-publications.jpg` · 1469 × 1359 |
| Places | `/private/tmp/aw-ui-before-places.jpg` · 1469 × 5177 | `/private/tmp/aw-ui-after-places.jpg` · 1469 × 2410 |
| CV | `/private/tmp/aw-ui-before-cv.jpg` · 1469 × 2515 | `/private/tmp/aw-ui-after-cv.jpg` · 1469 × 2513 |
| Mobile About | `/private/tmp/aw-ui-before-mobile.jpg` · 375 × 2728 | `/private/tmp/aw-ui-after-mobile.jpg` · 375 × 2028 |

State: each section at its top, all publication years selected, photo dialog closed. About comparisons use Jupiter, paused; orbital phase differs slightly and is not a UI-fidelity measure. Each comparison puts the original and implementation together in one image:

- `/private/tmp/aw-ui-compare-about.jpg`
- `/private/tmp/aw-ui-compare-publications.jpg`
- `/private/tmp/aw-ui-compare-places.jpg`
- `/private/tmp/aw-ui-compare-cv.jpg`
- `/private/tmp/aw-ui-compare-mobile.jpg`

Focused comparison: `/private/tmp/aw-ui-controls-comparison.jpg` shows the caption area at native resolution. The current mobile dialog is `/private/tmp/aw-ui-photo-viewer-mobile.jpg`. The handoff view is `/private/tmp/austen-ui-polish.jpg`.

## Comparison findings and fixes

Initial review found these actionable issues; all are resolved:

- **P2 — Narrow photo captions:** putting captions between both arrows squeezed the 3MT title and description into a thin column. The revised mobile viewer gives captions the full width and sizes the photo by its intrinsic aspect ratio. Verified again at 320 × 700, including the long 3MT caption.
- **P2 — Horizontal page movement:** switching to a short publication filter removed the scrollbar and shifted the page. A stable root scrollbar gutter now keeps the main column at exactly x=220 before and after filtering at 1280 × 720.
- **P2 — Short-screen sidebar reachability:** the profile links could extend below the viewport. The sticky sidebar now scrolls independently within the viewport. Keyboard navigation reached Email at y=622–658 on a 720px screen.
- **P2 — Tablet drawing layout:** the CSS stacked layout could disagree with the renderer's width threshold. Both now use the CSS stacking flag; verified at 1100 × 900, where the drawing area is 829px wide.
- **P2 — Focus during fades:** a fast CV shortcut could lose focus when the section fade completed. Heading focus now moves before the fade. Toolkit retains focus without changing `#cv`. Skip to content also retains the current section instead of selecting About.

After these fixes, the source/implementation comparisons above were regenerated and reviewed. No actionable P0/P1/P2 findings remain.

## Required fidelity surfaces

- **Typography:** IBM Plex Mono and Barlow Condensed remain. All four main headings compute to Barlow Condensed, 54.6667px on desktop. The 2pt scale token remains. Publication titles are complete; long academic titles wrap naturally. Mobile navigation labels fit their rail.
- **Spacing and hierarchy:** the permanent caption stack becomes one compact toolbar. A short introduction replaces repeated biography blocks. The publication year rail and larger row links aid scanning. The gallery uses natural image proportions; the CV uses date-led entries and section shortcuts. These are intentional changes to the source.
- **Colors:** the navy/white/cyan palette remains, with a darker sidebar and graph paper limited to the animation. Active navigation, keyboard focus and selected years have distinct states.
- **Images and icons:** the same portrait retains its square frame and 10% zoom. All 13 gallery assets retain their full aspect ratios and have intrinsic dimensions. No original photos were modified. The 17 interface icons come from the local Lucide sprite, with license notices retained.
- **Copy and content:** filler captions and duplicated footer panels were removed. Model explanations remain under the information control. CV roles, dates and education are retained; the PhD stays in progress. The ORCID publication count, full titles, dated fallback, links and PDF download remain available.

## Validation

- Desktop, 1280 × 720, 1100 × 900, 768 × 1024, 390 × 844 and 320 × 700 layouts inspected; no horizontal overflow observed.
- All four navigation sections, fades and browser Back tested.
- Publication filters tested; 2025 shows three records. The live ORCID list refreshed successfully.
- Photo open, previous, next, arrow keys, Escape, close and focus return tested. The 3MT photo renders normally.
- CV section shortcuts, skip link and PDF download tested. The test download was removed afterward.
- Animation pause/resume, previous/next, replay, skip and keyboard information disclosure exercised. All 13 renderer/physics/clock checks pass, including reduced-motion handling.
- Browser console: no errors or warnings. JavaScript syntax and diff whitespace checks pass. All 23 local asset paths, 17 sprite symbols, unique HTML IDs and both publication fallback lists verified.

## Remaining scope

No publishing was performed. Physical-device touch, a separate Safari run and a screen-reader session were not part of this review; mobile checks used browser viewport overrides. No further visual changes are required for this pass.

## Star pet — 16 October 2026

Added the approved yellow-orange spherical companion with four image-generated expressions. The original transparent artwork remains in the generated-images directory; optimized 320px WebP assets and the prompt set are in `assets/images/pet/`. The character preserves the generated solar texture, limb darkening and face. Elastic scaling, rotation and expression changes are intentional animation states, not artwork-fidelity errors.

The final pet is 20% smaller than its first implementation: the desktop interaction area is 76.8px and mobile is 60.8px. Its switch is at the very bottom of the sidebar, level with the contact footer. On a 320px phone, the compact label and switch form two rows. The sticky sidebar links reserve enough space above the control to avoid overlap. The switch is above the pet's interaction layer, so throwing the pet over it cannot block switching it off.

Fast throws produce a golden core, orange glow and cooling ember particles. Gravity is 900px/s², five times the first version. Impacts compress along their contact normal by up to 42%, with perpendicular expansion and a damped spring return. A slow release gives a gentle placement squish. Pointer cancellation ends the interaction without throwing. Reduced motion retains direct placement and expressions without animated effects.

Browser verification: mouse drag/throw, click, keyboard movement/throw, on/off with reload persistence, all four navigation sections, and opening/closing the Places photo dialog. The dialog hides the companion. Desktop viewport 1483 × 1359; narrow viewport 320 × 700, with 303px content width and no horizontal overflow. All four sprites load. Console has no warnings/errors. Existing simulation and navigation checks plus ten pet checks pass (28 total); the latter cover force response, settling, bounded motion, frame-rate consistency, pointer cancellation, unavailable storage, hidden-page suspension and reduced motion. Physical-device touch was not exercised.

Evidence: `/private/tmp/aw-star-pet-flight.png` (desktop flight, reactive face, smaller size and bottom sidebar switch), `/private/tmp/aw-star-pet-impact.png` (landing deformation), `/private/tmp/aw-star-pet-mobile.png` (mobile footer and sidebar control). No deployment performed.
