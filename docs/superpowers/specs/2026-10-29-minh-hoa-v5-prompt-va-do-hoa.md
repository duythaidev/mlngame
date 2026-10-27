# Bản 5 — Prompt ảnh minh họa và mô tả đồ họa giao diện (chi tiết)

- Ngày: 2026-10-29 · Chưa code. Bổ sung cho `2026-10-29-minh-hoa-v5-design.md` (đã chốt: **khung tư liệu bên phải canvas**).
- Phần A: bộ **prompt sinh ảnh** (Puter.js). Phần B: **mô tả đồ họa giao diện** đủ để người code vẽ đúng, không phải đoán.

---

# PHẦN A — PROMPT ẢNH MINH HỌA

## A1. Quy tắc chung

| Quy tắc | Lý do |
|---------|-------|
| Ảnh **vuông 1024×1024** (Puter.js ở `lms-main/image-tutorial.md` xuất PNG 1024×1024) | Hiển thị vuông trong khung tư liệu 248×248 px và thẻ mở level |
| **Không có chữ trong ảnh** (không chữ, không số, không biển hiệu đọc được) | AI vẽ chữ tiếng Việt sai dấu. Mọi chữ do giao diện chèn lên |
| **Không chân dung người thật**, không mặt cận cảnh. Người chỉ là **bóng đen / nhìn từ phía sau / ở xa** | AI dễ vẽ sai nhân vật lịch sử; tránh nhầm lẫn |
| Vật biểu tượng làm chủ thể: lá phiếu, hòm phiếu, cuốn Hiến pháp, cán cân, con dấu, quảng trường, nhà máy, cánh đồng | Dễ nhận, ít sai |
| Một bảng màu riêng cho mỗi thời kỳ (A2) | Nhìn màu biết thời kỳ |
| Lưu `public/art/era{L}.webp` (bìa thời kỳ), `public/art/l{L}p{P}.webp` (từng phần); nén ≤ 150 KB | |

### Chuỗi "phong cách nền" (ghép vào đầu MỌI prompt, thay `{PALETTE}` theo thời kỳ)

```
Vietnamese revolutionary propaganda poster style mixed with woodblock linocut print,
bold thick black outlines, flat color shapes, limited palette of {PALETTE},
visible paper grain texture and slight ink misregistration, strong dramatic diagonal composition,
centered clear subject, simple readable silhouettes, square composition
```

### Chuỗi "loại trừ" (ghép vào MỌI prompt, hoặc điền ô negative prompt nếu công cụ có)

```
no text, no letters, no numbers, no captions, no watermark, no logo, no signature,
no realistic human faces, no close-up portraits, no photorealism, no 3d render, no gore
```

## A2. Bảng màu theo thời kỳ (dùng cho `{PALETTE}` và cho đồ họa trong game)

| Level | Thời kỳ | `{PALETTE}` (viết cho prompt) | Mã màu chính |
|-------|---------|-------------------------------|--------------|
| 1 | 1919–1946 | `sepia brown, aged parchment cream, brick red, muted gold` | `#4A3220` `#F3E6C4` `#B5382A` `#C9A24A` |
| 2 | 1976–1986 | `steel grey-blue, rusty brick orange, stamp yellow, with warm pink-orange sunrise accents` | `#8FA3AD` `#A4533A` `#D9B84A` `#F4A77A` |
| 3 | 1991–1995 | `jade green, ivory white, vermilion red, granite grey` | `#2E8B7A` `#F4EFE0` `#C62828` `#B9BEC2` |
| 4 | 2001–2022 | `deep navy blue, imperial gold, vermilion red, marble white` | `#14305C` `#D9A92B` `#C62828` `#E9ECF1` |
| 5 | Câu trả lời | `radiant gold, flag red, sunset orange, deep crimson, cream` | `#E3B23C` `#C8102E` `#F28C38` `#7A0F1E` |

## A3. Bìa thời kỳ (5 ảnh) — thẻ mở level, thanh thời gian, poster kết

> Cách ghép: `[PHONG CÁCH NỀN] + [chủ thể] + [LOẠI TRỪ]`. Dưới đây chỉ ghi **chủ thể** (tiếng Anh) và mô tả tiếng Việt.

| File | Chủ thể (prompt) | Mô tả |
|------|------------------|-------|
| `era1.webp` | `a quiet Vietnamese village at dawn, bamboo hedges and a tiled communal-house roof on rolling hills, a tall flagpole with a red flag with a yellow five-pointed star, a loudspeaker on a pole, tiny silhouettes of villagers walking toward a village gate, warm sepia light` | Làng quê buổi sáng, cờ đỏ sao vàng, loa phóng thanh, dân đi về cổng làng |
| `era2.webp` | `a split scene: left half a grey silent factory with cold chimneys, rusty gears and a queue of silhouettes with bicycles; right half the same factory glowing in orange-pink sunrise with smoking chimneys, rice field in front; a diagonal beam of dawn light divides the two halves` | Nửa trái xám lạnh (nhà máy ngừng), nửa phải bình minh (nhà máy chạy) |
| `era3.webp` | `a grand white-columned assembly building with wide steps, a golden balance scale of justice standing in front, thick law book on a podium, morning sunlight, a few silhouettes climbing the steps` | Tòa nhà cột trắng, cán cân công lý, cuốn luật |
| `era4.webp` | `a modern city skyline of glass towers at dusk, three huge stone pillars standing in a row in the foreground each carrying a different emblem (an open law book, an interlocking gear, a judge gavel), a large open constitution book glowing at their base` | Thành phố hiện đại, ba trụ cột (sách luật, bánh răng, búa), cuốn Hiến pháp |
| `era5.webp` | `a wide golden panorama in a gradient sunset: four small vignettes in a row (village flag, factory sunrise, white-columned building, glass city) joined by a winding golden road that leads to a huge radiant golden gate, red flags on both sides, silhouettes walking forward` | Dải toàn cảnh 4 thời kỳ nối nhau bằng con đường vàng tới cổng vàng |

