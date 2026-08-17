# Fold — Design System

> Teenage Engineering-inspired industrial minimalism. Utilitarian, honest, deliberate. Every pixel should feel intentional. The UI is built to get out of your way and let you write.

---

## 1. Design Philosophy

Fold's aesthetic is rooted in **Teenage Engineering's industrial hardware design language**. The guiding principles:

- **Honesty** — No decoration without purpose. Every visual element earns its place.
- **Utility** — The interface reads like a precision instrument, not a consumer app.
- **Restraint** — Flat colors, monospace type, minimal chrome. Let content breathe.
- **Tactility** — Every interaction provides physical, mechanical feedback through haptics and spring physics.
- **Texture** — Flat is boring. Every surface carries subtle film grain.

The result should feel like a high-end hardware device — a field recorder, a synthesizer, a precision tool — not a social media app.

---

## 2. Color System

Defined in `src/constants/theme.ts`. Two themes: light and dark.

### Light Theme

| Token | Hex | Usage |
|---|---|---|
| `background` | `#FFFFFF` | Pure white. Main canvas. |
| `backgroundElement` | `#FFFFFF` | Cards, elevated surfaces. |
| `backgroundSurface` | `#FFFFFF` | Secondary surfaces. |
| `backgroundSelected` | `#F2F2F2` | Pressed/selected states. |
| `text` | `#000000` | Pure black. Primary text. |
| `textSecondary` | `#878787` | Muted grey. |
| `textMuted` | `#878787` | Muted grey. Metadata, timestamps. |
| `border` | `#878787` | Standard borders. |
| `borderStrong` | `#000000` | Emphasized borders. |
| `accent` | `#000000` | Black. The primary action color is the absence of color. |
| `accentWarm` | `#F27A1A` | TE Orange. Primary CTA buttons, notification dots. |
| `destructive` | `#FF3B30` | Delete actions, recording indicators. |
| `glassTintDark` | `rgba(0, 0, 0, 0.85)` | Glass overlays. |

### Dark Theme

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0F0F0F` | Very dark grey, almost black. |
| `backgroundElement` | `#1A1A1A` | Cards. |
| `backgroundSurface` | `#1F1F1F` | Secondary surfaces. |
| `backgroundSelected` | `#333333` | Pressed/selected states. |
| `text` | `#EFEFEF` | Soft white ("Snow"). Reduces eye strain. |
| `textSecondary` | `#DCDCDC` | Muted snow. |
| `textMuted` | `#BDBDBD` | Bright grey for legibility. |
| `border` | `#333333` | Subtle separators. |
| `borderStrong` | `#EFEFEF` | Emphasized borders. |
| `accent` | `#EFEFEF` | White accents. |
| `accentWarm` | `#FF4B00` | Brighter TE Orange for dark mode. |
| `destructive` | `#FF3B30` | Delete actions. |
| `glassTintDark` | `rgba(25, 25, 25, 0.85)` | Glass overlays. |

### Theme System

Three modes: `light`, `dark`, `system` (follows OS preference).

Managed by `AppThemeProvider` in `src/hooks/use-theme.tsx`:
- Resolves the mode against the system color scheme.
- Exposes `isDark: boolean` and `colors` via React Context.
- `useTheme()` returns the color tokens directly.
- `useThemeContext()` returns `{ isDark, colors }`.

The theme is stored in `user_settings` as a string and cycled in Settings: light → dark → system.

---

## 3. Typography

### System Font

**JetBrains Mono** is the universal UI font. Used for everything: labels, body text, metadata, timestamps, buttons, navigation. Six weights are loaded:

| Weight | Usage |
|---|---|
| Light | Rarely used, subtle emphasis. |
| Regular | Body text, metadata, default. |
| Medium | Buttons, labels, timestamps. |
| SemiBold | Section titles, save buttons. |
| Bold | Headings, onboarding title, settings labels. |
| Italic | Reserved. |

### Content Fonts

The compose screen offers 14 typefaces for memory content, loaded via `@expo-google-fonts`:

| Font | Character |
|---|---|
| JetBrains Mono | System default. Technical, precise. |
| Inter | Clean sans-serif. |
| Playfair Display | Elegant serif. |
| Comic Neue | Casual rounded. |
| Space Grotesk | Geometric sans. |
| Bebas Neue | Condensed caps. |
| Caveat | Handwriting. |
| Dancing Script | Flowing script. |
| Righteous | Bold rounded. |
| EB Garamond | Classical serif. |
| Amatic SC | Tall thin caps. |
| Pacifico | Retro script. |
| Press Start 2P | 8-bit pixel. |
| Permanent Marker | Marker script. |

