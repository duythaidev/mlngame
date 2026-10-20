# Patriotic Retro Pixel UI Redesign Specification (MLN131)

- **Date:** 2026-10-21
- **Status:** Approved by User, Ready for Implementation Planning
- **Scope:** Complete UI/UX redesign for `mlngame` across Home, Room, Admin, and Sandbox pages with a light-mode patriotic retro-arcade aesthetic and AI-generated pixel assets.

---

## 1. Context & Objectives

`mlngame` is a cooperative multiplayer rope platformer inspired by Pico Park, built with React 19, TypeScript, Planck.js, and Firebase Realtime Database. The game serves as an interactive group activity for university politics and history coursework (MLN131).

### Goals
1. **Light Mode Patriotic & Historical Aesthetic:** Create an inspiring, bright, and clean visual atmosphere featuring revolutionary red, golden star yellow, ivory/cream backgrounds, and crisp 3D pixel-art borders.
2. **Accessible & Natural Game Language:** Avoid overly bureaucratic or stiff phrasing; use intuitive terminology like *Tên của bạn*, *Chọn nhân vật*, *Vào phòng*, *Chủ phòng (Host)*, *Bắt đầu*.
3. **High-Impact Visual Assets:** Leverage AI-generated illustrations for an arcade hero banner, preset pixel avatars (Soldier, Youth volunteer, Worker, Scholar), and decorative badges.
4. **Retro Arcade Game Shell:** Frame the Planck.js canvas in an arcade machine bezel with status indicators and an on-screen keyboard controls guide.
5. **Lightweight & Fast:** Maintain snappy load times, minimal dependencies, and clean code splitting.

---

## 2. Design System Tokens (Light Mode Patriotic Arcade)

### 2.1 Color Palette
- **Canvas / Page Background:** `#FBF8F2` (Ivory cream) with subtle golden-amber radial warmth.
- **Card Panels:** `#FFFFFF` with `#D32F2F` (Revolutionary Crimson) borders and `#2C1E18` deep ink accents.
- **Primary Red:** `#D32F2F` (Buttons, headers, active tabs, warning tags).
- **Secondary Red (Dark):** `#9A0007` (Shadows, title text, pressed button state).
- **Golden Star Yellow:** `#FBC02D` (Badges, host indicator, highlight border, accent buttons).
- **Amber Gold Glow:** `#FFF8E1` (Selected avatar background, card highlights).
- **Ink Black / Text:** `#1F1A17` (High-contrast, readable body copy).
- **Muted Text:** `#6B6056` (Subtitles, metadata, timestamps).
- **Slot Colors:**
  - Slot 0: `#D32F2F` (Crimson Red)
  - Slot 1: `#1976D2` (Electric Blue)
  - Slot 2: `#388E3C` (Forest Green)
  - Slot 3: `#F57C00` (Vibrant Orange)
  - Slot 4: `#7B1FA2` (Royal Purple)
  - Slot 5: `#0097A7` (Teal)

### 2.2 Typography & Shadows
- **Typography:**
  - System font stack with Google Fonts fallback: `"Oswald", "Inter", -apple-system, sans-serif` for bold banner headings and cards.
  - Pixel accents with monospace or retro tracking for game tags and buttons.
- **Pixel Shadow Tokens:**
  - Card Shadow: `box-shadow: 4px 4px 0px #2C1E18;`
  - Button Active/Hover: `transform: translate(2px, 2px); box-shadow: 2px 2px 0px #2C1E18;`
  - Selected Ring: `outline: 3px solid #FBC02D; box-shadow: 0 0 10px rgba(251, 192, 45, 0.6);`

---

## 3. Visual Assets & Presets

Assets to generate using the IDE's image generation tool and save into `src/assets/`:
1. `hero-banner.png`:
   - Bright retro pixel-art horizontal illustration: blue sky, golden sunburst, waving red and gold flags, industrial gears, and 4 colorful chibi characters cooperating with a rope.
2. `avatar-soldier.png`:
   - 32x32 pixel-art soldier character in green uniform and pith helmet (mũ cối).
3. `avatar-volunteer.png`:
   - 32x32 pixel-art youth volunteer with blue shirt and floppy beret/nón tai bèo.
