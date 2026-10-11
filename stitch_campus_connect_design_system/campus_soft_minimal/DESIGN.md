---
name: Campus Soft Minimal
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#464554'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#777586'
  outline-variant: '#c7c4d7'
  surface-tint: '#5148d7'
  primary: '#2a14b4'
  on-primary: '#ffffff'
  primary-container: '#4338ca'
  on-primary-container: '#c1beff'
  inverse-primary: '#c3c0ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#353a44'
  on-tertiary: '#ffffff'
  tertiary-container: '#4c515c'
  on-tertiary-container: '#c0c4d0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#100069'
  on-primary-fixed-variant: '#372abf'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#dee2ef'
  tertiary-fixed-dim: '#c2c6d3'
  on-tertiary-fixed: '#171c25'
  on-tertiary-fixed-variant: '#424751'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.625rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  code-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.25rem
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  gutter-lg: 2rem
  margin: 1.5rem
  margin-sm: 1rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a tranquil, focused digital environment engineered for students, educators, and university administrators. The aesthetic marries Scandinavian minimalism with collegiate clarity, stripping away academic clutter in favor of breathing room, subtle contrast, and cognitive ease.

The interface evokes quiet focus, reassurance, and modern structure. It counters traditional institutional density by adopting spacious layouts, soft atmospheric borders, and restful off-white planes. Surfaces feel light, organized, and quietly authoritative without visual fatigue over long study and administration sessions.

## Colors

The palette relies on gentle, eye-protective surface layers to support extended screen reading:

- **Canvas & Backgrounds:** Base canvas begins at `#F9FAFB` (canvas neutral), shifting to pure `#FFFFFF` for primary cards and focus areas, and `#F3F4F6` for subtle nested wells, search tracks, and sidebar foundations.
- **Brand Accents:** Deep Indigo (`#4338CA`) acts as the anchor for primary interaction points, active selections, and decisive calls-to-action, paired with an electric-soft indigo (`#4F46E5`) for interactive hover states. Pastels (`#EEF2FF`) serve as non-intrusive focus highlights, active pill backgrounds, and subtle tint layers.
- **Slate Typographic Neutrals:** `#1E293B` provides high-legibility charcoal for headers and body reading without harsh absolute blacks. Secondary metadata, timestamps, and utility captions utilize `#64748B`.
- **System Delimiters:** Borders and hairline dividers rely on `#E2E8F0` at 80% opacity (`rgba(226, 232, 240, 0.8)`), providing crisp spatial definition without optical hardness.

## Typography

The type system blends the human, modern geometry of Plus Jakarta Sans for structural titles and wayfinding labels with the neutral, hyper-legible cadence of Inter for content consumption and data tables:

- **Display & Section Headers:** Plus Jakarta Sans provides friendly, contemporary authority. Use tighter letter-spacing for headlines to create an editorial, cohesive appearance.
- **Body & Longform:** Inter delivers maximum readability across varying pixel densities. Line heights remain generous (1.5–1.6× font size) to prevent reading fatigue during syllabi reviews and research reading.
- **Labels & Microcopy:** Badges, controls, and navigation tags use Plus Jakarta Sans in medium and semi-bold weights for rapid legibility at small scales.

## Layout & Spacing

The layout operates on an 8pt base grid with an adaptable 12-column layout on desktop, transitioning to 8 columns on tablet, and 4 columns on mobile. 

- **Desktop (1024px+):** Max-width containment standardizes at 1280px. Margins set to `margin-lg` (3rem) with 2rem column gutters. Content utilizes wide negative spaces around modules to preserve calmness.
- **Tablet (768px – 1023px):** Side margins compress to `margin` (1.5rem) with 1.5rem gutters. Dashboards reflow from multi-column metrics to stacked primary-secondary pairs.
- **Mobile (< 768px):** Margins shift to `margin-sm` (1rem) with 1rem column gutters. Multi-column cards stack vertically, while dense data sets transition to horizontal snap-scroll formats.

