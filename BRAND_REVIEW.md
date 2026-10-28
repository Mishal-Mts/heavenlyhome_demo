# Brand review: Heavenly Homes → Defender Villas

The site is being rebranded to **Defender Villas** (defendervillas.com). Brand surfaces (logo, header, footer, page title, meta tags, WhatsApp messages, vCard, form consent line, aria-labels, alt text) now use `CONFIG.brand.name` in `js/main.js`.

The places below are **narrative copy**: the client's own sentences that use "Heavenly Homes" as the **project name**. They are **unchanged** until you decide one of these:

- **A. Keep "Heavenly Homes" as the project name:** Defender Villas is the brand and Heavenly Homes is the project. Nothing below changes. Optionally set `CONFIG.brand.project = 'Heavenly Homes'`.
- **B. Rename fully:** every line below changes to "Defender Villas". Each change needs the client's approval because it alters their copy.

Line numbers refer to `index.html` at the end of Phase 0.

| # | Location | Line | Exact text |
|---|----------|------|------------|
| 1 | About section, first paragraph | 115 | "Heavenly Homes is a limited gated community close to the Arabian Sea, combining contemporary villa architecture with quality construction and carefully planned common infrastructure." |
| 2 | Villas section heading (h2) | 133 | "Two ways to own at Heavenly Homes" |
| 3 | Walkthrough section heading (h2) | 169 | "Walk through Heavenly Homes" |
| 4 | Location map (schematic SVG), project label | 253 | "Heavenly Homes" |
| 5 | Our Group section heading (h2) | 333 | "Who’s who behind Heavenly Homes" |
| 6 | Our Group, project card title (h3) | 353 | "Heavenly Homes" |
| 7 | Our Group, project card description | 354 | "Premium gated beach villas, a project by Defender Real Estates & Builders Limited." (no project name, listed because it sits under item 6) |

The project card (item 6) is listed rather than renamed: its title names the project, not the brand. Its logo is already the new Defender logo, so for now the card reads "[Defender logo] Heavenly Homes".

## Logo tagline "BY DEFENDER REAL ESTATES"

- **Where:** the header, under the logo (`index.html` line 50, `<small>BY DEFENDER REAL ESTATES</small>`).
- **Does it duplicate the new logo?** Partly. The new logo is the single word **"Defender"**, so the header now reads "Defender / BY DEFENDER REAL ESTATES". The word "Defender" appears twice, one line apart.
- **Status:** unchanged. Options:
  - remove it;
  - change it to "VILLAS" or "BEACH VILLAS", so the lockup reads as the brand "Defender Villas";
  - keep it as it is.

## Also note

- The supplied logo says **"Defender"**, not "Defender Villas". Alt text and the text fallback say "Defender Villas", as instructed. If a "Defender Villas" lockup exists, please supply it as an SVG or a large transparent PNG.
- The legal promoter name **"Defender Real Estates & Builders Limited"** is unchanged everywhere.
- The old logo is kept, but no longer used, at `images/originals/legacy-logo-heavenly-homes.png`.