4. `avatar-builder.png`:
   - 32x32 pixel-art industrial worker with yellow hardhat and blue overalls.
5. `avatar-scholar.png`:
   - 32x32 pixel-art student/scholar with glasses and white shirt.
6. `badge-star.png`:
   - Five-pointed golden star badge on red ribbon for host and victory highlights.

Preset avatars will be exported as a constant array `PRESET_AVATARS` in `src/lib/constants.ts` so players can tap to select immediately without uploading a file.

---

## 4. Screen Architecture

### 4.1 Home Page (`src/pages/Home.tsx`)
- **Top Ribbon:** Subtitle banner: `★ PHÒNG TRÀO THI ĐUA ĐOÀN KẾT - MLN131 ★`.
- **Hero Header:** Displays `hero-banner.png` with game title `PICO ROPE: ĐẠI ĐOÀN KẾT`.
- **Player Profile Card:**
  - Modeled as an "Attendee / Player Delegate Badge" (Thẻ Người Chơi).
  - Name input with character limit and clear placeholder.
  - **Avatar Picker Grid:** 4 preset pixel avatars in a selectable row + "Tự tải ảnh" button.
- **Room List Section:**
  - Styled as an arcade bulletin board.
  - Individual room cards featuring: Room name, Player count badge (`2/4 người`), Phase pill (`Đang chơi` vs `Đang chờ`), and 3D arcade `Vào phòng` button.
- **Quick Links:** Clean navigation buttons to `/admin` and `/sandbox`.

### 4.2 Room Page (`src/pages/Room.tsx`)
- **Header:** Room title, copy-invite-link button with clear toast feedback ("Đã sao chép link!").
- **Lobby Phase:**
  - 4 Player Slots displayed as delegate roster badges.
  - Slot 0 / Host receives the Golden Star badge and the prominent `Bắt đầu trò chơi` button.
  - Guests see `Đang chờ chủ phòng bắt đầu...` with animated pulsing dots.
- **Playing Phase (Arcade Shell):**
  - Surrounds `GameCanvas` with an arcade bezel (retro top header, decorative red corner brackets).
  - On-screen control legends: `[A][D]` Di chuyển, `[W][Space]` Bật nhảy, `[R]` Hồi sinh.
  - Host quick-actions: `Kết thúc / Về sảnh`, `Đổi màn chơi`.

### 4.3 Admin Page (`src/pages/Admin.tsx`)
- Modern, clean delegate command console.
- Admin authentication card.
- Room creation tool with max player selector (2 to 6).
- Room management list: 1-click invite link copy, live spectator monitor (`Spectate` component wrapped in arcade frame), delete room button.

### 4.4 Offline Sandbox Page (`src/pages/Sandbox.tsx`)
- Single-player / test mode wrapped in the same arcade frame with reset and physics toggles.

---

## 5. File Change Matrix

| File | Changes |
|------|---------|
| `src/assets/*.png` | 6 new AI generated assets (hero banner, 4 avatars, star badge) |
| `src/lib/constants.ts` | Add `PRESET_AVATARS` list with name and asset path |
| `src/index.css` | Comprehensive design system rewrite (light palette, arcade buttons, badge styles, CRT/pixel frame utilities) |
| `src/pages/Home.tsx` | Redesigned layout with hero banner, preset avatar grid, arcade cards |
| `src/pages/Room.tsx` | Arcade machine frame around canvas, styled player roster, invite link toast |
| `src/pages/Admin.tsx` | Light-mode patriotic management dashboard, spectate frame |
| `src/pages/Sandbox.tsx` | Matching arcade shell and controls guide |

---

## 6. Verification & Quality Gates

1. **Asset Integrity:** Verify all 6 generated images are non-corrupted, properly cropped, and importable via Vite.
2. **Responsive Layout:** Test on desktop (1920x1080), tablet (768px), and mobile (375px) viewports.
3. **Full Functional Flow:**
   - Select preset avatar -> updates profile and renders correctly in canvas.
   - Upload custom avatar -> overrides preset and persists to localStorage.
   - Join room, verify real-time slots, host start game trigger.
   - Canvas controls and physics interaction unobstructed by new UI frames.
4. **Production Build:** Execute `npm run build` with zero TypeScript or Vite errors.