## A4. Ảnh từng phần (25 ảnh) — khung tư liệu bên phải canvas

### Level 1 — 1919–1946 · `{PALETTE}` = sepia

| File | Phần | Chủ thể (prompt) | Mô tả |
|------|------|------------------|-------|
| `l1p1.webp` | 1919 · "Thần linh pháp quyền" | `a rolled handwritten manuscript scroll and a quill pen beside an oil lamp on an old wooden desk, parchment with abstract ink lines, a window showing distant rooftops at night, warm lamp glow` | Bản thảo cuộn, bút lông, đèn dầu, mái nhà xa |
| `l1p2.webp` | 1945 · Tuyên ngôn Độc lập | `a vast plaza seen from behind a crowd of silhouettes, a forest of red flags with yellow five-pointed stars, a tall flagpole at center, a simple speaker tribune in the distance, sunrise rays` | Quảng trường đông người nhìn từ phía sau, rừng cờ, bục xa |
| `l1p3.webp` | 06/01/1946 · Tổng tuyển cử | `a line of villagers in simple clothes queueing seen from behind at a bamboo and thatch polling station, a wooden table with a ballot box and a red flag, morning mist` | Hàng người dân xếp hàng ở điểm bầu cử mái tranh, hòm phiếu gỗ |
| `l1p4.webp` | "Hễ là công dân…" | `close view of a wooden ballot box with a narrow slot, a single hand (no face) dropping a folded paper ballot with a red check mark into it, beams of light from above` | Bàn tay thả lá phiếu vào hòm gỗ, tia sáng |
| `l1p5.webp` | 11/1946 · Hiến pháp đầu tiên | `a thick closed book with a red cover and a gold five-pointed star embossed in the center, standing on a small wooden stand, radiating soft golden rays, dark vignette corners` | Cuốn Hiến pháp bìa đỏ sao vàng trên giá gỗ, tỏa sáng |

### Level 2 — 1976–1986 · `{PALETTE}` = grey-blue + brick + yellow, sunrise pink ở 2.4–2.5

| File | Phần | Chủ thể (prompt) | Mô tả |
|------|------|------------------|-------|
| `l2p1.webp` | 1976 · Thống nhất | `a stylized S-shaped country silhouette in red with a gold five-pointed star, glowing as one connected piece, held aloft by many small silhouettes of hands below, grey-blue sky` | Dải đất hình chữ S liền một khối màu đỏ, sao vàng, nhiều bàn tay nâng |
| `l2p2.webp` | Trước 1986 | `a thin ration coupon book and sheets of ration stamps in the foreground, behind them a long queue of silhouettes with bicycles in front of a plain state shop, grey-blue tone` | Sổ gạo, tem phiếu, hàng người xếp hàng trước cửa hàng |
| `l2p3.webp` | Khó khăn | `a silent factory with tall cold chimneys and no smoke, rusty stopped gears piled in the foreground, a lone bicycle, heavy grey sky` | Nhà máy ngừng máy, bánh răng gỉ, trời xám |
| `l2p4.webp` | 12/1986 · Đổi mới | `a large assembly hall seen from the back rows, rows of seats with silhouettes, a tall red banner on stage, golden dawn light streaming through tall windows, warm orange-pink glow` | Hội trường nhìn từ hàng ghế sau, ánh bình minh qua cửa sổ |
| `l2p5.webp` | "Lấy dân làm gốc" | `golden rice fields in the foreground with farmers in conical hats as silhouettes, a factory with smoking chimneys behind, sunrise in pink-orange, a red flag on a pole between them` | Ruộng lúa, nông dân đội nón, nhà máy chạy, bình minh |

### Level 3 — 1991–1995 · `{PALETTE}` = jade + ivory + vermilion

| File | Phần | Chủ thể (prompt) | Mô tả |
|------|------|------------------|-------|
| `l3p1.webp` | 06/1991 · Cương lĩnh | `a stack of official documents bound with a red ribbon, a fountain pen and a desk lamp, jade-green wall behind, soft light` | Chồng văn kiện buộc dải đỏ, bút máy, đèn bàn |
| `l3p2.webp` | 29/11/1991 · Khái niệm | `a simple speaker podium with two microphones on a stage, a white-columned building facade behind it, spotlight, rows of empty seats in the foreground` | Bục phát biểu hai micro, tòa nhà cột trắng |
| `l3p3.webp` | 1992 · Hiến pháp | `a golden balance scale of justice in front of a thick law book, white marble columns, jade-green background, bright even light` | Cán cân vàng + cuốn luật, cột đá cẩm thạch |
| `l3p4.webp` | 1994 · Của dân · Do dân · Vì dân | `a carved stone archway with three bas-relief panels side by side: a crowd of people, a ballot box, and an open helping hand; Dong Son bronze drum pattern border` | Vòm đá có 3 phù điêu (đám đông · hòm phiếu · bàn tay), viền trống đồng |
| `l3p5.webp` | 1995 | `a white-columned national assembly style building with wide steps, flags on both sides, morning light, a few silhouettes walking up the steps` | Tòa nhà cột trắng, bậc thềm, cờ hai bên |

### Level 4 — 2001–2022 · `{PALETTE}` = navy + gold + red

