# CRM Sales Tracking Design System Guardrails (Scalable 3D Edition)

This document establishes the architecture, design principles, and token structures for the CRM Sales Tracking application's design system. It is modeled after industry-leading scalable design systems (such as **eBay Evo**, **Radix Colors**, and **Material Design 3**), ensuring infinite scalability and visual precision.

---

## 1. Visual Foundation & Art Direction

The application is built on a **Default Light-Mode, Typography-Driven (Minimalist)** aesthetic with a dark-theme secondary wrapper. 

### Key Pillars:
1. **Geometric Simplicity**: High-contrast, clean elements with minimal decoration. We avoid heavy gradients, glow effects, or decorative drop-shadows.
2. **WebGL 3D Achievements**: Gamification rewards load a highly polished interactive 3D gem and capsule stand. These models are rendered in real-time using WebGL (via Spline embeds), encouraging the user to rotate and interact with the physical facets of the gem.
3. **Structured Token Hierarchy**: All style declarations are abstracted into separate Primitive, Semantic, and Component token layers to allow global changes (such as colors, radiuses, or fonts) in a single code definition.

---

## 2. Scalable Three-Tier Token Architecture

To scale effectively across web, iOS, Android, and marketing surfaces, the design system employs a **three-tier design token model**:

```
+------------------------------------+
|   Tier 1: Global Primitive Ramps   |  <-- Raw values (e.g., #006CFA, #DE023F)
+------------------------------------+
                  |
                  v
+------------------------------------+
|  Tier 2: Theme-Semantic Variables   |  <-- Functional roles (e.g., --color-bg-canvas)
+------------------------------------+
                  |
                  v
+------------------------------------+
|  Tier 3: Component Scoped Keys     |  <-- Element overrides (e.g., --btn-primary-bg)
+------------------------------------+
```

### 2.1 Tier 1: Primitive Tokens (Global Constants)
These represent the raw design tokens (colors, font constants, grids, and radiuses). They are independent of theme or context.
- **Ramps**: The color palette defines full 10-step ramps (50, 100, 200, 300, 400, 500, 600, 700, 800, 900) for every color family.
- **Grids**: Mathematical layout steps (4px base grid).
- **Typography Constants**: Raw font sizing steps (12px, 14px, 16px, 18px, 20px, 24px, 32px).

### 2.2 Tier 2: Semantic Tokens (Theme-Contextual Mappings)
These map Tier 1 primitives to contextual names representing functional roles. Semantic tokens shift values when toggling between Light and Dark modes.
- **Canvas States**: `--color-bg-canvas` (primary body background), `--color-bg-surface` (card panels), `--color-bg-surface-hover`.
- **Text States**: `--color-text-primary` (main headings), `--color-text-secondary` (body copy), `--color-text-muted` (subtext/labels).
- **Border States**: `--color-border-subtle` (light gray lines), `--color-border-default` (standard dividers), `--color-border-focus` (input active states).
- **Interactive Actions**: `--color-action-primary` (CTAs), `--color-action-secondary` (secondary controls).

### 2.3 Tier 3: Component Tokens (Scoped Overrides)
These variables are tied to specific elements. They inherit from Tier 2, but allow local overrides.
- **Example**: `--switch-track-bg: var(--color-bg-interactive);` or `--avatar-overlap-margin: -8px;`.

---

## 3. Color Token Scale & Ramps

Our color tokens utilize full, scalable ramps matching the color palette specifications:

### 3.1 Primitives (Base Ramps)

