# Austen Wallis Personal Website

This repository contains the source for Austen Wallis's personal GitHub Pages website.

## Structure

- `index.html` contains the page structure and section content.
- `assets/css/style.css` contains the site styling.
- `assets/js/script.js` handles section fades, URL hashes, browser history, live ORCID publications and year filters, CV section shortcuts, and the accessible Places photo viewer.
- `assets/js/systems.js` draws the six animated astrophysical systems and the HPC opening.
- `assets/js/systems-physics.js` supplies the shared orbital geometry, eclipse photometry, Roche potential, ballistic stream and disc-wind trajectories.
- The CV is maintained directly in `index.html`, with a “Download CV (PDF)” link to `Academic_CV.pdf` on the CV tab. Replace that PDF when updating the downloadable version and keep it consistent with the website CV.
- `assets/images/portrait.jpg` is the optimized version of the newer portrait, displayed with a square crop focused on the face, with the border and zoom set in CSS.
- `assets/images/favicon.svg` is the editable joined AW monogram, in white on navy. `logo.ico` includes 16–256 px frames, with a separate 180 px Apple touch icon.
- `assets/images/places/web/` contains optimized copies of the Places photos; the originals remain in `assets/images/places/`.
- `assets/images/organisations/` contains the official CV organisation marks, with source links in its README.
- `assets/icons/lucide.svg` contains only the Lucide 0.468.0 icons used by the interface. Its ISC/MIT notices are in `assets/icons/LICENSE.txt`; no icon CDN or JavaScript package is needed.

## Sections

- About
- Publications
- Places
- CV

Email, LinkedIn, GitHub, and Hugging Face links are available in the sidebar. The site uses ordinary scrolling within each section and a short fade when switching sections. Links such as `#publications`, `#places`, and `#cv` work directly and with browser Back/Forward.

A small inline startup script selects the linked section before deferred scripts load, preventing the About content from appearing during a reload of another tab. Without JavaScript all sections remain readable. The hidden About canvas does not draw or resize while another section is selected.

The shared `--bp-font-step` variable adds 2pt to every base text size. Canvas labels follow the same computed scale. Narrow layouts keep an icon-and-label side menu and give schematic labels a full row. Short screens can scroll the sidebar independently to reach every profile link. Graph paper is confined to the animation; reading areas have a plain background.

