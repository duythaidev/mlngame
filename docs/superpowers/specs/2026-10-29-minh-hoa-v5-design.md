# Thiết kế bản 5 — Minh họa và rút gọn level

- Ngày: 2026-10-29 · Trạng thái: **chờ nhóm duyệt** (chưa code)
- Dựa trên bản 4 (`2026-10-28-level-lich-su-v4-design.md`): giữ nguyên engine 17 cơ chế, dây nối, 2–5 người, mạch lịch sử → câu trả lời.
- Thay đổi chính: (1) **mỗi level 5 phần** (bản 4: 8); (2) **minh họa là chính** — mỗi thời kỳ một phong cách đồ họa, nền nhiều lớp, đạo cụ trang trí, cổng mốc, đồ họa cho từng cơ chế, ảnh minh họa; chữ chỉ còn năm + một cụm ngắn; (3) cho phép **ẩn dụ và nội dung chính trị** nhưng nói bằng **hình**, không bằng câu giải thích.

---

## 1. Nguyên tắc

| # | Nguyên tắc |
|---|-----------|
| N1 | **Hình nói thay chữ.** Ẩn dụ (sàn sụp = cơ chế cũ lung lay, trần đỏ = ranh giới Hiến pháp, người dẫn cầm cờ soi đường…) thể hiện bằng **hình dáng, màu, đạo cụ** của vật thể; không viết câu "X tượng trưng cho Y" |
| N2 | **Mỗi thời kỳ một "bộ áo"**: bảng màu, họa tiết gạch nền, nền xa/gần, đạo cụ, nhạc màu riêng — nhìn là biết đang ở thời kỳ nào |
| N3 | **Chữ tối thiểu:** trên màn chơi chỉ có năm (to) + cụm ≤ 6 từ ở cổng mốc; nhãn vật ≤ 3 từ |
| N4 | **Đồ họa vẽ bằng code** (canvas, không cần file ảnh) cho mọi thứ trong màn chơi → nhẹ, đồng bộ qua server, không phụ thuộc mạng |
| N5 | **Ảnh minh họa** (sinh bằng Puter.js) dùng ở **ngoài màn chơi**: khung tư liệu, thẻ mở phần, màn kết. Thiếu ảnh thì hiện hình vẽ code thay thế |
| N6 | Level ngắn hơn: **5 phần/level**, mỗi phần ~1 màn hình rưỡi (35–45 ô) |

---

