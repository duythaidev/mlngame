# Thiết kế: Flip-Card Game Multiplayer Realtime (Supabase)

## 1. Tổng quan

Game flip-card hiện tại (single-player, local state) được mở rộng thành multiplayer demo:
- 1 màn **Admin**: tạo ván, điều khiển reveal, theo dõi 4 màn user real-time + bảng xếp hạng.
- 1 màn **Player**: user nhập tên, join phòng, chơi flip-card độc lập trên bộ card của chính mình.
- Tất cả user dùng **chung 1 vị trí card** (cùng seed), nhưng chơi **độc lập** — không ai ảnh hưởng bàn cờ của ai.
- Thắng = người **hoàn thành toàn bộ ván nhanh nhất** (tính từ lúc bắt đầu phase "play").

Quy mô: tối đa 4 player + 1 admin/phòng. Không cần Auth thật. Supabase Free tier đáp ứng tốt (free tier: 200 concurrent realtime connections, 2 triệu message/tháng — quy mô này dùng chưa tới 1%).

---

## 2. Luồng chơi (đã chốt)

1. **Admin tạo ván mới** → server sinh `seed` (số nguyên random) → insert row vào `game_sessions` với `phase = 'waiting'`.
2. Admin share link/QR (`/play?session=<id>`) cho user.
3. **User join**: nhập tên hiển thị → client tự tạo `player_id` (UUID, lưu `localStorage`) → insert vào `players` table. Tối đa 4 player/phòng (check ở client + ràng buộc nhẹ ở DB).
4. **Admin thấy danh sách player join** real-time (qua Postgres Changes trên bảng `players`).
5. **Admin bấm "Reveal"** → update `game_sessions.phase = 'reveal'`, `reveal_started_at = now()`.
6. Mọi client (player) nhận update qua Postgres Changes → tự build deck từ `seed` (deterministic shuffle) → lật mở toàn bộ card, hiện countdown 60s tính theo `reveal_started_at` (server time), không tính theo giờ máy client.
7. **Hết 60s**: client tự úp lại toàn bộ card (tính giờ local nhưng mốc gốc là `reveal_started_at`). Admin update `phase = 'play'`, `play_started_at = now()` để chốt mốc tính thời gian hoàn thành.
8. **Giai đoạn play**: mỗi user chơi **độc lập, tự do, không turn-based** — đúng cơ chế flip-card cổ điển trong code gốc (mở 2 card, khớp giữ mở, không khớp tự úp lại sau ~2s). Card flip action **không ghi DB** — chỉ broadcast qua Realtime Broadcast channel riêng của từng player để admin xem trực tiếp (xem mục 4).
9. User match xong **toàn bộ các cặp** → tính `duration_ms = now() - play_started_at` → insert 1 row vào `results` (session_id, player_id, duration_ms, completed_at).
10. **Màn admin**: bảng xếp hạng tự cập nhật real-time (Postgres Changes trên `results`), sắp theo `duration_ms` tăng dần (nhanh nhất lên đầu).
11. Reload trang giữa ván → mất tiến độ cục bộ, chơi lại từ đầu (theo yêu cầu — không cần persist state chi tiết, chỉ demo).

---

## 3. Vì sao tách 2 luồng dữ liệu (quan trọng để tránh lag)

| Loại dữ liệu | Tần suất | Cơ chế | Lý do |
|---|---|---|---|
| Phase, player list, kết quả cuối (`results`) | Thấp (vài lần/ván) | **Postgres table + Postgres Changes** | Cần bền, query lại lịch sử được, đúng yêu cầu của bạn |
| Card flip action (user đang mở card nào) | Cao (~20-30 lần/player/ván) | **Realtime Broadcast** (không qua DB) | Không cần lưu vĩnh viễn, ghi DB liên tục không cần thiết, broadcast nhẹ & nhanh hơn |

**Admin không nhận ảnh/text qua mạng.** `CARD_PAIRS` là data tĩnh giống nhau ở mọi client (đúng như code gốc) — admin chỉ nhận **state rất nhẹ** dạng mảng nhỏ:

```ts
// Broadcast payload mỗi lần player flip/match thay đổi
{
  playerId: string,
  faceUpCardIds: string[],   // card nào đang lật, vd ["img-2", "txt-5"]
  matchedPairIds: number[],  // cặp nào đã match, vd [0, 3, 7]
}
```