### Type Scale

| Context | Font | Size | Weight | Letter Spacing |
|---|---|---|---|---|
| Onboarding title | JetBrains Mono | 48 | Bold | 8 |
| Settings title | JetBrains Mono | 18 | Bold | 2 |
| Card body text | JetBrains Mono | 21 | Regular | 0 |
| Compose body | JetBrains Mono | 21 | Regular | 0 |
| Default text | JetBrains Mono | 16 | Medium | 0 |
| Small text | JetBrains Mono | 14 | Medium | 0 |
| Metadata/timestamps | JetBrains Mono | 11-12 | Medium | 0.3-1 |
| Section headers | JetBrains Mono | 11 | Medium | 2 |
| Recording label | JetBrains Mono | 11 | Medium | 2 |
| Technical labels | JetBrains Mono | 9-10 | Medium | 1-2 |

### ThemedText Component

`src/components/themed-text.tsx` provides type variants: `default`, `title`, `small`, `smallBold`, `subtitle`, `link`, `linkPrimary`, `code`. Accepts a `themeColor` prop to bind to any theme token.

---

## 4. Spacing System

The number **21** is the base unit (a Fibonacci number). It appears throughout:

| Context | Value |
|---|---|
| `CARD_GAP` | 21 |
| Horizontal padding (compose, archive, settings) | 21 |
| Card text inset | 24 |
| Empty state gap | 21 |
| Media preview gap | 12 |
| Section margin | 40 |

### Golden Ratio

Card height: `Math.min(width * 1.618, height * 0.78)`

The Add button width is `38.2%` of its container (golden ratio derivative).

Card border radius: `34` (golden ratio adjacent).

---

## 5. Visual Motifs

### Film Grain

`src/components/grain-background.tsx`

A base64-encoded noise PNG tiled across every surface using `resizeMode: 'repeat'`. Opacity ranges from 0.03 (subtle) to 0.10 (visible texture). Applied to every screen background, the vinyl record wheel, and biometric gate overlays.

The grain breaks the flatness of digital surfaces, giving them a physical, analog quality — like film stock or anodized aluminum.

### Diagonal Stripes

`src/components/diagonal-stripes.tsx`

SVG pattern hatching at 45 degrees (top-left to bottom-right). Rendered as a static overlay for maximum performance. Used on:

- **Add button** — Orange stripes (`#863800`) on orange background. Hazard-stripe aesthetic.
- **Top bar** — Orange stripes (`#E45B00`) as a ultra-slim technical band.
- **Export stamps** — Subtle texture on branded output.

The pattern uses a pre-calculated 45-degree path instead of a rotated `<Line>` to fix aliasing/stitching artifacts on iOS CoreGraphics.

### Vinyl Record / TP-7 Wheel

`src/components/vinyl-record.tsx`

A Teenage Engineering TP-7 field recorder-inspired spinning wheel. The signature audio visualization component.

**Visual elements:**
- Metallic silver disc (`#D9DCDF`) with border (`#B0B5BA`).
- Fine crosshair lines (horizontal + vertical).
- "96 / 24" decal (top-left, rotated -45deg) — references 96kHz/24-bit audio.
- "3 ◯ M" decal (bottom-right, rotated -45deg) — references 3-minute tape loops.
- Center cap with three mechanical screws, or album art when available.
- Film grain overlay on the disc surface.

**Animation:**
- **Recording**: Clockwise rotation, 3s per revolution, linear easing. Orange dot pulses (0.4 → 1.0 opacity, 800ms each direction).
- **Playback**: Counter-clockwise rotation, same speed. No pulse.
- **Paused**: Holds current rotation.
- **Scrubbing**: Accepts a `scrubOffset` SharedValue for manual rotation control.

### ASCII Art

Used throughout for system states, mascots, and empty states. Always rendered in JetBrains Mono.

| Location | Art | Meaning |
|---|---|---|
| Empty state | Box outline with dashes | "MEMORY_BANK : EMPTY" |
| Biometric gate | Cat (`/\_/\ (=o.o=)`) | Awaiting auth |
| Biometric success | Cat | "ACCESS GRANTED" |
| Privacy screen | System core box | "SYSTEM SECURED" |
| Settings | System core box | "SYS.CORE" mascot |
| Onboarding | Retro controller | Product mascot |

