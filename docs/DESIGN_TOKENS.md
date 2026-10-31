# GnaniFlow Design Tokens

Research source: [Gnani AI homepage](https://www.gnani.ai/), viewed 27 October 2026. These are original product tokens inspired by the site's visual character; they do not use Gnani's logo, artwork, or marketing copy.

## Observed visual language

- Warm off-white page surfaces and black/dark text form the baseline.
- The landing hero uses a large, editorial headline, restrained navigation, and a high-contrast black call-to-action.
- A soft, broad sunrise-like spectrum moves from warm yellow/orange through blush and lavender into blue. It is an atmospheric accent, not a repeating card or button treatment.
- Product content below the hero uses clear sections, generous whitespace, and a more restrained neutral palette.
- The overall impression is enterprise-focused, editorial, and confident. The desktop layout uses a compact header and a centered hero; mobile collapses navigation and retains one obvious primary action.
- Gnani's website uses its own brand assets and typography. GnaniFlow must use original assets and **Open Sans only**, per product requirements.

## Product palette

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--gf-canvas` | `#F8F7F3` | `#151613` | Main app background |
| `--gf-surface` | `#FFFFFF` | `#20211E` | Editor, navigation and dialogs |
| `--gf-surface-muted` | `#F0EFEA` | `#292A26` | Secondary panels and inputs |
| `--gf-ink` | `#191A17` | `#F4F3EE` | Main text and high-contrast controls |
| `--gf-ink-muted` | `#686A63` | `#B2B3AA` | Supporting copy and labels |
| `--gf-border` | `#DDDED7` | `#3A3B35` | Dividers and control borders |
| `--gf-brand` | `#252622` | `#F4F3EE` | Primary action background |
| `--gf-brand-contrast` | `#FFFFFF` | `#191A17` | Text on primary action |
| `--gf-signal` | `#B75D36` | `#E58B63` | Recording, focus, and key accent |
| `--gf-positive` | `#2F7659` | `#78B99A` | Completed and online states |
| `--gf-warning` | `#8C641A` | `#E5BD69` | Degraded provider and quota warnings |
| `--gf-danger` | `#A83F3A` | `#F08A82` | Errors and destructive actions |

### Sunrise accent

Reserve the homepage spectrum for one branded hero or recording-completion accent. Keep it low contrast and broad; do not use it as a background on every card, control, or screen.

```css
--gf-sunrise: linear-gradient(
  105deg,
  #F1D891 0%,
  #EFB69F 36%,
  #D5B7D4 67%,
  #9ABBD8 100%
);
```

## Typography

- One family throughout: `Open Sans, sans-serif`.
- Load only the exact Google Fonts stylesheet specified in the product brief; do not load font files from other families.
- Use weight 300–800, size, line height, and letter spacing for hierarchy. Use tabular numerals for timers and stats.
- Configure Tailwind `sans`, `mono`, and `serif` aliases to the same Open Sans family. Enforce the single-family rule in a CSS lint/test.
- Use Lucide inline SVG icons with consistent stroke width; do not introduce icon fonts.

## Spacing, radius, and elevation

- Base spacing unit: 4 px. Primary spacing steps: 4, 8, 12, 16, 24, 32, 48, 64.
- Control height and touch target: at least 44 px.
- Radius scale: 6 px for compact controls, 10 px for panels, 16 px for sheets/dialogs. Pills only for status and segmented controls.
- One restrained shadow for floating sheets and dialogs; avoid glass blur, neon glow, and stacked shadows.
- Recording state may use one soft signal-colored halo. Other motion should communicate state changes only and honor reduced-motion preferences.

## Layout and component direction

- Marketing: asymmetric editorial copy paired with the real dictation UI, not an abstract voice illustration or a row of identical cards.
- Desktop app: fixed navigation rail and a focused dictation/editor workspace; history uses list/detail panes.
- Tablet: compact rail with adaptive workspace.
- Mobile: bottom navigation, thumb-reachable record control, full-screen dictation sheet, and bottom sheets for language/tone.
- Use clear empty, loading, offline, denied-permission, rate-limited, and provider-error states.
- Light mode is the default. Dark mode uses the same warm neutral/signal palette, not a blue/purple re-skin.

## Tailwind mapping proposal

When implementation is approved, expose `colors.gnaniFlow.{canvas,surface,surfaceMuted,ink,inkMuted,border,brand,brandContrast,signal,positive,warning,danger}`, spacing from the 4 px scale, and the radius scale above. Keep CSS variables authoritative so runtime theme changes and non-Tailwind components stay consistent.