Admin tự render 4 mini-board từ `CARD_PAIRS` (local, có sẵn) + state nhẹ này. Ảnh hiển thị ở size nhỏ (~60-80px/ô) trong mini-board, dùng `loading="lazy"`. Tổng dữ liệu truyền cả ván chỉ vài KB — không lo tải hay lag với quy mô 4 người.

---

## 4. Schema Postgres (Supabase)

```sql
-- Một ván chơi
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  seed integer not null,
  phase text not null default 'waiting', -- waiting | reveal | play | ended
  reveal_started_at timestamptz,
  play_started_at timestamptz,
  created_at timestamptz not null default now()
);

-- Player trong 1 ván
create table players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  name text not null,
  joined_at timestamptz not null default now()
);

-- Kết quả hoàn thành (chỉ insert khi xong toàn bộ ván)
create table results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  duration_ms integer not null,
  completed_at timestamptz not null default now(),
  unique (session_id, player_id) -- mỗi player chỉ có 1 kết quả/ván
);

-- Bật Realtime cho các bảng cần Postgres Changes
alter publication supabase_realtime add table game_sessions;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table results;
```

Giới hạn 4 player/phòng: kiểm tra ở client trước khi insert (count `players` theo `session_id`), không bắt buộc constraint DB phức tạp vì đây là demo.

> Không cần Auth/RLS đầy đủ cho demo nội bộ. Nếu muốn chặn người ngoài insert/update tùy ý, có thể thêm RLS policy đơn giản (cho phép insert/select công khai, nhưng giới hạn update chỉ qua 1 Edge Function) — nói nếu bạn cần mức này.

---

## 5. Kênh Realtime

- **Postgres Changes** (subscribe trực tiếp, không cần channel riêng):
  - `game_sessions` (phase, reveal_started_at, play_started_at) → cả admin và player subscribe.
  - `players` (ai vừa join) → admin subscribe để hiện danh sách.
  - `results` (ai vừa hoàn thành) → admin subscribe để cập nhật bảng xếp hạng.

- **Realtime Broadcast** (channel riêng theo session, room name kiểu `session:<session_id>`):
  - Mỗi player broadcast `faceUpCardIds` + `matchedPairIds` của chính mình lên channel chung của session, kèm `playerId` để admin phân biệt nguồn.
  - Admin subscribe 1 channel này, lọc theo `playerId` để cập nhật đúng mini-board.

- **Presence** (tuỳ chọn, không bắt buộc): có thể dùng thêm để admin biết player nào đang online/offline tab, nhưng không phải yêu cầu cốt lõi — có thể bỏ qua cho bản đầu, thêm sau nếu cần.

---

## 6. Deterministic shuffle theo seed

Code gốc dùng `Math.random()` trong hàm `shuffle()` — cần đổi sang shuffle có seed để mọi client ra **cùng thứ tự deck**:

```ts
// Thay Math.random() bằng PRNG có seed (vd: mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// buildDeck nhận seed từ game_sessions.seed
function buildDeck(pairs: CardPair[], seed: number): Card[] {
  const rng = mulberry32(seed);
  // ... giữ cấu trúc cards như cũ, shuffle(cards, rng)
}
```

Mọi client (admin + 4 player) gọi `buildDeck(CARD_PAIRS, session.seed)` → ra **kết quả giống nhau 100%**, không cần gửi cả deck qua mạng.

---

## 7. Cấu trúc màn hình

### `/admin?session=<id>` (hoặc `/admin` rồi tạo session mới)
- Header: trạng thái phase, nút "Tạo ván mới", nút "Reveal" (disable nếu chưa đủ player hoặc đã reveal rồi), countdown reveal nếu đang ở phase reveal.
- Khu vực chính: **lưới 2x2** (hoặc linh hoạt theo số player thực tế), mỗi ô là 1 mini-board (grid nhỏ 18 ô) + tên player + số cặp đã match / tổng.
- Khu vực bảng xếp hạng (cập nhật real-time khi có `results` mới), sort theo `duration_ms`.

### `/play?session=<id>`
- Màn nhập tên (nếu chưa join) → sau khi join, vào màn chờ ("Đang chờ admin reveal...") → khi phase chuyển `reveal`, tự động hiện board lật mở + countdown → khi chuyển `play`, board úp lại, user bắt đầu chơi bình thường (UI gần như giữ nguyên code gốc, chỉ thêm gửi broadcast mỗi khi state card thay đổi).
- Khi hoàn thành: hiện màn "Bạn đã hoàn thành! Thời gian: X giây" + (tuỳ chọn) vị trí hiện tại trong bảng xếp hạng.