### Origami Crane Logo

`src/components/logo.tsx`

A detailed multi-path SVG origami crane. Represents the "Fold" brand name (folding paper). Used on:
- Splash screen (76px, black)
- Exported memory card stamps (56px, themed color)

### Splash Animation

`src/components/splash-screen.tsx`

A parametric cursive-loop path with a traveling orange dot:
- A dashed SVG path (`#D1D1D1`, dasharray `6 6`) sweeps across the screen.
- The path uses a Gaussian-enveloped circular motion to create a cursive loop.
- A 10px orange dot (`#E45B00`) traces the path over 2.5 seconds with `Easing.inOut(Easing.ease)`.
- After completion, the entire splash fades out over 500ms.
- The dot has an orange glow shadow.

---

## 6. Motion & Animation

All animation uses **React Native Reanimated 4** with worklets running on the UI thread.

### Spring Physics

Springs are tuned per interaction:

| Interaction | Damping | Stiffness | Mass |
|---|---|---|---|
| Add button tap release | 12 | 200 | 0.6 |
| Add button long press | 10 | 160 | — |
| Add button pan snap-back | 20 | 400 | 0.4 |
| Card double-tap press | 20 | 300 | — |
| Action link arrow | 15 | 300 | — |

### Staggered Entrances

Elements fade in at different rates to create a sense of life. The empty state is the canonical example:

| Element | Delay | Duration | Easing |
|---|---|---|---|
| ASCII art opacity | 200ms | 800ms | `Easing.out(Easing.cubic)` |
| ASCII art translate | 200ms | 900ms | `Easing.out(Easing.cubic)` |
| Label opacity | 600ms | 600ms | `Easing.out(Easing.cubic)` |
| Label translate | 600ms | 700ms | `Easing.out(Easing.cubic)` |
| Hint blink | 1100ms | 400ms → 600ms → 500ms | Sequence |

### Scroll-Driven Animation

Home and Archive carousels use `useAnimatedScrollHandler` to drive card scaling:
- Input range: 5 points centered on the card's snap position.
- Output range: `[0.92, 0.95, 1, 0.95, 0.92]` with `Extrapolation.CLAMP`.
- The centered card is at full scale; neighbors shrink.

### Gesture Composition

| Component | Gesture | Composition |
|---|---|---|
| Add button | Tap + LongPress + Pan | `Gesture.Race` |
| Draggable sticker | Pan + Pinch | `Gesture.Simultaneous` |
| Canvas audio sticker | (Pan + Pinch) + Tap | `Gesture.Simultaneous` |
| Memory card | Double-tap | `Gesture.Tap().numberOfTaps(2)` |
| Camera focus | Tap | `Gesture.Tap` |
| Audio scrub | Pan | `Gesture.Pan` |

### Rubber-Band Physics

The Add button pan gesture implements diminishing resistance:
- Free movement from 0 to -30px.
- Beyond -30px, movement is damped by 0.3x (rubber-band effect).
- Hard floor at -50px.
- On release: if translation < -50px, trigger swipe-up action.
- Snap back with spring (damping 20, stiffness 400, mass 0.4).

---

## 7. Haptic Feedback

Every meaningful interaction fires `expo-haptics`. Feedback is layered by intensity:

| Interaction | Style |
|---|---|
| Button press-in | `Light` |
| Button press (success) | `Medium` |
| Swipe-up action | `Heavy` |
| Action link press-in | `Light` |
| Action link press | `Medium` |

Haptics are dispatched via `runOnJS()` from Reanimated worklets.

---

## 8. Component Architecture

### Smart vs Dumb Components

**Smart** (manage state, data, lifecycle):
- `MemoryCard` — audio playback, auto-play logic, export capture
- `BiometricGate` — auth state, app lifecycle, screen capture prevention
- `SplashScreen` — animation lifecycle, app visibility signaling
- `MusicPicker` — iTunes search, preview playback, download

**Dumb** (pure presentational, props in / events out):
- `DiagonalStripes` — SVG pattern overlay
- `GrainBackground` — noise texture overlay
- `Logo` — SVG crane
- `ThemedText` — text with theme binding
- `ActionLink` — animated CTA
- `EmptyState` — ASCII art display
- `TopBar` — striped band

### MemoryCard Layout Modes