The landing page pairs the animated systems with a Cambridge logo and affiliation beneath the desktop headline. On smaller screens the current role appears below the professional disciplines instead; “Research Assistant” links to the [Institute of Astronomy profile](https://www.ast.cam.ac.uk/people/austen.wallis) in both layouts. A fuller research biography follows, checked against that profile on 15 October 2026. “Explore my work” links to the full Publications tab and shows the live count on desktop and mobile; the homepage does not duplicate the publication list. Publication rows show a year, full title and abbreviated journal; year filters are built from the same ORCID data. The information button beside the animation contains a concise model description, with keyboard-accessible pause, replay and arrow controls alongside it.

Places keeps each photograph's original aspect ratio in a responsive gallery. Selecting one opens a native dialog with previous/next controls; Left/Right change photos and Escape closes it, returning focus to the original thumbnail. Without JavaScript, the thumbnails remain ordinary image links. The CV has quick links to Experience, Education, Awards and Toolkit, plus the PDF download. Official organisation marks sit beneath the dates of roles and education, using local white assets that fit the blueprint palette.

The HPC intro runs once per browser session on the About page, with replay and skip controls. The six systems cycle automatically every 15 seconds, with arrows and a touch swipe for manual selection. Manual selection and resuming from Pause start a fresh 15-second interval. Pause stops both the animation and the automatic cycle. Motion and cycling stop when the diagram is offscreen or the page is hidden; reduced-motion preferences produce a static drawing with manual selection only.

An optional yellow-orange star pet floats above all four sections. The Pet on/off switch sits at the bottom of the sidebar, alongside the contact footer. Drag slowly to place it, or release a quick drag to throw it: inertia, gravity and damped edge rebounds drive the motion, while a spring compresses the star along the impact direction. Its face reacts to being held, flying and resting. Fast throws leave a fading ember trail; clicking makes a small flare. Arrow keys move it, Shift + Arrow throws it, Enter/Space makes a flare, and Escape switches it off. The preference and position are saved locally. Reduced motion keeps direct positioning and static expressions without momentum, squash or particles. Work stops while hidden or while a gallery photo is open. This playful companion is separate from the scientific animations.

The pet uses `assets/js/pet-physics.js`, `assets/js/pet.js` and `assets/css/pet.css`; its four generated transparent sprites and original prompts are documented in `assets/images/pet/README.md`. Pet regression tests cover force-dependent compression, settling, frame-rate stability, bounded throws, cancellation, storage, keyboard controls and reduced motion.

## Animation models

The drawings use a common orthographic camera and sort surfaces, orbit segments and particles by depth. Near-side tracks cross in front of opaque bodies; far-side tracks and bodies are occulted. The 4.8-second opening unfolds server bays into stellar latitude lines, then resolves into the first system. Its progress indicator is part of the illustration, not a download or a live HPC job.

- **Star and exoplanet:** one circular orbit drives both the drawing and its plots. Disc overlap with linear stellar limb darkening gives ingress, transit and egress. Secondary eclipse removes the planet's thermal contribution; its visible dayside changes between conjunctions. The spectrum overlays the star alone (dashed) and the combined system (solid), with illustrative near-infrared molecular bands. Different atmospheric core and wing widths reshape the absorption bands during transit, rather than applying only a grey brightness shift. Only the planet-induced difference is multiplied by 12 for legibility, as marked in the plot title; the light curve keeps its physical flux. At total secondary eclipse the curves coincide. These are illustrative spectral templates, not an observed or retrieved spectrum. This follows the distinction between [transmission and eclipse spectroscopy described by NASA](https://astrobiology.nasa.gov/news/the-just-approved-european-ariel-mission-will-be-first-dedicated-to-probing-exoplanet-atmospheres/) and [isolating planetary emission during secondary eclipse](https://science.nasa.gov/resource/isolating-a-planets-spectrum/).
- **Cataclysmic variable:** a mass ratio of 0.4 sets a common centre of mass and a Roche equipotential. The donor is synchronously rotating. A fourth-order Runge–Kutta trajectory in the circular restricted three-body potential carries gas from L1 to the outer disc, where it makes an impact spot. The velocity curves use the same binary phase and mass ratio. Disc material rotates faster at smaller radii. This is a disc-accreting CV, rather than the strongly magnetic subset without a disc; see [NASA's CV overview](https://science.gsfc.nasa.gov/662/research/cvs.html).
- **AGN:** a jet-producing example, with an accretion disc, a dusty torus displayed in cutaway, and opposed jets normal to the disc. It does not attempt general-relativistic ray tracing or claim that all AGN have jets. The separate rotation indicators follow Keplerian angular speeds. See [NASA's AGN model](https://fermi.gsfc.nasa.gov/science/eteu/agn/).
- **Jupiter:** oblate figure, rotating bands and a southern storm; the inner moons keep an exact 4:2:1 mean-motion ratio and a constant Laplace angle. Callisto retains its separate period ratio. Jupiter's spin is tied to the orbital clock. Orbital spacing is compressed and moon sizes enlarged for legibility; the drawing is not an ephemeris. See [ESA's Galilean-orbit explanation](https://www.esa.int/ESA_Multimedia/Videos/2021/07/The_orbits_of_the_Galilean_moons) and [JPL's satellite elements](https://ssd.jpl.nasa.gov/sats/elem/).
- **Simulation to emulation:** a live wind model in the laptop screen and a database feeding six neuron layers. An activation travels from input to output; only when it reaches the output layer does the prediction morph to the next of three illustrative profiles: P Cygni, double-peaked emission and broad emission. The laptop spectrum and prediction use the same 4.5-second sequence and remain fixed between updates. On narrow screens, the prediction sits below the network. The uncertainty ribbon and model curves are illustrative; no runtime, accuracy or uncertainty-calibration benchmark is implied.
- **Disc wind:** launching radii and streamline opening angles follow a simplified [SIROCCO / Shlosman–Vitello biconical prescription](https://sirocco-rt.readthedocs.io/en/latest/wind_models/sv.html). Flight-time integration accelerates particles along the outflow; conservation of specific angular momentum slows their rotation as the cylindrical radius grows. The P Cygni inset illustrates blueshifted absorption and broad emission; it is not a SIROCCO radiative-transfer calculation or an actual SPECULATE prediction.

There is no build step or package dependency. Optional regression checks use Node's built-in test runner:

```sh
node --test tests/*.test.cjs
```

They check initial section selection, eclipse geometry, photometry, spectral shape changes, synchronized emulator predictions, Roche-surface/stream consistency, resonance, wind acceleration and angular momentum, finite drawing coordinates, pause/resume, the 15-second cycle, hidden-page suspension and reduced-motion controls. After changing the renderer, also inspect all six scenes, the intro and its skip control in a browser at desktop and narrow widths.

Publications and the count refresh from the public ORCID API. The Publications heading links to both ORCID, with the full identifier shown, and Google Scholar. Software records contribute to the total ORCID work count but not the publication count. A dated list in the HTML remains readable if JavaScript or ORCID is unavailable. To update that fallback, replace the publication list and the `data-work-data` JSON together.

## Updating the Places gallery

The Places section uses local images stored in `assets/images/places/`.

To update it:

1. Add the original to `assets/images/places/` and a compressed copy to `assets/images/places/web/`.
2. Update the corresponding `<img>` path, alt text, and caption in `index.html`. Keep photos lazy-loaded.

## Local preview

Open this folder in VS Code (`File` > `Open Folder…`). Select the `AustenWallis.github.io` folder, then open `index.html` in the Explorer.

In the VS Code terminal (`Terminal` > `New Terminal`), run:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000/` in a browser. Changes to HTML, CSS, or JavaScript appear after a browser refresh. Press Ctrl+C in the terminal to stop the server.

## Search visibility

The canonical public URL is `https://austenwallis.github.io/`. The root `sitemap.xml` lists that page, and `robots.txt` points crawlers to the sitemap.

After publishing changes, verify the `https://austenwallis.github.io/` URL-prefix property in Google Search Console, submit `https://austenwallis.github.io/sitemap.xml`, and use URL Inspection to check the homepage and request indexing. An HTML verification tag from Search Console can be placed in the `<head>` of `index.html`; keep it there after verification.