## 2. Bố cục màn chơi

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ● 1919–1946 ━━ ● 1976–1986 ━━ ○ 1991–1995 ━━ ○ 2001–2022 ━━ ○ Câu trả lời │  ← THANH THỜI GIAN (HTML)
│   [tem][tem][tem][ ][ ]                                                   │     tem = phần đã qua
├──────────────────────────────────────────────────────────┬────────────────┤
│                                                          │ KHUNG TƯ LIỆU  │
│                    CANVAS 800 × 512                      │ ┌────────────┐ │
│   nền xa (núi, mái nhà, cờ)  ·  nền gần  ·  màn chơi     │ │  ẢNH        │ │
│   cổng mốc có năm to · đạo cụ · vật thể có đồ họa riêng  │ │  MINH HỌA   │ │
│                                                          │ └────────────┘ │
│                                                          │ 1946           │
│                                                          │ Tổng tuyển cử  │
│                                                          │ (1 dòng)       │
└──────────────────────────────────────────────────────────┴────────────────┘
```

- **Thanh thời gian** (trên): 5 chấm thời kỳ, chấm hiện tại sáng; dưới là 5 ô **tem** của level hiện tại — qua mỗi phần, một tem bay từ cổng mốc lên ô của nó.
- **Khung tư liệu** (phải, 260 px; trên điện thoại chuyển xuống dưới canvas): ảnh minh họa của phần hiện tại + năm + 1 dòng. Đổi khi qua cổng mốc (hiệu ứng lật thẻ).
- **Thẻ mở phần** (phủ canvas 2 giây khi bắt đầu level): ảnh minh họa thời kỳ + tên level + khoảng năm.
- **Màn kết**: poster tổng hợp 5 thời kỳ (ghép 5 ảnh) + "KHÔNG MÂU THUẪN" + 3 ý + 25 tem đã thu.

---

## 3. Bộ áo từng thời kỳ (vẽ bằng code)

Mỗi bộ áo = `theme` gồm: bảng màu, họa tiết gạch nền, nền xa (lớp 1, cuộn 0,2×), nền gần (lớp 2, cuộn 0,5×), đạo cụ trang trí đặt theo phần, kiểu cổng mốc, hiệu ứng không khí.

| Level | Thời kỳ | Bảng màu | Gạch nền | Nền xa / nền gần | Đạo cụ trang trí | Không khí |
|-------|---------|----------|----------|------------------|------------------|-----------|
| 1 | 1919–1946 · Nền móng | sepia, nâu đất, đỏ son nhạt, vàng giấy cũ | đất nện + đá ong | đồi núi Việt Bắc, rặng tre, mái đình; gần: lũy tre, mái tranh, cột cờ | cờ đỏ sao vàng, loa phóng thanh, hòm phiếu gỗ, bàn bầu cử, đèn dầu | hạt bụi bay, viền tối như phim cũ (vignette) |
| 2 | 1976–1986 · Thống nhất, Đổi mới | xám xanh, nâu gạch, vàng tem phiếu → chuyển dần **bình minh cam hồng** ở phần 4–5 | gạch đỏ cũ, bê tông | ống khói nhà máy, dãy nhà tập thể; gần: cột điện, xe đạp, hàng rào | tem phiếu, sổ gạo, biển "Đổi mới" phần cuối | phần đầu trời xám; từ phần 4 mặt trời mọc dần |
| 3 | 1991–1995 · Hình thành khái niệm | xanh ngọc, trắng ngà, đỏ son | đá granite sáng | trụ sở cột trắng (kiểu Nhà Quốc hội cách điệu), hàng cây; gần: bậc thềm, lan can | cán cân công lý, cuốn sách luật, bục phát biểu, chữ "Của dân · Do dân · Vì dân" khắc trên vòm | ánh nắng xiên |
| 4 | 2001–2022 · Hiến định, hoàn thiện | xanh dương đậm, vàng kim, đỏ son | đá cẩm thạch kẻ vân | thành phố hiện đại, tòa nhà kính; gần: dải cờ, cột đèn | cuốn Hiến pháp 2013 lớn, 3 trụ Lập pháp/Hành pháp/Tư pháp, bánh răng | ánh sáng sạch, phản chiếu |
| 5 | Câu trả lời | vàng kim + đỏ cờ, nền trời hoàng hôn | nền vàng kim chạm hoa văn trống đồng | toàn cảnh 4 thời kỳ ghép thành dải panorama; gần: cờ, hoa | biểu tượng 5 thời kỳ dọc đường, cổng vàng cuối | pháo hoa nhẹ khi thắng |

Chi tiết vẽ (đủ để code):
- **Nền xa / gần**: các hình đa giác + gradient vẽ một lần vào canvas phụ (offscreen) rộng = level, rồi chỉ cắt dán theo camera → không tốn CPU mỗi khung.
- **Gạch nền**: mỗi ô đặc vẽ họa tiết 32×32 tạo sẵn (pattern) theo theme; mép trên có viền sáng.
- **Đạo cụ**: danh sách `props` theo phần (loại, vị trí); không va chạm, chỉ để nhìn.

---

## 4. Đồ họa cho từng cơ chế (ẩn dụ bằng hình)

| Cơ chế | Hình dáng (thay khối trơn hiện tại) | Ẩn dụ thể hiện bằng hình |
|--------|-------------------------------------|---------------------------|
| Cổng mốc (cột mốc) | **Cổng chào** 2 cột + mái, bảng năm to (vd "1946"), dưới là cụm ≤ 6 từ; đã qua: cờ kéo lên, đèn sáng | mốc lịch sử |
| Nút đỏ | nút tròn có vành kim loại; lún + đèn xanh khi bấm | — |
| Cổng chặn | L1: cổng gỗ then cài; L2: song sắt; L3–4: cửa đá chạm khắc; mở: trượt lên | — |
| Hòm phiếu | hòm gỗ có khe, dán cờ; mỗi lá phiếu nộp bay vào khe | bầu cử 1946 |
| Phiếu bầu | lá phiếu có dấu ✓ đỏ, lơ lửng trên đầu người mang, xoay nhẹ | quyền công dân |
| Chìa khóa | **cuốn Hiến pháp** (bìa đỏ, chữ vàng "HIẾN PHÁP 1946/1992/2013") thay chìa | Hiến pháp mở cửa |
| Mảnh chữ / khung chữ | thẻ đá khắc chữ; khung là **vòm đá** có 3 ô, đủ chữ thì vòm sáng | "của dân · do dân · vì dân" |
| Sàn sụp | L2: tấm ghép từ **tem phiếu** ố vàng, nứt dần; L1/L4: gạch nứt; đếm ngược hiện trên tấm | cơ chế cũ lung lay |
| Băng | mặt băng có vệt phản chiếu | đoạn "chưa có quy định cụ thể" (L2) |
| Băng chuyền | băng tải nhà máy (L2), dòng người/biểu ngữ chạy ngược (L1) | sức ép thời cuộc |
| Bục số | bục có **biển số lớn** trên cột (như ảnh tham khảo), đủ người thì đèn xanh | đồng lòng |
| Sàn chở có nút | toa tàu / phà (L2: phà sông, L3–4: thang máy kính), nút là ghế ngồi đỏ | cùng ngồi một thuyền |
| Khối đỏ | L2: búa máy dập; L3: con lắc; L4–5: "tay quyền lực" chữ L có găng đỏ | lạm quyền |
| Khối số | khối đá có số khắc; khối "Bãi bỏ" là **chồng hồ sơ buộc dây**, vào đích thì bị đóng dấu "BÃI BỎ" rồi tan | thủ tục phiền hà |
| Vùng chậm | lớp **giấy tờ bay lơ lửng** + con dấu nảy | thủ tục rườm rà |
| Trần nguy hiểm | dải đỏ có chữ "RANH GIỚI HIẾN PHÁP & PHÁP LUẬT" chạy (marquee), viền nét đứt sáng | khuôn khổ pháp luật |
| Bập bênh | **cán cân công lý** (đòn cân trên trụ, hai đĩa ở đầu) | cân bằng quyền lực |
| 3 nút Lập/Hành/Tư pháp | 3 **trụ đá** có biểu tượng (quyển luật / bánh răng / búa thẩm phán) | phân công, phối hợp, kiểm soát |
| Dãy nút dẫn đường | người dẫn được gắn **lá cờ đỏ** trên lưng khi đứng nút; cầu sáng theo bước | soi đường |
| Cửa level | L1: cổng làng; L2: cổng nhà máy rực bình minh; L3: cửa vòm Quốc hội; L4: cửa kính trụ sở; L5: **cổng vàng** |

---

## 5. Năm level × 5 phần

Giữ hình học bản 4, chọn 5 phần mạnh nhất mỗi level (gộp phần ngắn). Mỗi phần có **cổng mốc** (năm + cụm từ) và **ảnh tư liệu**.

### Level 1 — 1919–1946 · Nền móng
| Phần | Cổng mốc | Từ bản 4 | Ảnh tư liệu |
|------|----------|----------|-------------|
| 1 | 1919 · "Thần linh pháp quyền" | 1.1 (vách chồng người) | trang thơ "Việt Nam yêu cầu ca" trên giấy cũ |
| 2 | 1945 · Tuyên ngôn Độc lập | 1.2 (băng chuyền + gai) | Quảng trường Ba Đình, biển cờ |
| 3 | 06/01/1946 · Tổng tuyển cử | 1.3 (5 phiếu) | người dân xếp hàng bỏ phiếu |
| 4 | "Hễ là công dân…" | 1.4 (sàn sụp → hòm phiếu) | hòm phiếu, tay bỏ phiếu |
| 5 | 11/1946 · Hiến pháp đầu tiên | 1.6 + 1.8 (cột có nút → Hiến pháp 1946 → cửa) | cuốn Hiến pháp 1946 |

### Level 2 — 1976–1986 · Thống nhất và Đổi mới
| Phần | Cổng mốc | Từ bản 4 | Ảnh tư liệu |
|------|----------|----------|-------------|
| 1 | 1976 · Nước CHXHCN Việt Nam | 2.1 (bục số + gờ băng) | lá cờ trên nóc dinh, đất nước liền một dải |
| 2 | Trước 1986 | 2.2 (cánh đồng băng) | sổ gạo, tem phiếu, hàng người xếp hàng |
| 3 | Khó khăn | 2.4 (băng chuyền xuôi + sàn sụp tem phiếu) | nhà máy ngừng máy |
| 4 | 12/1986 · Đổi mới | 2.5 (sàn chở có nút, búa máy) | hội trường Đại hội VI, ánh bình minh |
| 5 | "Lấy dân làm gốc" | 2.6 + 2.8 (3 mảnh: bản chất · mục tiêu · động lực → cửa) | ruộng lúa, nhà máy chạy lại |

### Level 3 — 1991–1995 · Hình thành khái niệm
| Phần | Cổng mốc | Từ bản 4 | Ảnh tư liệu |
|------|----------|----------|-------------|
| 1 | 06/1991 · Cương lĩnh | 3.1 (hầm trú, con lắc quét) | văn kiện Cương lĩnh |
| 2 | 29/11/1991 · "Nhà nước pháp quyền XHCN" | 3.2 (khối lấp hố + làm bậc) | bục phát biểu, dòng chữ khái niệm |
| 3 | 1992 · Hiến pháp | 3.3 (3 cán cân) | cán cân công lý + Hiến pháp 1992 |
| 4 | 1994 · Của dân · Do dân · Vì dân | 3.4 (3 mảnh chữ → vòm đá) | vòm đá khắc 3 cụm từ |
| 5 | 1995 | 3.6 + 3.7 + 3.8 (thang máy kính dưới trần đỏ → Hiến pháp → cửa) | trụ sở cột trắng |

### Level 4 — 2001–2022 · Hiến định và hoàn thiện
| Phần | Cổng mốc | Từ bản 4 | Ảnh tư liệu |
|------|----------|----------|-------------|
| 1 | 2001 · Hiến định thuật ngữ | 4.1 (chuỗi sàn sụp) | trang Hiến pháp sửa đổi 2001 |
| 2 | 2011 · Phân công · Phối hợp · Kiểm soát | 4.2 (3 trụ Lập/Hành/Tư pháp) | 3 trụ cột / 3 bánh răng |
| 3 | 2013 · Điều 4 | 4.3 (ranh giới đỏ + cán cân) | Hiến pháp 2013 mở trang Điều 4 |
| 4 | Không có vùng cấm | 4.6 (khối trên băng, tay quyền lực quét) | con dấu "XỬ LÝ" trên hồ sơ |
| 5 | 2022 · Nghị quyết 27 | 4.7 + 4.8 (thang kính + Hiến pháp 2013 → cửa) | tờ Nghị quyết 27-NQ/TW |

### Level 5 — Câu trả lời
| Phần | Cổng mốc | Từ bản 4 | Ảnh tư liệu |
|------|----------|----------|-------------|
| 1 | Được Hiến pháp ghi nhận | 5.1 (bục số + gờ băng + sàn sụp) | Điều 4 khoản 1 |
| 2 | Trong khuôn khổ pháp luật | 5.2 (ranh giới + cán cân + băng chuyền) | Điều 4 khoản 3 |
| 3 | Bãi bỏ thủ tục phiền hà | 5.4 (giấy tờ bay + hồ sơ "Bãi bỏ") | con dấu "BÃI BỎ" |
| 4 | Tiếp tục hoàn thiện | 5.5 (thang kính + 2 tay quyền lực) | Nghị quyết 27 |
| 5 | Câu trả lời | 5.6 (Hiến pháp → cổng vàng) | poster tổng hợp |

Màn kết: **"KHÔNG MÂU THUẪN"** + 3 ý (giữ như bản 4) trên poster ghép 5 ảnh thời kỳ + 25 tem.

---

## 6. Ảnh minh họa (Puter.js)

- **Số lượng:** 5 ảnh thời kỳ (thẻ mở level, poster kết) + 25 ảnh phần (khung tư liệu) = **30 ảnh**. Làm trước 5 ảnh thời kỳ + 5 ảnh Level 1 để duyệt phong cách.
- **Phong cách thống nhất:** tranh cổ động Việt Nam / tranh khắc gỗ, nét dày, ít màu theo bảng màu của thời kỳ (mục 3), nền giấy; tỉ lệ 4:3, 1024×768.
- **Nội dung:** ưu tiên **cảnh và vật biểu tượng** (lá phiếu, hòm phiếu, cuốn Hiến pháp, quảng trường, nhà máy, cán cân). **Không vẽ chân dung lãnh tụ / người thật** (AI dễ vẽ sai, không phù hợp).
- **Lưu:** `public/art/l{level}-p{phần}.webp`, `public/art/era{level}.webp`; nén ≤ 150 KB/ảnh.
- **Dự phòng:** thiếu ảnh → khung tư liệu hiện hình vẽ code của đạo cụ chính phần đó.
- Danh sách prompt cụ thể: viết ở bước plan (mỗi ảnh 1 prompt tiếng Anh + 1 dòng mô tả tiếng Việt).

---

## 7. Chữ còn lại

| Ở đâu | Nội dung |
|-------|----------|
| Cổng mốc | năm (to) + cụm ≤ 6 từ |
| Khung tư liệu | năm + 1 dòng ≤ 70 ký tự (giữ các dòng của bản 4, rút gọn) |
| Nhãn vật | ≤ 3 từ: "Hòm phiếu", "Lập pháp", "Bãi bỏ", "Ranh giới Hiến pháp" |
| Thẻ mở level | tên level + khoảng năm |
| Màn kết | câu hỏi · "KHÔNG MÂU THUẪN" · 3 ý |

Bỏ dòng chữ chạy trên canvas của bản 4 (thay bằng cổng mốc + khung tư liệu).

---

## 8. Kỹ thuật (để lập plan)

| Phần | Việc |
|------|------|
| `levelData` | `chapters.py`: cắt còn 5 phần/level (mục 5); thêm `props` trang trí theo phần; mốc đọc từ `story.ts` |
| `theme/` (mới, chỉ web) | `themes.ts` (bảng màu, theo level), `backdrop.ts` (vẽ nền xa/gần vào canvas phụ), `tiles.ts` (pattern gạch), `props.ts` (vẽ đạo cụ), `objects/*.ts` (vẽ từng cơ chế theo mục 4) |
| `renderer.ts` | gọi theme: nền → gạch → đạo cụ → vật thể → dây → người → hiệu ứng; bỏ banner chữ |
| UI | `TimelineBar.tsx`, `ArchivePanel.tsx` (khung tư liệu), `PartCard.tsx` (thẻ mở level), `EndingPoster.tsx`; bố cục 2 cột, co về 1 cột trên điện thoại |
| `story.ts` | thêm `parts[level][part] = { year, phrase, line, image }` |
| Ảnh | `public/art/*`; tải trước khi vào level; thiếu thì dự phòng |
| Server | không đổi (chỉ `levelData` mới → `sync-shared`) |
| Hiệu năng | nền vẽ sẵn offscreen; mục tiêu ≥ 55 khung/giây trên máy phòng thuyết trình |

---

## 9. Câu hỏi để chốt

1. Bố cục **2 cột** (canvas + khung tư liệu bên phải) hay **khung tư liệu nằm dưới canvas** (canvas to hơn, chiếu máy chiếu dễ nhìn)?
2. Làm **ảnh trước** (duyệt phong cách tranh cổ động/khắc gỗ) hay **code đồ họa trước**?
