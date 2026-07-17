# Faino Naturalno — Design System

Файно Натурально — a family natural-foods shop from **Berehovo, Zakarpattia** (Central Market, vegetable pavilion, вул. Січені 10). It sells hand-selected dried fruits, nuts, candied fruit, tea, spices, seasonings, cold-pressed oils, and gift sets. The brand feeling is warm, homely, and Carpathian — *"файно"* means *good, honest, done-right*.

This design system supports the brand's **e-commerce shop** surface. It is built from scratch around the one asset provided — the marigold star-anise logo — plus a spice-illustrated business card.

## Sources
- `uploads/logo-1784215793726.png` → copied to `assets/logo.png` — the primary logo (yellow starburst + star-anise, brown wordmark ФАЙНО НАТУРАЛЬНО).
- `uploads/brand_refs-1784215820878.png` → copied to `assets/business-card.png` — business card with the product list, contacts, and a botanical spice border.
- No codebase, Figma, or existing website was provided. The visual system (color ramps, type pairing, spacing, components) is **derived**, not copied from a live product. Iterate with the team to confirm.

Contacts on the card: +38 (095) 348 85 36 (Олена), +38 (066) 839 00 05 (Андрій).

---

## CONTENT FUNDAMENTALS
- **Language:** Ukrainian only. Sample copy is Ukrainian throughout.
- **Address form:** polite plural «ви» ("зібрали для вас", "передзвонимо"). Warm and personal, never corporate.
- **Tone:** homely, honest, grounded in place (Закарпаття, домашнє, урожай, руками). The name pun — *файно* (good/nice) — sets the register: cheerful, unpretentious, trustworthy.
- **Casing:** sentence case for body and product names. UPPERCASE reserved for short eyebrows/labels with wide tracking (echoes the logo's circular caps). Display headlines in mixed case.
- **Avoid:** Russian, бюрократизм/канцеляризм ("оптимальное решение", "осуществляется"), hype-marketing superlatives, and **emoji** — never used. Warmth comes from words and the hand-drawn accent font, not from emoji.
- **Numbers & prices:** hryvnia `₴`, sold by `кг` or `шт`. Prices are set in the hand-drawn Caveat font — a signature detail, like a chalk market tag.
- **Examples**
  - Так: «Зібрали для вас найкраще з осіннього врожаю», «Смачно, як удома».
  - Ні: «Оптимальный выбор для вашего рациона», «BEST PRICE 🔥».

## VISUAL FOUNDATIONS
- **Colors.** Primary is **marigold yellow** `--marigold-400 #F5B800` (the logo field), paired with **espresso brown** `--espresso-800 #3B2412` for ink and dark surfaces. Secondary warm browns (**cinnamon/amber**) come from the star-anise mark. Neutrals are **kraft** paper tones (cream page `#FBF6EA`, card white, tan borders) — never cool grey. Accents: **garden green** `#5B7A3A` (fresh/eco) and **chili red** `#B23A2E` (sale/alert), both pulled from the spice-border illustration. Max one or two color fields per view; marigold is used in confident blocks, not sprinkled.
- **Type.** Display **Unbounded** (800) for headlines — a Ukrainian-foundry font with poster energy that nods to the bold logo caps. Body **Manrope** (400–700), warm and highly legible. Accent **Caveat** (hand-drawn) for prices, tags, and short notes. All three carry full Cyrillic. See the font substitution note below.
- **Spacing.** 4px base; generous section padding (32–96px). Cards breathe (24–32px pad).
- **Backgrounds.** Warm kraft-cream fields, occasional espresso-dark feature blocks, and full-marigold promo panels. No aggressive gradients. The spice-border illustration from the business card can frame hero/promo areas as a repeating botanical motif (asset: `assets/business-card.png`). Product photography is warm-toned, natural light, close-up on texture.
- **Animation.** Gentle and subtle — `--ease-out` fades and small translateY lifts (2–3px) on card hover. No bounce, no long durations (120–340ms).
- **Hover states.** Buttons darken ~6% (`brightness .94`) and press down 1px; product cards lift 3px and gain `--shadow-md`; tags shift border to a stronger tone; links go from cinnamon to espresso + underline.
- **Press states.** Small downward nudge (buttons) or `scale(.94)` (icon buttons). Color unchanged.
- **Borders.** Slightly heavier than usual (`--border-width 1.5px`) for a crafted, drawn feel; kraft-tan color. Cards use subtle borders + a very soft shadow.
- **Shadows.** Warm, espresso-tinted (`rgba(59,36,18,…)`), low and soft — kraft-paper depth, never a hard cool drop shadow. No inner shadows.
- **Radii.** Soft and hand-made: 14px (md) default for cards/inputs/buttons, up to 20–28px for large surfaces; pill for chips, badges, and steppers.
- **Cards.** White surface, 1.5px kraft border, `--radius-lg` (20px), `--shadow-xs` at rest → `--shadow-md` on hover. Cream and ink variants for section variety.
- **Transparency & blur.** Used sparingly — light scrims over hero imagery for text legibility; no glassmorphism.
- **Layout.** Max container 1200px; sticky header (~76px). Product grids of soft cards. Marigold and ink blocks break the cream rhythm.

## ICONOGRAPHY
- **System:** [Lucide](https://lucide.dev) line icons (CDN), stroke width 1.75, `currentColor`. Clean and consistent, warm when tinted espresso/cinnamon. This is a **substitution** — no icon set was provided; flagged below.
- Access via the `Icon` component (`<Icon name="shopping-bag" />`). The host page must load the Lucide UMD script; cards and the UI kit do this and call `lucide.createIcons()`.
- Common glyphs: `shopping-bag`, `heart`, `search`, `leaf`, `truck`, `gift`, `phone`, `map-pin`, `star`, `menu`.
- **Emoji:** not used anywhere. **Unicode symbols:** only `₴` (currency) and `–/×` inside the quantity stepper.
- The **star-anise mark** inside the logo is illustrative, not an icon — do not redraw it; use `assets/logo.png`.

## ⚠️ Substitutions to confirm (please send originals)
- **Fonts:** No brand fonts were provided. Unbounded / Manrope / Caveat are chosen Google Fonts (full Cyrillic) approximating a warm rustic register. If Faino has house fonts, send the files and I'll swap them into `tokens/fonts.css`.
- **Icons:** Lucide substituted for an unknown icon set.
- **No standalone logo mark:** only the full lockup (starburst + wordmark) exists. There is no separate icon-only mark; the full logo is used everywhere a mark is needed.

---

## Index / manifest
**Root**
- `styles.css` — global entry (consumers link this). `@import`s only.
- `readme.md` — this file.
- `SKILL.md` — Agent-Skills-compatible entry point.
- `thumbnail.html` — homepage tile.

**Tokens** (`tokens/`) — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `base.css`.

**Components** (`components/`) — React primitives (`window.FainoNaturalnoDesignSystem_69873b`):
- `core/` — **Button**, **IconButton**, **Badge**, **Tag**, **Icon**
- `forms/` — **Input**, **QuantityStepper**
- `commerce/` — **PriceTag**, **ProductCard**, **Rating**
- `layout/` — **Card**, **SectionHeader**

**Guidelines** (`guidelines/`) — foundation specimen cards (Colors, Type, Spacing, Brand).

**UI kits** (`ui_kits/shop/`) — interactive shop recreation: home, category listing, product page, cart.

**Assets** (`assets/`) — `logo.png`, `business-card.png`.

### Intentional additions
Built from a brand with no defined component library, so a standard shop set was authored. Notable choices beyond bare primitives:
- **Icon** — thin wrapper over Lucide so the glyph system is swappable in one place.
- **PriceTag / ProductCard / QuantityStepper / Rating** — commerce primitives the shop surface needs; ProductCard composes the others rather than duplicating them.
