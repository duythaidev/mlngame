# Patriotic Retro Pixel UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `mlngame` into a high-impact, bright patriotic retro-arcade experience (MLN131) featuring AI-generated pixel assets, a light-mode color palette, preset avatar selection, and an arcade machine game shell.

**Architecture:** Replace barebones styling with an expressive CSS design system in `src/index.css`. Generate pixel art assets using the IDE's image generation tool. Wire 4 preset avatars into `src/lib/constants.ts` and `src/pages/Home.tsx`. Wrap the Planck.js canvas in `src/pages/Room.tsx` and `src/pages/Sandbox.tsx` with a retro arcade bezel and controls guide.

**Tech Stack:** React 19, TypeScript, Vite, Planck.js, Firebase Realtime Database, Vanilla CSS with custom properties.

**Spec:** [docs/superpowers/specs/2026-10-21-patriotic-retro-pixel-ui-redesign.md](file:///e:/Web/mln131/mlngame/docs/superpowers/specs/2026-10-21-patriotic-retro-pixel-ui-redesign.md)

## Global Constraints

- **Theme Mode:** Exclusively Light Mode (Ivory `#FBF8F2`, Crimson Red `#D32F2F`, Golden Star `#FBC02D`, Ink `#1F1A17`).
- **Language:** Natural game terminology (*Tên của bạn*, *Chọn nhân vật*, *Vào phòng*, *Chủ phòng (Host)*, *Bắt đầu*).
- **Zero Physics Breakage:** Do not alter Planck.js physics simulation, rope math, or network serialization protocols.
- **Dependencies:** Pure Vanilla CSS, zero heavy UI frameworks (no Tailwind/Bootstrap).

---

### Task 1: Generate Visual Image Assets

**Files:**
- Create: `src/assets/hero-banner.png`
- Create: `src/assets/avatar-soldier.png`
- Create: `src/assets/avatar-volunteer.png`
- Create: `src/assets/avatar-builder.png`
- Create: `src/assets/avatar-scholar.png`
- Create: `src/assets/badge-star.png`

**Interfaces:**
- Produces: 6 image files in `src/assets/` importable by Vite.

- [ ] **Step 1: Generate `hero-banner.png`**
  - Prompt: "Horizontal retro pixel art banner for cooperative video game, bright daytime scene, clear blue sky, radiant golden sunburst, waving red and gold flags, industrial gears, and 4 cute colorful chibi pixel characters working together pulling a rope, vibrant patriotic 16-bit video game poster, 3:2 aspect ratio, crisp pixel art"
  - AspectRatio: `3:2`
  - Save to `src/assets/hero-banner.png`.

- [ ] **Step 2: Generate 4 preset avatars**
  - Soldier: "Pixel art avatar headshot of a friendly soldier wearing a green pith helmet (mu coi) and green collar, 32x32 pixel style, retro 16-bit game character icon, clean light background" -> `src/assets/avatar-soldier.png`
  - Volunteer: "Pixel art avatar headshot of a female youth volunteer wearing a floppy soft jungle hat (mu tai beo) and blue shirt, 32x32 pixel style, retro 16-bit game character icon, clean light background" -> `src/assets/avatar-volunteer.png`
  - Builder: "Pixel art avatar headshot of a smiling industrial worker wearing a bright yellow construction hardhat and blue overalls, 32x32 pixel style, retro 16-bit game character icon, clean light background" -> `src/assets/avatar-builder.png`
  - Scholar: "Pixel art avatar headshot of an energetic university student scholar with black framed glasses and white collared shirt, 32x32 pixel style, retro 16-bit game character icon, clean light background" -> `src/assets/avatar-scholar.png`

- [ ] **Step 3: Generate `badge-star.png`**
  - Prompt: "Pixel art golden five-pointed star award badge on a small red ribbon, game achievement icon, clean crisp edges, 1:1 aspect ratio" -> `src/assets/badge-star.png`

- [ ] **Step 4: Verify all assets exist and are valid PNG images**

- [ ] **Step 5: Commit**
  - `git add src/assets/ && git commit -m "feat: add patriotic retro-pixel image assets"`

---

### Task 2: Register Preset Avatars in Constants

**Files:**
- Modify: `src/lib/constants.ts`

**Interfaces:**
- Produces: `PRESET_AVATARS: { id: string; name: string; src: string }[]`

- [ ] **Step 1: Update `src/lib/constants.ts` with avatar imports and export**

```typescript
import avatarSoldier from "../assets/avatar-soldier.png";
import avatarVolunteer from "../assets/avatar-volunteer.png";
import avatarBuilder from "../assets/avatar-builder.png";
import avatarScholar from "../assets/avatar-scholar.png";

export interface PresetAvatar {
  id: string;
  name: string;
  src: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "soldier", name: "Chiến sĩ", src: avatarSoldier },
  { id: "volunteer", name: "Thanh niên", src: avatarVolunteer },
  { id: "builder", name: "Công nhân", src: avatarBuilder },
  { id: "scholar", name: "Sinh viên", src: avatarScholar },
];
```

- [ ] **Step 2: Commit**
  - `git add src/lib/constants.ts; git commit -m "feat: register preset avatars in constants"`

---

### Task 3: Comprehensive CSS Design System Overhaul

**Files:**
- Modify: `src/index.css`
- Modify: `index.html` (add Google Fonts preconnect & link for Oswald & Inter)

**Interfaces:**
- Produces: Global CSS variables (`--bg`, `--card`, `--red-primary`, `--red-dark`, `--gold-star`, `--ink`, `--muted`), retro arcade button classes (`.btn`, `.btn-primary`, `.btn-gold`), pixel card containers (`.card`, `.arcade-shell`, `.delegate-badge`), and responsive layouts.

- [ ] **Step 1: Add Google Fonts to `index.html`**
  - Add Oswald (headings) and Inter (body).
  - Update page title to "PICO ROPE - ĐẠI ĐOÀN KẾT | MLN131".

- [ ] **Step 2: Overhaul `src/index.css` with complete Light Mode Patriotic Arcade theme**
  - Global CSS variables.
  - Pixel border and 3D dập nổi shadows.
  - Arcade button classes with active `:active` press effects.
  - Avatar grid selection tokens.
  - Arcade shell bezel with controls guide.
  - Responsive media queries.

- [ ] **Step 3: Verify build passes**
  - Run `npm run build` to verify CSS syntax.

- [ ] **Step 4: Commit**
  - `git add index.html src/index.css; git commit -m "feat: implement light-mode patriotic retro-arcade design system"`

---

### Task 4: Redesign Home Page (`Home.tsx`)

**Files:**
- Modify: `src/pages/Home.tsx`

**Interfaces:**
- Consumes: `PRESET_AVATARS` from `../lib/constants`, `heroBanner` from `../assets/hero-banner.png`, `badgeStar` from `../assets/badge-star.png`.

- [ ] **Step 1: Implement top banner ribbon, hero image card, and Thẻ Người Chơi**
  - Displays `hero-banner.png` with decorative title overlay.
  - Thẻ người chơi allows typing player name and clicking any of the 4 preset avatars (or custom upload).
  - Highlights selected avatar with golden ring.

- [ ] **Step 2: Implement Arcade Room List Cards**
  - Room name, player count badge (`2/4 người`), phase pill (`Đang chơi` vs `Sẵn sàng`), and 3D arcade `Vào phòng` button.
  - Empty state with friendly prompt.
  - Navigation footer links with icons to `/admin` and `/sandbox`.

- [ ] **Step 3: Test and verify**
  - Run `npm run build` and verify avatar selection updates local state.

- [ ] **Step 4: Commit**
  - `git add src/pages/Home.tsx; git commit -m "feat: redesign home page with hero banner and preset avatar selector"`

---

### Task 5: Redesign Room Page & Arcade Shell (`Room.tsx` & `GameCanvas.tsx`)

**Files:**
- Modify: `src/pages/Room.tsx`
- Modify: `src/components/GameCanvas.tsx`

**Interfaces:**
- Consumes: CSS classes `.arcade-shell`, `.arcade-header`, `.arcade-controls-guide`, `.slot-badge`.

- [ ] **Step 1: Enhance `Room.tsx` lobby and controls**
  - Styled room header with 1-click copy invite link and toast notification ("Đã chép link phòng!").
  - Lobby player slots styled as delegate cards with slot badges.
  - Host badge with star icon for Slot 0.
  - Large golden `Bắt đầu chơi` button for host.

- [ ] **Step 2: Wrap game canvas in Arcade Machine Shell**
  - Arcade bezel header with status indicator.
  - Canvas centered with crisp pixel borders.
  - Footer bar displaying on-screen controls legend: `[A] [D] Di chuyển` | `[W] [Space] Bật nhảy` | `[R] Hồi sinh`.

- [ ] **Step 3: Test and verify**
  - Run `npm run build`.

- [ ] **Step 4: Commit**
  - `git add src/pages/Room.tsx src/components/GameCanvas.tsx; git commit -m "feat: redesign room page with arcade machine shell and controls legend"`

---

### Task 6: Redesign Admin & Sandbox Pages (`Admin.tsx` & `Sandbox.tsx`)

**Files:**
- Modify: `src/pages/Admin.tsx`
- Modify: `src/pages/Sandbox.tsx`

**Interfaces:**
- Keeps existing Firebase auth & spectate logic, wrapped in the new patriotic light-mode design system.

- [ ] **Step 1: Update `Admin.tsx`**
  - Clean card layout with login form, room creation panel, and room list with 1-click link copy and framed spectator view.

- [ ] **Step 2: Update `Sandbox.tsx`**
  - Wrap sandbox canvas in the same arcade machine shell with level selector and control buttons.

- [ ] **Step 3: Test and verify**
  - Run `npm run build`.

- [ ] **Step 4: Commit**
  - `git add src/pages/Admin.tsx src/pages/Sandbox.tsx; git commit -m "feat: redesign admin and sandbox pages with patriotic arcade theme"`

---

### Task 7: Full Verification & Browser Review

- [ ] **Step 1: Run production build `npm run build`**
- [ ] **Step 2: Inspect pages via browser subagent**
  - Check Home (`/`), Room (`/room/sandbox`), Admin (`/admin`), Sandbox (`/sandbox`).
  - Verify layout responsiveness and image rendering.
- [ ] **Step 3: Final commit and summary report**