| File | Phần | Chủ thể (prompt) | Mô tả |
|------|------|------------------|-------|
| `l4p1.webp` | 2001 · Hiến định thuật ngữ | `pages of a law book being turned, a gold ribbon bookmark and a round red stamp pressed on the corner, navy blue background with gold highlights` | Trang luật đang lật, dải đánh dấu vàng, dấu đỏ |
| `l4p2.webp` | 2011 · Phân công · Phối hợp · Kiểm soát | `three stone pillars in a row on a marble base joined by interlocking gears at the top, each pillar carrying an emblem: an open law book, a gear, a judge gavel; golden light between them` | Ba trụ nối bằng bánh răng, biểu tượng sách luật · bánh răng · búa |
| `l4p3.webp` | 2013 · Điều 4 | `an open constitution book with one page lit by a narrow golden spotlight and a thin gold ruler line across the page, the rest of the page abstract blurred lines` | Cuốn Hiến pháp mở, một trang sáng bởi chùm sáng, vạch vàng |
| `l4p4.webp` | Không có vùng cấm | `a big red approval stamp pressed down on a pile of files, ink splash and flying paper sheets, only a hand holding the stamp, dramatic angle` | Con dấu đỏ đóng xuống chồng hồ sơ, giấy bay |
| `l4p5.webp` | 2022 · Nghị quyết 27 | `a formal resolution document with a round red seal laid on a table, a glass skyline of modern buildings behind it, navy blue evening light` | Văn bản có dấu đỏ trên bàn, thành phố kính phía sau |

### Level 5 — Câu trả lời · `{PALETTE}` = gold + red + sunset

| File | Phần | Chủ thể (prompt) | Mô tả |
|------|------|------------------|-------|
| `l5p1.webp` | Được Hiến pháp ghi nhận | `an open constitution book with the top paragraph lit by a golden spotlight, a red ribbon bookmark, warm deep red background` | Trang đầu cuốn Hiến pháp sáng, dải đỏ |
| `l5p2.webp` | Trong khuôn khổ pháp luật | `a large ornate golden frame enclosing a red flag with a yellow five-pointed star, standing on a marble floor, soft reflections, calm light` | Khung vàng chạm khắc ôm lá cờ đỏ sao vàng |
| `l5p3.webp` | Bãi bỏ thủ tục phiền hà | `a mountain of paperwork whose sheets turn into white paper birds flying upward and away into bright sky, a single round red BÃI-BỎ-style stamp shape (no letters) in the center of the pile` | Núi hồ sơ hóa thành đàn chim giấy bay lên |
| `l5p4.webp` | Tiếp tục hoàn thiện | `a winding road of golden light running toward a distant sunrise over a modern city, small signposts (blank) along the road, silhouettes walking on it` | Con đường ánh vàng hướng về bình minh |
| `l5p5.webp` | Câu trả lời | `a huge radiant golden gate opening with brilliant light, red flags on both sides, silhouettes of a crowd in front, soft fireworks in the sky` | Cổng vàng mở ra ánh sáng, cờ hai bên, pháo hoa nhẹ |

## A5. Ảnh phụ (2 ảnh)

| File | Dùng ở | Chủ thể (prompt) |
|------|--------|------------------|
| `hero.webp` | Trang chủ / sảnh | `five small framed scenes arranged along a winding rope path leading upward to a golden gate, tiny silhouettes tied together by a rope climbing the path, warm cream background` (khung 5 cảnh + người nối dây leo) |
| `poster.webp` | Nền màn kết | `a radiant golden sunburst background with subtle Dong Son bronze drum pattern in the center, red flag corners, empty space in the middle for text` (nền tia nắng vàng + trống đồng, để trống giữa) |

## A6. Cách sinh ảnh (tóm tắt, chi tiết xem `lms-main/image-tutorial.md`)

1. Mở `start-server.bat` và `start-chrome-debug.bat` trong `E:\Web\Do an\puter-image\`; đăng nhập Puter một lần.
2. Mỗi ảnh: gọi `index.html?prompt=<PHONG CÁCH NỀN + chủ thể + LOẠI TRỪ>&name=<tên file>`; ảnh PNG ra `out/`.
3. Duyệt theo thứ tự: **5 bìa thời kỳ → 5 ảnh Level 1 → cả bộ**. Nếu phong cách lệch: chỉ sửa **chuỗi phong cách nền**, không sửa từng ảnh.
4. Đổi PNG → WebP (≤ 150 KB), đặt vào `mlngame/public/art/`.

## A7. Kiểm ảnh trước khi dùng (checklist)

- [ ] Không có chữ/số đọc được; không có mặt người rõ nét; không có logo.
- [ ] Cờ đúng: nền **đỏ**, sao **vàng 5 cánh** ở giữa.
- [ ] Màu đúng bảng màu thời kỳ.
- [ ] Chủ thể ở giữa, chừa 10% lề (khung ảnh bo góc và có viền).
- [ ] Hình dễ nhận ở cỡ 248×248 px (thu nhỏ vẫn rõ chủ thể).

---

# PHẦN B — MÔ TẢ ĐỒ HỌA GIAO DIỆN

Mọi kích thước tính bằng **px CSS**. Màn chơi: 1 ô = 32 px; canvas 800 × 512 (16 hàng).

## B1. Bố cục trang chơi

```
 ┌──────────────────────────────────── 1136 px (tối đa) ───────────────────────────────────┐
 │ THANH THỜI GIAN  (cao 72 px)                                                            │
 ├────────────────────────────────────────────────────┬────────────────────────────────────┤
 │                                                    │  KHUNG TƯ LIỆU  (rộng 296 px)    │
 │   CANVAS 800 × 512                                 │                                    │
 │   (viền gỗ/đá theo thời kỳ, dày 8 px)              │  [ảnh 248×248 + viền]              │
 │                                                    │  1946                              │
 │                                                    │  Tổng tuyển cử                     │
 │                                                    │  1 dòng ≤ 70 ký tự                 │
 │                                                    │  ● ● ○ ○ ○ (5 phần)                │
 ├────────────────────────────────────────────────────┴────────────────────────────────────┤
 │ hướng dẫn phím (như hiện tại)                                                           │
 └─────────────────────────────────────────────────────────────────────────────────────────┘