---

## 8. Việc cần làm khi triển khai code (checklist)

1. Setup Supabase project (nếu chưa có) → lấy `SUPABASE_URL` + `anon key`.
2. Tạo 3 table theo schema mục 4, bật Realtime cho cả 3.
3. Cài `@supabase/supabase-js`, tạo client dùng chung.
4. Đổi `shuffle`/`buildDeck` sang deterministic theo seed (mục 6).
5. Tách `FlipCardGame` hiện tại thành component dùng lại được cho cả admin (mini-board, readonly) và player (full, interactive).
6. Viết hook `useGameSession(sessionId)` quản lý subscribe Postgres Changes cho `game_sessions`.
7. Viết hook `usePlayerBroadcast(sessionId, playerId)` để gửi/nhận broadcast card state.
8. Route `/admin` và `/play` (cần thêm router nếu project hiện tại chưa có — xác nhận với bạn lúc bắt đầu code).

---

## 9. Câu hỏi còn mở (cần xác nhận trước khi code)

1. Project React hiện tại của bạn **đã có router chưa** (react-router hay tương tự)? Nếu chưa, cần thêm để tách `/admin` và `/play`.
2. Bạn đã có Supabase project (URL + anon key) chưa, hay cần hướng dẫn tạo từ đầu?

Khi bạn xác nhận 2 điểm này là có thể bắt đầu code.

---

## 10. Hướng dẫn cài đặt package (cho agent)

Project hiện tại là React + Vite (không phải Next.js — không có SSR), nên **không dùng** `@supabase/ssr` (package đó dành cho cookie-based session trên server, chỉ cần khi có SSR/Next.js). Chỉ cần package gốc:

```bash
npm install @supabase/supabase-js
```

Không cần thêm `@supabase/ssr`, không cần `@supabase/auth-helpers-*` (không dùng Auth).

Nếu project chưa có router (xem câu hỏi mục 9):

```bash
npm install react-router-dom
```

---

## 11. Hướng dẫn tạo Supabase project từ đầu (cho agent / cho bạn)

1. Vào **supabase.com** → đăng nhập (GitHub/Google) → **New Project**.
2. Điền tên project (vd: `flipcard-realtime`), chọn database password, chọn region gần nhất (Singapore là gần VN nhất).
3. Đợi project khởi tạo (~1-2 phút).
4. Vào **Project Settings → API** → lấy 2 giá trị:
   - `Project URL` (dạng `https://xxxx.supabase.co`)
   - `anon public key`
   → 2 giá trị này đưa vào file `.env` của project React.