* **Grays (Neutral)**: `#ffffff` (White) $\rightarrow$ `#f5f6f8` (50) $\rightarrow$ `#e1e2e6` (100) $\rightarrow$ `#c2c4cc` (200) $\rightarrow$ `#9497a2` (300) $\rightarrow$ `#737682` (400) $\rightarrow$ `#555863` (550) $\rightarrow$ `#3c3e47` (700) $\rightarrow$ `#25262c` (800) $\rightarrow$ `#0f1015` (900) $\rightarrow$ `#000000` (Black).
* **Sapphire — UI system (`00b-Sapphire`)**: `#218aea` (base) $\rightarrow$ `#ebf5fe` (100) $\rightarrow$ `#c1e0fd` (200) $\rightarrow$ `#7cbefb` (300) $\rightarrow$ `#218aea` (400) $\rightarrow$ `#1666af` (500) $\rightarrow$ `#0b4377` (600) $\rightarrow$ `#032442` (700).
* **Sapphire — gamification (`00c-Sapphire`)**: `#218aea` (base) $\rightarrow$ `#ebf1fe` (100) $\rightarrow$ `#c1d5fd` (200) $\rightarrow$ `#7caffb` (300) $\rightarrow$ `#218aea` (400) $\rightarrow$ `#1666af` (500) $\rightarrow$ `#0b4377` (600) $\rightarrow$ `#032442` (700). This ramp is reserved for achievement and reward surfaces.
* **Ruby (Red)**: `#ffebef` (50) $\rightarrow$ `#ffd0da` (100) $\rightarrow$ `#ffa3b8` (200) $\rightarrow$ `#ff708d` (300) $\rightarrow$ `#f75276` (400) $\rightarrow$ `#de023f` (500) $\rightarrow$ `#a80029` (600) $\rightarrow$ `#80001f` (700) $\rightarrow$ `#540013` (800) $\rightarrow$ `#42000d` (900).
* **Topaz (Gold)**: `#fff9e6` (50) $\rightarrow$ `#fff0cc` (100) $\rightarrow$ `#ffecc2` (200) $\rightarrow$ `#ffd685` (300) $\rightarrow$ `#f5c242` (400) $\rightarrow$ `#eaa115` (500) $\rightarrow$ `#ac7005` (600) $\rightarrow$ `#855602` (700) $\rightarrow$ `#5a3900` (800) $\rightarrow$ `#4a2e00` (900).
* **Amethyst (Purple)**: `#f7f2ff` (50) $\rightarrow$ `#ebd6ff` (100) $\rightarrow$ `#d1b3ff` (200) $\rightarrow$ `#be94ff` (300) $\rightarrow$ `#ac6eff` (400) $\rightarrow$ `#8719ff` (500) $\rightarrow$ `#640ec4` (600) $\rightarrow$ `#4c0a96` (700) $\rightarrow$ `#330466` (800) $\rightarrow$ `#24005c` (900).

---

## 4. WebGL 3D Interactive Achievements

The achievements modal renders a fully interactive 3D model embedded from **Spline**.

### 4.1 Integration & URL Mapping
The core assets load the Spline viewer link:
- **Spline Source**: `https://my.spline.design/abovebeyond-a339ec9b8cffcb3d74a82a7c46957a4f/`

### 4.2 Dynamic Colorization via CSS Filters
Rather than loading four separate massive WebGL models (which slows load speeds and increases network footprint), the design system uses a single Spline link and applies **CSS hue filters** to dynamically map the materials to the four gem categories:

```css
/* Sapphire (Blue - Default) */
.category-sapphire .crm-spline-iframe {
  filter: none;
}

/* Ruby (Red) */
.category-ruby .crm-spline-iframe {
  filter: hue-rotate(140deg) saturate(1.2);
}

/* Topaz (Gold) */
.category-topaz .crm-spline-iframe {
  filter: hue-rotate(190deg) saturate(1.1) brightness(1.05);
}

/* Amethyst (Purple) */
.category-amethyst .crm-spline-iframe {
  filter: hue-rotate(70deg) saturate(1.2);
}
```

### 4.3 Iframe Structure & Responsiveness
To prevent the iframe from blocking user scroll gestures, its container must set `pointer-events: none` during page scrolling, enabling active interaction only when the modal is fully opened.
The iframe is centered inside the `.crm-achievement-stage` element and sized using responsive viewport metrics.