## Elevation & Depth

Visual hierarchy avoids heavy skeuomorphism and stark shadows. Depth is achieved via crisp surface layering, soft boundaries, and airy ambient occlusion:

- **Surface Tiers:** Base backdrop (`#F9FAFB`) supports primary cards (`#FFFFFF`). Recessed input wells and secondary panels utilize `#F3F4F6`.
- **Atmospheric Outlines:** All elevated containers feature delicate structural borders defined by `1px solid rgba(226, 232, 240, 0.8)`. This creates a defined structural silhouette on off-white backgrounds without needing heavy dark lines.
- **Delicate Ambient Shadows:**
  - *Resting Card Elevation:* `0 1px 3px 0 rgba(15, 23, 42, 0.03), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`
  - *Floating / Hover Elevation:* `0 10px 25px -5px rgba(15, 23, 42, 0.04), 0 8px 10px -6px rgba(15, 23, 42, 0.02)`
  - *Modals & Dropdowns:* `0 20px 30px -10px rgba(15, 23, 42, 0.07), 0 10px 10px -5px rgba(15, 23, 42, 0.03)`

## Shapes

The design uses an approachable, softly geometric curvature scale centered on `rounded-xl` containers for main content blocks:

- **Cards and Panels:** Standardize on `rounded-xl` (1.5rem / 24px) to give content enclosures a tailored, approachable presence.
- **Interactive Controls:** Buttons, text fields, and dropdown triggers utilize `rounded-lg` (0.75rem–1rem / 12–16px) for tactile ergonomics.
- **Indicators and Badges:** Pill shapes (`rounded-full` / 9999px) are dedicated exclusively to metadata chips, status indicators, and segment switches to contrast cleanly with rectangular card architectures.

## Components

### Buttons
- **Primary:** Solid `#4338CA` background, `#FFFFFF` text, `rounded-lg`, subtle shadow. Hover transitions to `#4F46E5`. Active state scales smoothly to `0.98`.
- **Secondary:** `#FFFFFF` background with `1px solid rgba(226, 232, 240, 0.8)`, text `#1E293B`. Hover shifts surface to `#F9FAFB`.
- **Ghost / Tertiary:** Transparent background, text `#4338CA`. Hover applies `#EEF2FF` fill.

### Cards
- Constructed with `#FFFFFF` background, `rounded-xl` curvature, `1px solid rgba(226, 232, 240, 0.8)`, and resting ambient shadow. Inner spacing scales between `1.5rem` and `2rem`. Interactive cards shift border to `#CBD5E1` and translate up `-2px` on hover.

### Badges & Pill Chips
- Built with full pill curvature (`rounded-full`), `space-xs` vertical padding, and `space-sm` to `space-md` horizontal padding.
- **Academic Status / Primary Pill:** `#EEF2FF` background, `#4338CA` text, `font-weight: 600`.
- **Neutral Tag:** `#F1F5F9` background, `#64748B` text.

### Form Inputs
- Background `#FFFFFF` or `#F9FAFB`, enclosed in `1px solid rgba(226, 232, 240, 0.9)`, `rounded-lg`. Typography is `body-md` in `#1E293B` with `#94A3B8` placeholder copy. Focus states display an active border `#4338CA` complemented by an indigo-tinted focus glow ring (`0 0 0 3px rgba(79, 70, 229, 0.12)`).

### Checkboxes & Radios
- Square-rounded (4px radius) for checkboxes; circular for radios. Inactive border is `1.5px solid #CBD5E1`. Checked state fills `#4338CA` with crisp white iconography.

### Carousels & Horizontal Rails
- Enclosed within full-width or card-bound viewports featuring gentle gradient fade masks (`to transparent`) on scroll edges.
- Pagination indicators rely on elongated active indigo pill indicators alongside muted circular dots (`#E2E8F0`). Navigation arrow controls feature circular floating cards (`#FFFFFF`, `rounded-full`, ambient shadow, `1px solid rgba(226, 232, 240, 0.8)`).