5. Vào **Table Editor** hoặc **SQL Editor** → chạy đoạn SQL ở mục 4 (schema `game_sessions`, `players`, `results`) để tạo bảng.
6. Vào **Database → Replication** (hoặc chạy thẳng lệnh `alter publication supabase_realtime add table ...` trong SQL Editor như đã có ở mục 4) → xác nhận 3 bảng đã được thêm vào publication `supabase_realtime` (bật Realtime).
7. (Tuỳ chọn, bỏ qua cho demo) Vào **Authentication → Policies** nếu sau này cần RLS — bản demo này để bảng ở chế độ cho phép insert/select công khai, không bật RLS.
8. Tạo file `.env` ở root project (Vite yêu cầu prefix `VITE_`):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxx...
   ```
   Thêm `.env` vào `.gitignore` nếu chưa có.

---

## 12. Cấu trúc file đề xuất cho agent (theo pattern mẫu Supabase, điều chỉnh cho đúng domain game)

Pattern mẫu bạn đưa (`realtime-chat`) là cho **chat message broadcast** — agent cần chuyển hoá đúng ý tưởng (1 channel/room, broadcast event, hook quản lý subscribe) sang domain **game state**, không phải tin nhắn. Cấu trúc đề xuất:

```
src/
├── components/
│   ├── FlipCardGame.tsx          (component hiện có — refactor nhận props session/player để dùng lại cho cả admin mini-board & player full board)
│   ├── AdminDashboard.tsx        (màn /admin — danh sách player + 4 mini-board + bảng xếp hạng)
│   ├── PlayerBoard.tsx           (màn /play — nhập tên, chờ, reveal, chơi)
│   └── MiniBoardPreview.tsx      (board readonly thu nhỏ, dùng trong AdminDashboard, render từ CARD_PAIRS local + state nhẹ nhận qua broadcast)
├── hooks/
│   ├── useGameSession.ts         (subscribe Postgres Changes bảng game_sessions theo session_id — trả về phase, reveal_started_at, play_started_at)
│   ├── usePlayers.ts             (subscribe Postgres Changes bảng players theo session_id — trả về danh sách player realtime)
│   ├── useResults.ts             (subscribe Postgres Changes bảng results theo session_id — trả về bảng xếp hạng realtime, sort theo duration_ms)
│   └── useGameBroadcast.ts       (tương đương use-realtime-chat.tsx trong mẫu, nhưng đổi EVENT_MESSAGE_TYPE → EVENT_BOARD_UPDATE, payload là { playerId, faceUpCardIds, matchedPairIds } thay vì ChatMessage)
├── lib/
│   ├── supabase.ts               (1 file duy nhất, dùng createClient từ @supabase/supabase-js — không tách client.ts/server.ts vì không có SSR)
│   ├── shuffle.ts                 (mulberry32 + buildDeck deterministic theo seed — xem mục 6)
│   └── constants.ts              (CARD_PAIRS giữ nguyên như code gốc)
└── App.tsx                       (route /admin và /play qua react-router-dom)
```

### Ánh xạ từ mẫu Supabase sang game (để agent tham khảo, không copy nguyên):

| Trong mẫu chat | Trong game flip-card |
|---|---|
| `roomName` | `sessionId` (id của `game_sessions`) |
| `EVENT_MESSAGE_TYPE = 'message'` | `EVENT_BOARD_UPDATE = 'board_update'` |
| `ChatMessage` (id, content, user, createdAt) | `BoardUpdatePayload` (playerId, faceUpCardIds, matchedPairIds) |
| `sendMessage(content)` | `broadcastBoardState(faceUpCardIds, matchedPairIds)` — gọi mỗi khi state card của player thay đổi (sau mỗi lần flip/match) |
| `messages` (mảng tích lũy) | **Không tích lũy** — chỉ giữ **state mới nhất** cho mỗi `playerId` (dùng `Map<playerId, BoardState>` hoặc object), vì chỉ cần biết board hiện tại, không cần lịch sử mọi lần flip |
| 1 channel cho cả phòng chat | 1 channel **duy nhất** cho cả session (`session:<sessionId>`), admin subscribe và lọc theo `playerId` trong payload — không cần 1 channel/player riêng |

**Khác biệt quan trọng so với mẫu chat**: mẫu chat lưu local state ngay khi gửi (tối ưu UX gửi tin nhắn). Với game, **không cần** làm vậy — player tự render board từ local React state có sẵn (giống code gốc `FlipCardGame`), broadcast chỉ là **bản sao gửi cho admin xem**, không phải nguồn sự thật cho chính player đó.

### File KHÔNG cần tạo (khác mẫu):
- Không cần `use-chat-scroll.tsx` (không có danh sách tin nhắn cuộn).
- Không cần `chat-message.tsx` / `ChatMessageItem` (không hiển thị tin nhắn).
- Không cần `lib/supabase/server.ts` (không có SSR, không cần xử lý cookie).

---

## 13. Tóm tắt việc agent cần làm theo thứ tự

1. `npm install @supabase/supabase-js` (+ `react-router-dom` nếu chưa có router).
2. Tạo `.env` với `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (giá trị thật do bạn lấy từ Supabase Dashboard theo mục 11).
3. Tạo `lib/supabase.ts`.
4. Chạy SQL schema (mục 4) trên Supabase SQL Editor.
5. Viết `lib/shuffle.ts` (deterministic theo seed, mục 6).
6. Viết 3 hook Postgres Changes: `useGameSession`, `usePlayers`, `useResults`.
7. Viết `useGameBroadcast` (theo bảng ánh xạ mục 12).
8. Refactor `FlipCardGame.tsx` hiện có để nhận thêm props tuỳ chọn (`onBoardChange` callback để bắn broadcast, `readOnly` để dùng cho mini-board admin).
9. Viết `PlayerBoard.tsx` và `AdminDashboard.tsx` ráp các hook trên lại.
10. Set up route `/admin` và `/play` trong `App.tsx`.