```

- Khoảng cách canvas ↔ khung tư liệu: 16 px. Khung tư liệu cao bằng canvas (512 + viền).
- **Dưới 960 px chiều rộng:** khung tư liệu chuyển xuống dưới canvas, ảnh 160 px, chữ xếp ngang cạnh ảnh.
- Nền trang: màu giấy của thời kỳ (A2, tông nhạt), đổi mượt 600 ms khi sang level mới.
- Khung viền canvas theo thời kỳ: L1 gỗ sẫm có đinh tán; L2 sắt xám có bu-lông; L3 đá granite; L4 kim loại xanh navy viền vàng mảnh; L5 vàng chạm hoa văn.

## B2. Thanh thời gian (HTML)

- **5 mốc**: hình tròn 28 px, nối nhau bằng thanh dày 6 px. Mốc: `1919–1946`, `1976–1986`, `1991–1995`, `2001–2022`, `Câu trả lời`. Chữ năm Oswald 13 px dưới mỗi mốc.
- Trạng thái: **đã qua** = tròn đặc màu nhấn thời kỳ + dấu ✓ trắng, thanh nối đã tô; **hiện tại** = tròn to 34 px, viền dày, **nhịp phát sáng** (vòng sáng nở ra 1,2 giây lặp); **chưa tới** = tròn rỗng xám.
- Thanh tô theo **tiến độ trong level**: chiều dài thanh nối tới mốc kế tô dần theo vị trí nhóm đi qua 5 phần.
- Hàng **tem** bên dưới (cao 40 px): 5 ô cho level hiện tại. Ô chưa có = viền nét đứt mờ.

## B3. Tem (huy hiệu mỗi phần)

- Hình: hình vuông 40 × 40 px **viền răng cưa** (như tem thư), nền giấy kem, viền đỏ son.
- Nội dung: **năm** (Oswald 11 px) trên, **biểu tượng nhỏ** của phần ở giữa (lá phiếu / quả cầu / sách / cán cân / bánh răng / cổng… vẽ bằng nét), cuối cùng dấu **ấn tròn đỏ** nghiêng 12°.
- Hiệu ứng nhận tem: khi qua cổng mốc, tem **bay** từ vị trí cổng (tọa độ màn hình) theo đường cong tới ô của nó trong 700 ms (kéo theo đuôi sáng), **đập xuống** (scale 1.4 → 1) kèm tiếng đóng dấu; ô sáng viền vàng 300 ms.
- Màn kết: tập hợp 25 tem xếp thành lưới 5 × 5 trên poster.

## B4. Khung tư liệu (bên phải)

Từ trên xuống:
1. **Nhãn nhỏ**: `TƯ LIỆU · LEVEL 1` (Inter 11 px, in hoa, giãn chữ 1 px, màu nhấn).
2. **Ảnh**: khung "ảnh dán" — viền giấy trắng 8 px, đổ bóng 4 px, **nghiêng −1,5°**, ghim đỏ ở góc trên trái. Ảnh 248 × 248. Chưa tải xong: hình vẽ code của đạo cụ chính + hiệu ứng "đang rửa ảnh".
3. **Năm**: Oswald 44 px, màu nhấn thời kỳ, có gạch chân dạng nét cọ.
4. **Cụm chính**: Oswald 18 px (≤ 6 từ).
5. **Dòng**: Inter 14 px, cao dòng 1,5 (≤ 70 ký tự).
6. **Nguồn**: Inter 11 px xám, ví dụ `Hiến pháp 2013 · Điều 4`.
7. **5 chấm tiến độ** phần (● đã qua, ◉ hiện tại, ○ chưa).

- Hiệu ứng đổi phần: thẻ **lật** quanh trục dọc 400 ms (mặt cũ → mặt mới); ảnh mới **phóng nhẹ** 1.04 → 1.0 trong 1,2 giây (hiệu ứng Ken Burns).
- Nền khung: giấy kem họa tiết theo thời kỳ (L1 giấy cũ, L2 giấy báo, L3 giấy ngà, L4 giấy trắng có đường kẻ xanh navy, L5 giấy vàng nhạt có hoa văn trống đồng mờ).

## B5. Thẻ mở level (phủ canvas, 2 giây)

- Nền: ảnh bìa thời kỳ `era{L}` phủ kín canvas, **tối dần 55 %** ở lớp phủ; hiệu ứng zoom chậm 1.0 → 1.08.
- Giữa: **dấu đỏ** hình tròn 140 px xoay vào (rotate −25° → −8°, scale 2 → 1, kèm tiếng "đóng dấu"), bên trong là khoảng năm to (Oswald 34 px).
- Dưới dấu: tên level (Oswald 28 px, trắng), dưới nữa dòng phụ (Inter 14 px, ≤ 40 ký tự).
- Kết thúc: thẻ **cuộn sang trái** 400 ms để lộ màn chơi; nhóm mới bắt đầu điều khiển được sau đó.

## B6. Màn kết (poster)

- Nền: `poster.webp` (tia nắng vàng + trống đồng).
- Dải trên: 5 ảnh bìa thời kỳ nhỏ (96 × 96) xếp hàng, nối bằng sợi dây (như dây game), mỗi ảnh có khung đúng thời kỳ.
- Giữa: câu hỏi (Inter italic 15 px) → **"KHÔNG MÂU THUẪN"** (Oswald 56 px, đỏ son, viền vàng, hiệu ứng chữ hiện dần từng chữ 60 ms/chữ).
- 3 ý: ba thẻ ngang, mỗi thẻ có biểu tượng (cuốn Hiến pháp · hai bàn tay nắm · cán cân), chữ ≤ 90 ký tự.
- Dưới: lưới **25 tem** đã thu + thời gian mỗi level; nút "Chơi lại".
- Hiệu ứng: pháo hoa nhẹ vẽ bằng hạt (xem B12), dải cờ bay ở hai góc.

## B7. Cổng mốc (trong canvas)

Kích thước: rộng 4 ô (128 px), cao 5 ô (160 px), đặt phía **sau** người chơi (không cản đường). Gồm 2 cột + xà ngang + bảng năm.

| Level | Kiểu cổng | Chi tiết |
|-------|-----------|----------|
| 1 | **Cổng làng** | 2 trụ gạch đỏ sẫm, mái ngói thấp hai mái, xà gỗ, lồng đèn đỏ treo hai bên, cờ nhỏ trên mái |
| 2 | **Cổng nhà máy** | 2 trụ bê tông xám, xà thép chữ H, bóng đèn tròn ở giữa, dải sọc vàng–đen ở chân trụ; từ phần 4: nắng cam hắt lên mặt cổng |
| 3 | **Vòm đá** | 2 cột đá trắng có rãnh dọc, vòm bán nguyệt có hoa văn trống đồng, khắc nổi sao ở đỉnh |
| 4 | **Cổng kính** | khung thép xanh navy, mặt kính trong có phản chiếu, đường viền vàng mảnh, dải đèn LED trắng trên xà |
| 5 | **Cổng vàng** | 2 cột vàng chạm rồng/hoa văn, mái cong, hai cờ đỏ sao vàng hai bên |

- **Bảng năm** treo giữa xà: bảng gỗ/kim loại tùy thời kỳ, năm in to (Oswald 20 px); dưới là **cụm ≤ 6 từ** (Inter 10 px).
- **Chưa qua**: tối (xám hóa 40 %), đèn tắt, không cờ. **Đã qua**: sáng, đèn bật, **cờ kéo lên** trong 600 ms, vài hạt sáng bay lên, tiếng chuông ngắn.

## B8. Nền theo thời kỳ (backdrop 2 lớp + trời)

Vẽ **một lần** vào canvas phụ rộng bằng level, rồi cắt theo camera. Lớp xa cuộn 0,2×, lớp gần cuộn 0,5×. Trời cố định.

### Level 1 — sepia
- **Trời**: gradient dọc `#EAD9A8 → #D9B97A` (hoàng hôn ấm), mặt trời mờ ở phải.
- **Lớp xa** (0,2×): dãy đồi chồng 3 tầng (`#B79A68`, `#A5865A`, `#927552`) có đường viền sương; vài ngọn tre cao.
- **Lớp gần** (0,5×): lũy tre (nhóm hình thoi xanh nâu `#6C5A33`), mái đình hai tầng (đỏ nâu `#8A3B2A` đen viền), mái nhà tranh nhỏ, vài cột cờ.
- **Không khí**: hạt bụi vàng trôi chậm, **vignette** (góc tối 35 %), nhiễu hạt phim rất nhẹ.