`src/components/memory-card.tsx` — the most complex component. Three layout modes:

1. **Single Audio** — Full vinyl record with album art, track title/artist, tap to play/pause.
2. **Single Media** — Full-bleed image/video with optional text below.
3. **Canvas** — Text centered with draggable media stickers overlaid.

Four render layers:
1. **Stripes** (background) — Diagonal stripes at low opacity.
2. **Text** (absolute centered) — Body content, themed font/size.
3. **Media stickers** (draggable) — `DraggableSticker` components with pan/pinch.
4. **Time/Location** (bottom) — Timestamp and optional location badge.

During export, a fifth layer appears: the origami crane logo stamp.

---

## 9. Iconography

**Lucide React Native** is the icon library. Icons are used at small sizes (10-24px) with consistent stroke width (2-2.5px). Icons are functional, not decorative.

Common icons: `X` (close), `Image` (gallery), `PlayCircle` (video), `Mic` (audio), `Type` (font), `MapPin` (location), `Music` (music), `Share` (share), `Trash2` (delete), `User` (profile), `ArrowLeft` (back), `Search`, `ChevronLeft/Right` (calendar), `Zap/ZapOff` (flash), `Grid` (camera grid), `SwitchCamera`.

No emojis are used anywhere in the product. Icons replace them entirely.

---

## 10. Layout Patterns

### Carousel Snapping

Home and Archive use inverted `FlatList` with mathematical snapping:
- `snapToOffsets` computed as `i * snapInterval` for each item.
- `decelerationRate="fast"` + `disableIntervalMomentum` for crisp stops.
- Symmetric padding (`(height - snapInterval) / 2`) centers cards in the physical screen.
- `contentInsetAdjustmentBehavior="never"` prevents iOS safe-area interference.

### Floating Bottom Bar

Position: absolute, bottom 0, full width. Contains the date display and Add button. Uses `pointerEvents: 'box-none'` so taps pass through to the carousel except on the button itself. Respects safe area insets (`paddingBottom: Math.max(insets.bottom, 16)`).

### Modal Overlays

Recording overlays use `Modal` with `transparent: true` and `animationType: 'fade'`. A radial gradient SVG vignette darkens the edges for text legibility. The vinyl record centers in the overlay.

### Share Menu

Bottom sheet modal with `animationType: 'fade'`. Two options presented as rows with icon + title + description. Pressed state uses `theme.background` as background color.

---

## 11. Performance Principles

Per the AGENTS.md performance rules:

- **Direct DOM bypass** — Raw mouse tracking uses `element.style.transform` directly, syncing to Vue only on `mouseup`. (Note: this is a React Native app; the principle applies to Reanimated shared values vs. React state.)
- **`shallowRef` for heavy data** — Use `shallowRef` instead of `ref` for massive JSON structures to avoid recursive proxy creation.
- **CSS containment** — Apply `contain: strict` or `layout style` to heavy independent components.
- **`v-memo` / `v-once`** — Skip diffing complex DOM subtrees. (React Native equivalent: `React.memo` with custom comparison.)
- **Viewport virtualization** — Cull off-screen elements or use `content-visibility: auto`.
- **Filter optimization** — Cap blurs at 4-8px. Compensate with opacity for glass aesthetics. Avoid `backdrop-filter: blur(24px)`.

### Applied in Fold

- `MemoryCard` is wrapped in `React.memo` with a custom `CarouselItem` wrapper.
- `DiagonalStripes` is a static SVG with no animation (the `animated` prop is deprecated).
- `GrainBackground` uses `pointerEvents="none"` to avoid hit-testing overhead.
- Carousel uses `scrollEventThrottle={16}` (60fps) for smooth scroll-driven animations.
- Audio players are created per-component and cleaned up on unmount (`player.pause()` in cleanup).

---

## 12. Accessibility

- **Semantic HTML** — Uses React Native `View`, `Text`, `Pressable` primitives.
- **Keyboard navigation** — Not applicable (mobile-only).
- **Focus states** — Pressable components use `pressed` state for visual feedback.
- **Screen reader support** — `numberOfLines`, `ellipsizeMode` on text. (Room for improvement: `accessibilityLabel` props are not widely set.)
- **Color contrast** — Light theme uses pure black on white (21:1 ratio). Dark theme uses soft white on near-black.
- **Dynamic type** — `allowFontScaling={false}` is used in some places to preserve layout (date display). This is a deliberate trade-off for layout stability.
