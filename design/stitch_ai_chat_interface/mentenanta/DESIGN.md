# Design System Document: High-End Public Service Interface

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Monolith"**
This design system moves away from the cluttered, bureaucratic layouts typical of public institutions. Instead, it adopts an editorial, high-end dark mode aesthetic that commands respect through "The Digital Monolith" philosophy: a sense of architectural stability, immense clarity, and purposeful depth. 

We are not building a simple "HelpDesk"; we are building a premium digital concierge for the citizens of Cluj-Napoca. By utilizing intentional asymmetry, expansive negative space, and a sophisticated tonal palette, we ensure that users aged 40+ feel empowered, not overwhelmed. The interface doesn't just display information—it *stages* it.

---

## 2. Colors & Tonal Depth
The palette is rooted in a "Deep Navy and Charcoal" foundation, designed to reduce eye strain while maintaining a high-contrast ratio for accessibility.

### The Palette (Material Design Tokens)
*   **Base:** `surface` (#131313) and `surface_container_low` (#1C1B1B).
*   **Accents:** `primary` (#A2C9FF) for actions; `secondary` (#B4CAD6) for supporting elements.
*   **Content:** `on_surface` (#E5E2E1) for high-readability text; `on_surface_variant` (#C2C6D3) for secondary metadata.

### The "No-Line" Rule
**Explicit Instruction:** Do not use `1px solid` borders to define sections. 
Boundaries are created through **Background Color Shifts**. To separate a sidebar from a main content area, use `surface_container_low` against `surface`. If a card needs to stand out, use `surface_container_high`. 

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
*   **Level 0 (Background):** `surface` (#131313).
*   **Level 1 (Main Content Area):** `surface_container_low` (#1C1B1B).
*   **Level 2 (Interactive Cards):** `surface_container_high` (#2A2A2A).
*   **Level 3 (Floating Modals/Popovers):** `surface_bright` (#393939).

### Glass & Gradient Rule
For high-priority CTAs (e.g., "Trimite Solicitare"), use a subtle linear gradient from `primary` (#A2C9FF) to `primary_container` (#005494) at a 135-degree angle. This adds "soul" and a tactile, premium feel that flat hex codes lack.

---

### 3. Typography: The Editorial Voice
We use **Public Sans** to bridge the gap between institutional authority and modern accessibility. 

*   **Display-MD (2.75rem):** Reserved for page titles like "Centru de Suport". High impact, generous leading.
*   **Headline-SM (1.5rem):** For section headers (e.g., "Întrebări Frecvente").
*   **Title-LG (1.375rem):** The primary reading size for ticket titles. 
*   **Body-LG (1.0rem):** This is our baseline for all citizen-facing text. **Never go below 1rem (16px)** for body copy to ensure 40+ accessibility.
*   **Label-MD (0.75rem):** Only for non-critical metadata (timestamps, ID numbers), using `on_surface_variant`.

**Hierarchy Tip:** Contrast the weight. Use `Bold` for Headlines and `Regular` with increased line-height (1.6) for Body text to ensure the Romanian diacritics (ă, î, ș, ț, â) remain perfectly legible.

---

### 4. Elevation & Depth
Traditional drop shadows are forbidden. We use **Tonal Layering** and **Ambient Shadows**.

*   **The Layering Principle:** Depth is achieved by placing a `surface_container_highest` element over a `surface_dim` background. The color delta provides the "lift."
*   **Ambient Shadows:** For floating elements (Modals/Dropdowns), use a shadow with a 40px blur, 0% spread, and 6% opacity using the `on_background` color. This mimics soft, natural light.
*   **The Ghost Border:** If accessibility requires a stroke (e.g., in high-glare environments), use the `outline_variant` token at **15% opacity**. It should be felt, not seen.
*   **Backdrop Blur:** Floating navigation bars must use `surface` at 80% opacity with a `20px` backdrop-blur. This creates a "frosted glass" effect that keeps the user grounded in their current context.

---

### 5. Components

#### Buttons (Butoane)
*   **Primary:** Gradient (`primary` to `primary_container`), `xl` roundedness (0.75rem). Text: `on_primary_fixed` (Bold).
*   **Secondary:** No fill. `Ghost Border` (15% opacity `outline`). Text: `primary`.
*   **Tertiary:** No fill, no border. For "Anulează" (Cancel) actions.

#### Input Fields (Câmpuri de Text)
*   **Container:** `surface_container_high`. 
*   **Indicator:** Instead of a full border, use a 2px bottom-accent in `primary` when focused.
*   **Label:** Always visible above the input, never placeholder-only (Accessibility rule).

#### Cards & Lists
*   **The Divider Ban:** Never use horizontal lines. Use `spacing-6` (2rem) of vertical whitespace or a shift to `surface_container_lowest` for the card background.
*   **Interactive State:** On hover, a card should transition its background to `surface_bright` and shift -4px on the Y-axis.

#### Progress Indicators (Status Solicitare)
*   Use `secondary_fixed_dim` for "În Lucru" (In Progress).
*   Use `primary` for "Finalizat" (Completed).
*   Avoid "Traffic Light" colors (Red/Green) unless it's a critical error, to maintain the sophisticated Navy/Charcoal aesthetic.

---

### 6. Do's and Don'ts

**Do:**
*   **DO** use Romanian terminology that is empathetic (e.g., "Cum vă putem ajuta?" instead of "Selectați o opțiune").
*   **DO** use the `24` (8.5rem) spacing token for top-level page margins to create an "Airy" feel.
*   **DO** ensure all touch targets are at least `48px` in height for ease of use on mobile.

**Don't:**
*   **DON'T** use pure black (#000000). It kills the depth of the Navy tones.
*   **DON'T** use 1px dividers. They create "visual noise" that fatigues older eyes.
*   **DON'T** use tight letter-spacing. For dark mode, increasing letter-spacing by 1-2% improves legibility as light text tends to "bleed" on dark backgrounds.
*   **DON'T** use "Standard" blue. Use the system's `primary` (#A2C9FF) which is tuned for dark-mode luminance.