### Level 2 — xám xanh → bình minh
- **Trời**: phần 1–3 gradient `#8FA3AD → #6E8290` (xám lạnh); **phần 4–5 chuyển dần** sang `#F4A77A → #FFD6A5` (cam hồng) — nội suy màu theo tiến độ phần.
- **Lớp xa**: dãy ống khói nhà máy (`#4C5B63`), phần 1–3 không khói/khói xám, phần 4–5 khói trắng bốc lên và chuyển sang màu hồng.
- **Lớp gần**: dãy nhà tập thể 4 tầng (gạch đỏ cũ `#A4533A`, cửa sổ vuông), cột điện, dây điện võng, xe đạp dựa tường.
- **Không khí**: phần 1–3 bụi xám + hạt mưa mịn rất nhẹ; phần 4–5 tia nắng xiên từ trái trên, hạt sáng.

### Level 3 — xanh ngọc
- **Trời**: `#CFE8E0 → #F4EFE0`.
- **Lớp xa**: trụ sở cột trắng (6 cột, mái tam giác, bậc thềm), nhỏ, màu `#DDE6E2`.
- **Lớp gần**: lan can đá, hàng cây xanh ngọc tỉa gọn, cột đèn đường kiểu cổ điển, cờ nhỏ trên cột.
- **Không khí**: ánh nắng xiên (2 dải sáng trắng bán trong suốt chéo qua màn hình), lá nhỏ bay.

### Level 4 — navy & vàng
- **Trời**: gradient chiều tối `#14305C → #3C6AA0`, vài ngôi sao nhỏ.
- **Lớp xa**: đường chân trời thành phố (tòa kính `#2C4E7D`, ô cửa sổ vàng bật/tắt ngẫu nhiên chậm).
- **Lớp gần**: dải cờ treo ngang giữa các cột đèn (đỏ–vàng xen kẽ), tòa nhà thấp có mặt kính phản chiếu (dải sáng trượt chéo chậm).
- **Không khí**: phản chiếu bóng loáng ở nền (dải sáng mờ), ánh đèn nở (bloom nhẹ ở đèn).

### Level 5 — vàng kim
- **Trời**: hoàng hôn `#7A0F1E → #F28C38 → #FFD27A` (đáy sáng).
- **Lớp xa**: **dải panorama 4 thời kỳ** thu nhỏ nối nhau (làng · nhà máy · cột trắng · thành phố) theo đúng thứ tự trái → phải, chạy suốt level.
- **Lớp gần**: cờ đỏ sao vàng cắm dọc đường, hoa (bông vàng), trụ chạm hoa văn trống đồng.
- **Không khí**: hạt vàng bay lên, tia sáng từ cổng vàng ở cuối; khi thắng: pháo hoa nhẹ.

## B9. Gạch nền (tile) theo thời kỳ

Pattern 32 × 32 tạo sẵn, lặp. Mặt trên có **viền sáng 3 px**, dưới là đá/đất; **mép dưới** có bóng đậm 2 px.

| Level | Họa tiết | Màu chính |
|-------|----------|-----------|
| 1 | đất nện lẫn đá ong lỗ chỗ, vài ngọn cỏ ở mép trên | `#9C6B3F` nền, `#B5382A` viền thềm đình |
| 2 | gạch đỏ cũ ghép so le, vài viên sứt, vết xi măng | `#A4533A`, mạch `#6B3A2A` |
| 3 | đá granite hạt mịn, đường ghép đá vuông | `#B9BEC2`, mạch `#8C9196` |
| 4 | đá cẩm thạch trắng kẻ vân xám, mép vàng mảnh | `#E9ECF1`, vân `#B8C3D6`, viền `#D9A92B` |
| 5 | đá vàng chạm hoa văn trống đồng nhỏ (vòng tròn đồng tâm) | `#E3B23C`, chạm `#B8861A` |

- Cột trụ bập bênh, tường vách dùng cùng pattern nhưng tối hơn 15 %.
- Bậc đặc biệt (bục chìa/Hiến pháp): thêm **thảm đỏ** hẹp 3 px trên mặt.

## B10. Đạo cụ trang trí đặt theo phần (không va chạm)

Mỗi phần có 4–6 đạo cụ ở **nền gần** (đứng trên mặt đất) hoặc treo trên cao. Gợi ý:

| Level · Phần | Đạo cụ |
|--------------|--------|
| 1.1 | đèn dầu treo cột, tờ giấy dán tường (hình cuộn), bó rơm |
| 1.2 | rừng cờ nhỏ trên cọc, loa phóng thanh trên cột tre, thùng gỗ |
| 1.3 | bàn bầu cử có hòm gỗ, chòi tranh, hàng rào tre, bảng gỗ trống |
| 1.4 | cột cờ, giỏ lúa, vài chiếc nón lá đặt trên bàn |
| 1.5 | bàn thờ nhỏ có cờ, đèn, cuốn Hiến pháp bìa đỏ trên giá (hình mờ phía sau) |
| 2.1 | bản đồ chữ S dán tường (không chữ), cờ lớn, dải ruy-băng |
| 2.2 | tủ gạo, sổ tem phiếu dán tường, biển cửa hàng (không chữ), xe đạp tựa tường |
| 2.3 | ống khói tắt, bánh răng gỉ, thùng phi, xích treo |
| 2.4 | băng rôn đỏ trên cao, bóng đèn lớn, rèm sân khấu, hàng ghế |
| 2.5 | bó lúa, máy gặt nhỏ, ống khói bốc khói trắng, mặt trời |
| 3.1 | bàn giấy, chồng hồ sơ, đèn bàn xanh, kệ sách |
| 3.2 | bục phát biểu, micro, cờ đứng, thảm đỏ |
| 3.3 | cán cân công lý lớn (trang trí), cột trắng, bình hoa |
| 3.4 | vòm đá khắc 3 phù điêu (phía sau khung chữ), đuốc đèn |
| 3.5 | bậc thềm, cờ treo, lẵng hoa |
| 4.1 | bục sách mở, dải đánh dấu vàng khổng lồ, bút lông |
| 4.2 | 3 trụ đá nhỏ (trang trí) có biểu tượng sách · bánh răng · búa |
| 4.3 | tấm ranh giới phát sáng, cột đèn kính |
| 4.4 | chồng hồ sơ, con dấu khổng lồ (hình mờ) trên tường |
| 4.5 | tòa nhà kính, cờ đỏ trên cột cao, đèn LED |
| 5.1 | trang Hiến pháp khổng lồ trên tường, cờ lớn |
| 5.2 | khung vàng lớn (nền), thảm đỏ |
| 5.3 | giấy bay (nền), tủ hồ sơ mở, dấu đỏ lớn mờ |
| 5.4 | biển chỉ đường trống, đèn đường vàng |
| 5.5 | cổng vàng lớn cuối đường, hoa, dải cờ |

## B11. Đồ họa từng cơ chế (khớp mục 4 của spec 5)

Mỗi cơ chế: **hình dáng · màu · trạng thái · hoạt ảnh**. Màu đổi nhẹ theo thời kỳ (dùng màu nhấn của thời kỳ khi ghi "màu nhấn").

| Cơ chế | Hình dáng | Trạng thái và hoạt ảnh |
|--------|-----------|------------------------|
| **Nút đỏ** | đế kim loại tròn dẹt (rộng 28 px), nút đỏ nổi 8 px, vành sáng | nhả: nút nổi + đèn đỏ nhấp nháy chậm; bị bấm: nút lún còn 3 px, đèn **xanh lá**, hạt sáng tỏa 150 ms |
| **Cổng chặn** | L1 cổng gỗ có then cài chéo · L2 song sắt dọc · L3–4 cửa đá chạm sao · L5 cửa vàng | mở: trượt lên trong 500 ms kèm bụi; đóng: nặng, rơi xuống kèm rung 3 px |
| **Cầu hiện** | tấm ván/ngói/đá tùy thời kỳ | chưa hiện: khung **nét đứt sáng** nhấp nháy; hiện: các tấm lật lần lượt từ trái sang phải mỗi tấm 60 ms |
| **Hòm phiếu** | hòm gỗ có khe, dán dải cờ nhỏ, cờ cắm trên nắp; ô số `k/n` trên mặt | nộp phiếu: lá phiếu **bay vòng cung** vào khe, hòm nảy nhẹ, số tăng; đủ: hòm phát sáng vàng + dải ruy-băng bay |
| **Phiếu bầu** | tờ giấy trắng 18 × 22 có dấu ✓ đỏ, góc cuộn | chưa nhặt: vầng sáng vàng, **nhấp nhô ±2 px**; đang mang: lơ lửng trên đầu người, **xoay lắc ±8°**, kéo theo vài hạt; thua: bay vòng về chỗ cũ |
| **Cuốn Hiến pháp (chìa)** | cuốn sách bìa đỏ 20 × 24, sao vàng giữa bìa, gáy vàng; năm in nhỏ ở góc (1946/1992/2013) | chưa nhặt: tỏa **tia sáng** quay chậm; đang mang: lơ lửng trên đầu, tỏa vầng sáng nhỏ; chạm cửa: bay vào ổ khóa, cửa mở |
| **Mảnh chữ** | thẻ đá 44 × 20 khắc chữ, viền nét trống đồng | đang mang như phiếu; nộp vào **vòm đá**: chữ rơi vào đúng ô, ô sáng vàng |
| **Khung chữ (vòm đá)** | vòm 3 ô ngang, nền tối khắc rãnh | chưa đủ: ô tối có dấu `···`; đủ: cả vòm **phát sáng**, tia sáng đâm lên, cổng mở |
| **Sàn sụp** | L1 gạch nứt nâu · L2 tấm ghép **tem phiếu** ố vàng · L3–L5 đá có vết nứt | 0,8 giây đứng: **rung** ±2 px, số đếm ngược `0.8s → 0` ở giữa tấm (nền tối, chữ trắng), vết nứt lan; sụp: vỡ thành 5–6 mảnh rơi xoay; hồi: từ dưới mọc lên nhanh 200 ms |
| **Băng** | khối băng xanh nhạt `#B3E5FC`, mép trên có vệt phản chiếu trắng chạy chéo | luôn tĩnh; người trượt để lại **vệt trắng** sau chân 300 ms |
| **Băng chuyền** | L1: dải **biểu ngữ/cờ vải** chạy ngược · L2: băng tải nhà máy, con lăn tròn · L4–5: dải đèn chạy | các mũi tên/biểu ngữ **trôi theo chiều chạy** đúng tốc độ; con lăn quay; đứng trên thì bụi bay theo |
| **Bục số** | bục tím, **biển số** trên cột cao (như ảnh tham khảo), số trắng to 20 px trên bảng kem | thiếu người: số cam `k/N`; đủ: số **xanh lá** + 4 mũi tên ↑ trên bục, bục nâng kèm bụi; hạ: mũi tên ↓ |
| **Sàn chở có nút** | L1: bè/phà tre · L2: phà sắt · L3–4: thang máy kính có tay vịn · L5: kiệu vàng; ghế/nút đỏ trên sàn | chạy: **sóng nước/khói** phía dưới, đèn pha sáng; dừng (có ai rời nút): đèn **đỏ nhấp nháy**, còi nhỏ; lộ trình vẽ **nét đứt mờ** phía trước |
| **Trạm dừng** | cột mốc nhỏ có đèn | khi sàn dừng ở trạm: đèn xanh, đếm 3 giây |
| **Khối đỏ L2 (búa máy)** | đầu búa thép đỏ + cán + piston; răng cưa mặt dưới | dập xuống: **dấu hiệu cảnh báo** (sọc vàng đen nhấp nháy) 0,3 giây trước; đập: rung màn hình 2 px, tia lửa |
| **Khối đỏ L3 (con lắc)** | quả lắc tròn đỏ treo dây xích | đung đưa quanh trục; dây xích vẽ đúng |
| **Khối đỏ L4–5 (tay quyền lực)** | bàn tay đeo găng đỏ hình chữ L, ngón trỏ chỉ xuống | dập/quét: khi sắp động, ngón tay co lại 0,3 giây báo trước |
| **Khối số** | khối đá kem viền cam, **số khắc to** ở giữa (như ảnh tham khảo) | đẩy được: số xanh; chưa đủ người: số cam; rơi vào hố: tiếng "thịch", bụi |
| **Khối "Bãi bỏ"** | chồng hồ sơ buộc dây gai, ghim đỏ | vào ô đích: con dấu đỏ lớn **đóng xuống** (hiệu ứng nén), hồ sơ vỡ thành chim giấy bay lên rồi tan |
| **Ô đích** | khung nét đứt xanh lá, ghi `Đích` nhỏ | khối vào: nhấp sáng xanh; khi khối chưa dừng hẳn: đỏ |
| **Vùng chậm** | **giấy tờ bay lơ lửng** (hình chữ nhật nhỏ nghiêng) + con dấu tròn nảy lên xuống | người vào: giấy bay quanh người, người chậm; biến mất khi khối "Bãi bỏ" vào đích: giấy hóa chim giấy bay đi |
| **Trần nguy hiểm** | dải đỏ mờ phủ trên; mép dưới **nét đứt đỏ sáng**; trên dải **chữ chạy ngang** "RANH GIỚI HIẾN PHÁP & PHÁP LUẬT" (marquee 40 px/s, chữ in hoa Oswald 11 px, màu đỏ đậm) | nhịp sáng lên khi người đến gần (< 3 ô) |
| **Bập bênh** | tấm gỗ dày (dài 7 ô) trên trụ chữ nhật; **hai đĩa cân** (hình lòng chảo nhỏ) ở hai đầu, dây treo; đòn cân ở giữa | nghiêng theo góc thật; lệch > 14°: viền **xanh băng**, vệt trượt dưới chân; trục có **kim chỉ** thăng bằng nhỏ (kim xanh lá khi gần cân bằng) |
| **3 trụ Lập pháp / Hành pháp / Tư pháp** | 3 trụ đá tròn cao 2 ô, đỉnh có biểu tượng: cuốn luật · bánh răng · búa thẩm phán; nút đỏ trên đỉnh | bấm: biểu tượng sáng; đủ 3: 3 tia sáng nối nhau thành tam giác, cổng mở |
| **Dãy nút dẫn đường** | lối trên cao là **hành lang đèn** (dải cờ nhỏ); người dẫn đứng nút được gắn **lá cờ đỏ** sau lưng | cầu bật theo bước: từng tấm sáng bắt đầu từ chỗ người dẫn; thả nút: tắt sau 0,2 giây |
| **Cột có nút giữa hố** | cột đá/gạch có nút đỏ trên đỉnh | đủ nút: cầu vàng hiện (tấm lật lần lượt) |
| **Cột mốc** | xem B7 | — |
| **Cửa cuối level** | L1 cổng làng · L2 cổng nhà máy · L3 cửa vòm Quốc hội · L4 cửa kính · L5 **cổng vàng** | chưa mở: đóng; mở: hai cánh trượt, ánh sáng **tràn ra** (quầng sáng), cờ bay; cả nhóm vào: vòng sáng nở |

## B12. Nhân vật, dây, vật mang, hiệu ứng

- **Nhân vật** giữ như hiện tại (hình vuông, tai nhỏ, màu theo ô); thêm **bóng đổ** hình bầu dục dưới chân (20 % đen).
- **Dây**: sợi gai nâu 3 px (đã có); thêm **nút thắt** ở hai đầu; khi **căng** (>3,8 ô) dây **rung** và đổi màu đỏ nhạt.
- **Vật đang mang** (phiếu, Hiến pháp, mảnh chữ) lơ lửng cao 0,7 ô trên đầu, kèm **tia sáng nhỏ** kéo theo; nếu người mang chết: vật **bay vòng cung** về chỗ cũ trong 0,5 giây.
- **Thua**: màn nháy đỏ (như hiện tại) + **giấy vụn/mảnh gạch bay** quanh người gây thua.
- **Hạt (particles)**: dùng chung 1 hệ nhỏ (tối đa 200 hạt): bụi, tia lửa, giấy bay, hạt vàng, pháo hoa. Hạt chỉ là chấm/hình chữ nhật nhỏ, không cần ảnh.
- **Rung màn hình**: 2 px, 120 ms khi búa đập / cửa đóng / khối rơi.
- **Chuyển level**: ảnh bìa thời kỳ **mờ dần** thay màn chơi 600 ms; nền trang đổi màu 600 ms.

## B13. Chữ trên màn hình

| Vị trí | Kiểu chữ |
|--------|----------|
| Năm trên cổng / khung / thẻ | Oswald, đậm, màu nhấn |
| Cụm, nhãn vật | Inter 600, 11–13 px, nền kem bán trong suốt |
| Dòng khung tư liệu | Inter 400, 14 px |
| Số trên bục/khối | monospace đậm 20 px |
| Chữ chạy "RANH GIỚI…" | Oswald 11 px in hoa |

Tất cả chữ có **viền sáng 2 px** (halo) khi nằm trên nền họa tiết để không chìm.

## B14. Âm thanh gợi ý (tùy chọn, giữ nhẹ)

Giữ `jump.mp3`, `restart.mp3`. Thêm (ngắn, < 30 KB mỗi file): `stamp` (đóng dấu), `ballot` (thả phiếu), `gate-bell` (chuông cổng mốc), `crumble` (sàn sụp), `page` (lật thẻ).

## B15. Dễ phân biệt, dễ đọc

- Không chỉ dựa vào màu: mỗi trạng thái có **hình** khác (✓, mũi tên, số, nét đứt).
- Tương phản chữ ≥ 4,5:1 trên nền thẻ; vật quan trọng (phiếu, Hiến pháp, nút) có **viền đen 2 px**.
- Chiếu máy chiếu: chữ khung tư liệu ≥ 14 px; nhãn trong màn chơi ≥ 11 px đậm.

## B16. Ngân sách hiệu năng

| Thứ | Mục tiêu |
|-----|----------|
| Khung hình | ≥ 55 FPS trên laptop phòng thuyết trình |
| Nền 2 lớp + trời | vẽ sẵn 1 lần/level vào canvas phụ; mỗi khung chỉ cắt dán (2 lần `drawImage`) |
| Gạch | pattern tạo sẵn; mỗi khung chỉ tô vùng nhìn thấy |
| Hạt | ≤ 200 |
| Ảnh minh họa | 30 ảnh × ≤ 150 KB ≈ 4,5 MB; tải trước ảnh level kế khi đang chơi |
| Mạng/server | không đổi (đồ họa chỉ ở web; server vẫn gửi cùng snapshot) |

## B17. Việc tiếp theo khi bạn duyệt

1. Bạn chọn hướng ưu tiên: **ảnh trước** (tôi soạn script gọi Puter.js sinh lần lượt 5 bìa + 5 ảnh Level 1 để duyệt phong cách) hoặc **code đồ họa trước**.
2. Tôi viết plan + docs "bê vào là chạy": thư mục `src/theme/` (bảng màu, nền, gạch, đạo cụ, vẽ từng cơ chế), `TimelineBar`, `ArchivePanel`, `PartCard`, `EndingPoster`, rút `chapters.py` còn 5 phần/level.
