# Thiết kế level bản 4 — "Từ lịch sử đến câu trả lời"

- Ngày: 2026-10-28 · Trạng thái: **chờ nhóm duyệt** (chưa plan, chưa code)
- Thay thế phần level của spec bản 3 (`2026-10-25-thiet-ke-5-level-phap-quyen.md`) và bộ docs `mlngame/docs/level-phap-quyen/` (sẽ viết lại theo spec này).
- Tham khảo: 6 ảnh nhóm gửi — (1) cột có nút giữa hố + bục chìa khóa; (2) sàn xanh có nút cho từng người; (3) chồng 3 người lấy chìa + bục số "4"; (4) vạch trần "Ranh giới thượng tôn Hiến pháp & pháp luật" + "Cần đủ 3 nhánh"; (5) sàn chở đi đường chéo nét đứt + khối đỏ chữ L; (6) khối số "1" đẩy làm bậc lên cửa.

---

## 1. Mục tiêu và quyết định đã chốt

| # | Quyết định | Ghi chú |
|---|-----------|---------|
| Q1 | Game **kể theo dòng lịch sử** (level 1–4), **level 5 trả lời câu hỏi** của bài | Người chơi hứng thú với lịch sử → kết quả → câu trả lời |
| Q2 | **2–5 người** một phòng; mọi đoạn qua được khi chỉ có 2 người | Số liệu co giãn theo `n` (mục 4) |
| Q3 | **Dây nối** giữa hai người liền kề (theo thứ tự ô s0–s1–s2…), dài 4 ô — cơ chế gốc, có ở mọi đoạn | Mọi thiết kế phải qua được với dây (mục 3) |
| Q4 | Chỉ dùng mốc có trong **docx + giáo trình**; không thêm Hiến pháp 1959/1980 | |
| Q5 | Mỗi đoạn **1 dòng chữ ý chính** (có năm). **Không** có chữ hướng dẫn cách chơi | Người chơi tự hiểu qua hình |
| Q6 | Mỗi đoạn **kết hợp ≥ 2 cơ chế**; **không lặp** kiểu đoạn liền trước; **không đoạn nào đi phẳng** | |
| Q7 | Số nút cần người đứng **≤ n**; nút thừa (khi n nhỏ) **ẩn** hoặc **đè được bằng khối** | Hết cảnh "5 nút mà có 2 người" |
| Q8 | Bỏ "cùng đứng 6 giây"; bỏ "giữ cửa luân phiên" | |
| Q9 | **Sàn băng là địa hình cố định**; không có nút biến băng thành nền | |
| Q10 | Phiếu bầu = **một biểu tượng phiếu chung**, mang trên đầu; mỗi người 1 phiếu; người mang chết → phiếu về chỗ cũ | Cơ chế M8 |
| Q11 | Làm đủ cơ chế mới M8–M16, gồm **băng chuyền** và **bập bênh trơn khi lệch** | |
| Q12 | Kiểm thử: test ngắn cho từng cơ chế + chơi thử bằng tay trong Sandbox `?n=2` và `?n=5`; **không** làm bot chơi hết level | Nhóm yêu cầu |

**Thời lượng mục tiêu:** ~30 phút cho 5 level với nhóm lần đầu chơi (mỗi level 5–7 phút).

---

## 2. Giới hạn vật lý (đã đo trên engine hiện tại)

| Thứ | Giá trị |
|-----|---------|
| Ô | 1 ô = 32 px; level cao 16 hàng; nền thường ở hàng 12–15, người đứng ở hàng 11 |
| Nhân vật | vuông 0,8 ô; 2 góc đáy vát 0,03 ô |
| Chạy | 5 ô/s |
| Nhảy một mình | cao ~1,6–1,7 ô (lên được bậc **1 ô**), xa ~2,6 ô (qua được hố **≤ 2 ô**, **gai đơn**) |
| Chồng 2 người | người trên nhảy từ đầu người dưới: với tới bục **2 ô** |
| Chồng 2 người trên khối 1 ô | với tới bục **3 ô** |
| Người bị đè trên đầu | không nhảy được |
| Dây | 4 ô giữa hai người liền kề; chùng thì không có lực; kéo người treo dưới vách lên được (1 người kéo 1 người) |
| Thua | chạm gai / vùng chết / khối đỏ / rơi khỏi đáy → 1 giây "Thua" → cả nhóm về cột mốc gần nhất |

---

## 3. Luật thiết kế vì có dây (bắt buộc cho mọi đoạn)

1. **Không tách nhóm thành nhiều nhánh đường riêng.** Dây nối thành chuỗi, hai người liền kề không thể cách nhau > 4 ô. (Bản trước có ghi "3 nhánh Lập pháp / Hành pháp / Tư pháp" — đó là **3 nút có nhãn** đặt gần nhau, **không phải** 3 lối đi. Bản này bỏ hẳn cách nói "nhánh".)
2. Các chỗ mà **nhiều người phải đứng cùng lúc** (dãy nút, hai đầu bập bênh, nút trên sàn chở) xếp **theo thứ tự trái → phải**, mỗi chỗ cách chỗ kế ≤ 4 ô. Người thứ k đứng chỗ thứ k → không ai phải vượt qua ai.
3. Người "giữ nút" không bao giờ phải ở lại xa nhóm: dùng **dãy nút nối tiếp** (M10) — người giữ đi cùng nhóm.
4. Khi một người lên cao (vách 2 ô), người đó đi tiếp **kéo người dưới lên bằng dây**; vách cao 2 ô là chỗ "chồng người + kéo dây".
5. Đoạn nào có hố dài: nhóm phải qua **từng người một** gần nhau (≤ 4 ô), vì người đi đầu nhảy xa thì dây giật người sau.
6. Vật mang trên đầu (phiếu, chìa, mảnh chữ) đặt ở chỗ khó **trong tầm dây** của nhóm (≤ 4 ô tính từ chỗ người kế bên có thể đứng).

---

## 4. Co giãn theo số người `n` (2–5)

| Thứ | Quy tắc |
|-----|---------|
| Dãy nút "mỗi người một nút" | Đặt 5 nút; chỉ **n nút đầu (trái → phải)** hiện và được tính |
| Nút có nhãn cố định (vd 3 nút Lập pháp / Hành pháp / Tư pháp) | Luôn 3 nút; khi n = 2, **nút trái nhất đặt trên nền thường** để đẩy **khối số "1"** đè lên |
| Bục số | Số hiện trên bục = n (cả nhóm) hoặc `min(k, n)` khi ghi rõ |
| Khối số | Số = `min(k, n)` |
| Nút trên sàn chở | n nút (sàn rộng 6 ô, nút ở cột 0–4 của sàn) |
| Phiếu bầu | n phiếu: 5 vị trí, hiện **n vị trí đầu theo danh sách ưu tiên** (vị trí khó nhất xếp đầu, để nhóm 2 người vẫn gặp chỗ khó) |
| Mảnh chữ | Số mảnh cố định theo nội dung (3); ai cũng mang được, mỗi lần 1 mảnh |
| Bập bênh | Cân bằng theo số người hai bên; với n lẻ, người dư đứng ngay trục (không ảnh hưởng) |
| Hồi sinh | 5 chỗ ngay sau cột mốc (cột 1–5 của đoạn phải là nền phẳng an toàn) |

---

## 5. Danh sách cơ chế (M1–M17)

Mỗi cơ chế: **hành vi** · **thông số** · **cách vẽ** · **tương tác** · **trường hợp biên**.

### M1 — Nút đỏ
- **Hành vi:** đang bấm khi có **người** hoặc **khối số** đè lên tấm nút (0,9 × 0,4 ô ở đáy ô). Nhóm nút cùng tín hiệu: tín hiệu bật khi số nút đang bấm ≥ số cần.
- **Kiểu tín hiệu:** *giữ* (thả là tắt — dùng cho sàn nét đứt), *chốt* (đủ một lần là bật mãi — dùng cho cổng, cầu, bục chìa khóa).
- **Vẽ:** tấm đỏ cao 8 px; đang bấm lún còn 4 px, đỏ sẫm. Dưới nút đầu nhóm hiện `k/cần`; đủ thì `✓`.
- **Biên:** nút ẩn khi `n` nhỏ thì không vẽ, không tính.

### M2 — Sàn băng
- **Hành vi:** đứng trên ô băng thì lực bám = 0,12 × lực ép (thường là 5×): tăng tốc chậm, thả phím trượt ~2 ô. Nhảy bình thường.
- **Vẽ:** xanh nhạt, viền trên xanh đậm, vài vệt trắng.
- **Tương tác:** khối số trên băng bị đẩy thì **trượt tiếp** theo đà (giảm tốc 1 ô/s²) cho tới khi chạm vách/khối/đích.

### M3 — Vùng chậm
- **Hành vi:** tâm người trong vùng: chạy × 0,35, nhảy × 0,7 (cao ~0,8 ô → không qua nổi hố 2 ô). Gắn tín hiệu: tín hiệu bật thì vùng biến mất.
- **Vẽ:** lớp nâu mờ + nhãn.
- **Chỉ dùng ở level 5** ("Thủ tục phiền hà").

### M4 — Bục số "N"
- **Hành vi:** bục rộng 5–6 ô, nằm ngang mặt nền (đi lên được). Có **đủ N người đứng hẳn trên** (tâm cách mép > 0,2 ô; người chồng trên đầu cũng tính) thì nâng lên với tốc độ 2 ô/s tới độ cao định trước; **thiếu người là hạ xuống ngay** (không giữ ở đỉnh).
- **Vẽ:** tím; biển số trắng to (như ảnh 3) gắn trên bục, hiện `N`; khi đủ người số chuyển xanh.
- **Gameplay:** lên tới đỉnh, người đầu tiên bước sang nền cao làm bục **bắt đầu hạ** → những người còn lại phải nhảy sang thật nhanh (bục hạ 2 ô/s, nhảy 1,6 ô → còn ~0,5 giây).

### M5 — Sàn chở
- **Hành vi:** chạy theo lộ trình nhiều điểm (ngang, **chéo**, dọc), tốc độ 2,5 ô/s; dừng 3 giây ở các trạm. Khởi động khi đủ người đứng hẳn trên sàn liên tục 0,6 giây. Đi hết lộ trình thì đứng yên. Người đứng trên được chở theo (vận tốc nền).
- **Vẽ:** xanh ngọc; lộ trình vẽ **nét đứt mờ** (như ảnh 5) để người chơi thấy trước đường đi.

### M6 — Trần nguy hiểm
- **Hành vi:** vùng chết hình chữ nhật (chạm là thua). Hai kiểu: (a) **vạch ranh giới** dài, cao ngang 2 ô trên nền → nhảy từ nền vẫn an toàn, nhảy từ bậc/khối/đầu người thì chạm; (b) **trần hạ dần** theo bậc → cuối đoạn chỉ còn đi bộ được, không nhảy được.
- **Vẽ:** vạch đỏ nét đứt + dải đỏ mờ phía trên; nhãn "Ranh giới Hiến pháp & pháp luật" (như ảnh 4).

### M7 — Khối số
- **Hành vi:** khối 1×1 hoặc 2×2, hiện số `k` = số người cần cùng đẩy (nối đuôi, cùng bấm một hướng). Tốc độ 1,5 ô/s. **Có trọng lực:** đẩy ra khỏi mép thì **rơi** (rơi vào hố vừa khít thì thành **cầu**). **Đè được nút.** **Đứng lên được** (làm bậc). Trên băng thì trượt theo đà; trên băng chuyền thì bị cuốn.
- **Vẽ:** khung trắng viền cam, số to ở giữa (như ảnh 6).
- **Biên:** không đẩy xuyên vách/khối khác/cổng đang đóng; rơi xuống hố sâu (không vừa khít) thì **mất** và tự **về chỗ cũ sau 2 giây** (tránh kẹt level).

### M8 — Mang vật trên đầu (phiếu, chìa khóa, mảnh chữ)
- **Hành vi:** chạm vào vật khi **chưa mang gì** → nhặt; vật lơ lửng phía trên đầu người mang (cao 0,7 ô, nhấp nhô nhẹ). Mỗi người **tối đa 1 vật**. Chạm **nơi nhận** (hòm phiếu / khung chữ / cửa) → nộp. Người mang **thua** → vật **về chỗ cũ**. Mang vật **qua cột mốc** → khi hồi sinh, vật vẫn trên đầu người đó.
- **Nơi nhận:** *Hòm phiếu* (hiện `k/n`, đủ thì bật tín hiệu); *Khung chữ* (có các ô trống đúng số mảnh, mảnh nộp vào hiện chữ; đủ thì bật tín hiệu); *Cửa* (người mang chìa chạm cửa → cửa mở).
- **Vẽ:** phiếu = tờ giấy trắng có dấu ✓ đỏ; chìa = chìa vàng; mảnh chữ = thẻ trắng có chữ (vd "do dân"). Vật chưa nhặt nằm yên, có vầng sáng nhẹ.
- **Biên:** hai người chạm cùng lúc → người ô nhỏ hơn nhặt. Người đang mang không nhặt thêm.

### M9 — Nút trên sàn chở
- **Hành vi:** sàn chở có các nút gắn trên mặt (di chuyển cùng sàn). **Sàn chỉ chạy khi mọi nút trên sàn đều đang bấm**; một người bước khỏi nút (để né, để nhảy) → sàn **dừng tại chỗ**, đứng lại → chạy tiếp.
- **Gameplay:** trên lộ trình có khối đỏ / trần thấp bắt người ở một vị trí phải rời nút để né → cả sàn dừng → cả nhóm canh nhịp.

### M10 — Sàn nét đứt (dãy nút dẫn đường)
- **Hành vi:** cầu chia thành nhiều **đoạn cầu** 4 ô. Phía trên (cao hơn 3 ô) là **lối song song** có dãy nút, mỗi nút đứng ngay trên một đoạn cầu. Nút thứ i đang bấm → đoạn cầu i−1, i, i+1 hiện. Một người (người dẫn đường) đi trên lối trên, bước từ nút này sang nút kế; nhóm đi trên cầu **ngay dưới** người dẫn. Bước sai nhịp → đoạn cầu dưới chân biến mất.
- **Vì dây:** người dẫn luôn cách nhóm ~3 ô theo chiều đứng → dây không căng.
- **Vẽ:** đoạn cầu tắt = khung nét đứt; bật = tấm gỗ.

### M11 — Sàn sụp
- **Hành vi:** tấm 2 ô; có người đứng liên tục 0,8 giây → rung 0,3 giây → biến mất; 3 giây sau hiện lại (không hiện đè lên người).
- **Vẽ:** gạch nâu có vết nứt; rung khi sắp sụp.

### M12 — Chồng người lấy vật
- Không cần code mới (chồng người đã có). Quy ước đặt: vật trên bục **2 ô** (chồng 2 người) hoặc **3 ô** (khối 1 ô + chồng 2 người).

### M13 — Ghép mảnh chữ
- Dùng M8. Khung chữ có ô trống theo thứ tự; nộp mảnh nào hiện mảnh đó. Đủ mảnh → hiện cả câu (vd "của dân · do dân · vì dân") và bật tín hiệu (mở cổng).

### M14 — Khối đỏ di chuyển
- **Hành vi:** khối nguy hiểm (chạm là thua), hình chữ nhật hoặc **chữ L** (2 hình chữ nhật dính nhau), chạy qua lại giữa các điểm với tốc độ 2–4 ô/s, có thể dừng 0,5 giây ở đầu mút. Không va chạm vật lý (chỉ gây thua).
- **Vẽ:** đỏ, có mũi nhọn ở mặt hướng xuống (như ảnh 5).

### M15 — Băng chuyền
- **Hành vi:** nền có "vận tốc bề mặt" ±2 ô/s. Người đứng yên bị cuốn theo; chạy cùng chiều 7 ô/s, ngược chiều 3 ô/s. Khối số trên băng chuyền cũng bị cuốn. Người đang bay không bị ảnh hưởng.
- **Vẽ:** dải xám có mũi tên chạy (hoạt ảnh theo thời gian).
- **Gameplay:** người bị cuốn lùi kéo cả nhóm lùi bằng dây; nhảy gai trên băng chuyền ngược khó hơn vì đà chỉ còn 3 ô/s.

### M16 — Bập bênh
- **Hành vi:** tấm dài 7 ô, dày 0,4 ô, quay quanh trục giữa (trục gắn trên cột), góc tối đa ±25°. Nghiêng theo **mô-men**: người đứng xa trục làm nghiêng nhiều hơn. Có giảm chấn (không lắc mãi).
- **Trơn khi lệch:** |góc| ≤ 8°: bám bình thường; 8°–20°: bám như băng; > 20°: không bám, **trượt hẳn xuống** phía thấp (cộng lực m·g·sin(góc) theo mặt tấm).
- **Gameplay:** nhóm phải chia hai bên để giữ thăng bằng khi đi qua; một người nhảy khỏi tấm → tấm lệch đột ngột → người còn lại trượt. Bập bênh đôi: sang tấm 2 thì tấm 1 mất cân bằng.
- **Vẽ:** tấm gỗ trên cột tam giác; khi |góc| > 8° viền tấm chuyển xanh băng (báo trơn).

### M17 — Cột mốc
- Đầu mỗi đoạn. Có người qua → lưu: tín hiệu đã chốt, nút/khối/vật đã nộp. Thua → cả nhóm về cột mốc, giữ những gì đã lưu; vật đang mang (chưa nộp) về chỗ cũ, trừ vật đã mang qua cột mốc.
- **Vẽ:** cờ xám; đã tới thì xanh.

### Giữ nguyên từ trước
Gai (nửa dưới ô), hố, cổng (cao hết hàng 1–11), cửa cuối level, dây, chặn nhau (không đẩy nhau), người bị đè không nhảy.

---

## 6. Chữ trên màn hình

| Loại | Quy tắc |
|------|---------|
| Dòng chữ đoạn | Hiện **giữa mép trên canvas 4 giây** khi tới cột mốc, rồi thu nhỏ thành dòng mờ ở góc trên. ≤ 90 ký tự, có năm |
| Nhãn vật | ≤ 4 từ: "Hòm phiếu", "Cần đủ 3 nút", "Ranh giới Hiến pháp & pháp luật", "Lập pháp"… |
| Số | Trên bục số, khối số, hòm phiếu (`k/n`) |
| Không có | Khung đọc dài dưới canvas; chữ hướng dẫn cách chơi |
| Tên level | Góc trên phải: "1945–1946 · Nền móng" |
| Màn kết | Sau level 5 (mục 7.5) |

Ngôn ngữ: chỉ trích ý, có năm hoặc nguồn ngắn; không khẩu hiệu, không tính từ mạnh, không từ ngữ đối đầu.

---

## 7. Năm level

**Ký hiệu trong sơ đồ** (mỗi ký tự = 1 ô; chỉ vẽ hàng 6–15; hàng 12 là mặt nền thường):

| Ký hiệu | Nghĩa | Ký hiệu | Nghĩa |
|---|---|---|---|
| `#` | nền | `.` | trống |
| `X` | gai | `^` | vùng chết (trần) |
| `~` | băng | `<` `>` | băng chuyền (chiều trôi) |
| `=` | sàn sụp | `:` | đoạn cầu nét đứt |
| `o` | nút | `B` | khối số |
| `N` | bục số | `M` | sàn chở (`m` = nút trên sàn chở) |
| `H` | khối đỏ di chuyển (`→` lộ trình) | `w` | bập bênh, `|` trục |
| `P` | phiếu | `K` | chìa khóa |
| `T` | mảnh chữ | `U` | hòm phiếu / khung chữ |
| `g` | cổng | `D` | cửa |
| `C` | cột mốc | `S` | xuất phát |

Mỗi đoạn ghi: **Chữ** · **Sơ đồ** · **Cách qua (2 người / 5 người)** · **Dây** · **Độ khó**.

---

### 7.1 Level 1 — "1945–1946 · Nền móng"

Cơ chế chủ đạo: chồng người + kéo dây, băng chuyền, **phiếu bầu**, sàn sụp, bập bênh, cột có nút, dãy nút dẫn đường, chìa khóa.

#### Đoạn 1.1 — "1919 — 'Trăm điều phải có thần linh pháp quyền'."
```
     0         1         2         3
     0123456789012345678901234567890123
10   ........................##########
11   .S......####............##########
12   ##############..###..#############
13   ##############..###..#############
```
- **Cách qua:** bậc 1 ô (cột 8–11) → hố 2 ô (14–15) → hố 2 ô (19–20) → **vách 2 ô** (cột 24). Một người đứng sát vách làm đế, người khác nhảy lên đầu rồi lên vách; người ở trên đi tiếp → dây kéo người dưới lên vách.
- **5 người:** người lên trước kéo người kế, hai người trên cùng kéo người thứ ba… (mỗi lượt 1 kéo 1).
- **Dây:** hố cách nhau 3 ô → nhóm phải nhảy từng người, không chạy dồn.
- **Độ khó:** dễ — làm quen.

#### Đoạn 1.2 — "02/9/1945 — Tuyên ngôn Độc lập."
```
     0         1         2         3
     0123456789012345678901234567890123456
10   ##########..........................
11   ##########..X.......X.....X.........  (nền cao bên trái: từ đoạn 1.1, nhảy xuống)
12   ######<<<<<<<<<<<<<<<<<<<<<<<<<######
```
- **Cách qua:** đứng trên băng chuyền **trôi ngược** (2 ô/s) phải chạy liên tục; nhảy 3 gai đơn khi chỉ còn đà 3 ô/s (xa ~1,8 ô → vừa đủ, phải nhảy sát gai).
- **Dây:** ai dừng lại bị cuốn lùi vào gai phía sau, kéo người trước lùi theo → cả nhóm phải đi đều.
- **Độ khó:** trung bình.

#### Đoạn 1.3 — "06/01/1946 — Tổng tuyển cử bầu Quốc hội đầu tiên."
```
     0         1         2         3         4
     01234567890123456789012345678901234567890
 7   .......................................P.   (P5: treo trên hố, nhảy từ gờ cột 37)
 9   .....P.........................P.........   (P1 trên bục 2 ô · P4 trên bục 2 ô sau khối đỏ)
10   ....###..................H→→→→→###......   (H quét ngang hàng 10–11 giữa cột 21–31)
11   .C..###.......P.......P..H.......###.##..
12   #########..##..##########...######.##....
13   #########..##..##########...######.##....
```
- **Phiếu** (theo thứ tự ưu tiên — n phiếu đầu hiện): **P1** trên bục 2 ô (cột 5, chồng người); **P2** trên đảo 2 ô giữa hai hố 2 ô (cột 13–14); **P3** giữa đường quét của khối đỏ (cột 22) — canh lúc khối đỏ đi xa thì lao vào lấy rồi chạy ra; **P4** trên bục 2 ô ngay cuối đường quét (chồng người khi khối đỏ đang ở xa); **P5** treo trên hố cột 39 — nhảy từ gờ, lấy giữa không trung rồi đáp sang bờ bên kia.
- **2 người:** chỉ P1, P2 (chồng người + nhảy đảo). **5 người:** đủ 5 kiểu.
- **Dây:** các phiếu cách nhau ≤ 8 ô → chuỗi 5 người (dài tối đa 16 ô) trải ra được; người lấy P5 cần người kế đứng ở gờ cột 37.
- **Độ khó:** trung bình–khó.

#### Đoạn 1.4 — "'Hễ là công dân thì đều có quyền đi bầu cử.'"
```
     0         1         2         3
     0123456789012345678901234567890123
10   ..............................U.g.   (U = hòm phiếu, hiện k/n; g = cổng)
11   .C............................U.g.
12   #####==..==..==..==..==..########g#
13   #####.......................#######
```
- **Cách qua:** mang phiếu (đang lơ lửng trên đầu) qua 5 tấm **sàn sụp** 2 ô cách nhau 2 ô. Mỗi tấm chỉ đứng được 0,8 giây → không ai được dừng; người sau phải chờ tấm hồi (3 giây). Chạm hòm phiếu → nộp. Đủ n phiếu → cổng mở.
- **Dây:** người đi trước đã qua nhưng người sau chờ tấm hồi → dây kéo người trước lùi về mép hố; phải đứng sát mép chờ.
- **Thua:** rơi → cả nhóm về cột mốc, **phiếu đang mang vẫn trên đầu** (đã mang qua cột mốc), phiếu đã nộp giữ nguyên.
- **Độ khó:** khó.

#### Đoạn 1.5 — (không chữ; tiếp nối)
```
     0         1         2         3
     0123456789012345678901234567890123
11   .C................................
12   #####...wwwwwww..wwwwwww..########
13   #####......|.........|....########
14   #####......|.........|....########
```
- **Cách qua:** hai **bập bênh** 7 ô liên tiếp trên hố, khe 2 ô giữa các tấm. Bước lên đầu trái → tấm nghiêng trái (trơn, trượt về hố). Nhóm phải dàn hai bên trục rồi dịch dần sang phải; sang tấm 2 thì tấm 1 lệch.
- **2 người:** mỗi người một bên trục, cùng dịch sang phải từng bước; người phải nhảy sang tấm 2 trước, người trái theo sau thật nhanh trước khi tấm 1 lệch hẳn.
- **5 người:** 2–3 người làm "đối trọng" đứng phía phải trong khi những người còn lại lên; dây giữ người trượt.
- **Độ khó:** khó.

#### Đoạn 1.6 — "11/1946 — Hiến pháp đầu tiên."
(như ảnh 1)
```
     0         1         2         3
     0123456789012345678901234567890123456
 9   ................................K...    (K trên bục 2 ô, cột 32)
10   ...............................###..
11   .C.......oo..oo..oo..oo..oo....###..
12   #######..##..##..##..##..##::::#####   (:::: = cầu vàng hiện khi đủ nút, chốt)
13   #######..##..##..##..##..##..........
```
- **Cách qua:** 5 cột 2 ô giữa hố (khe 2 ô), mỗi cột 1 nút (n nút đầu hiện). Mỗi người nhảy lên một cột **khác nhau** và đứng yên → đủ nút → **cầu vàng** hiện (chốt) nối cột cuối với bờ. Sang bờ, **chồng người** lấy **chìa "Hiến pháp 1946"** trên bục 2 ô.
- **Dây:** cột cách nhau 4 ô → mỗi người một cột, dây vừa căng — người đứng nhầm cột phải nhảy ngược lại.
- **Độ khó:** trung bình.

#### Đoạn 1.7 — (không chữ)
```
     0         1         2         3
     0123456789012345678901234567890123
 8   ..##o###o###o###o###o###o####.....   (lối trên: dãy nút dẫn đường, cao hơn cầu 3 ô)
 9   ..#.......................#.......
10   .##.......................#.......
11   .C#.......................#.......
12   ###::::::::::::::::::::::::####### (6 đoạn cầu 4 ô; nút i bật đoạn i−1, i, i+1)
13   ###..........X..........X.........
```
- **Cách qua:** một người (người dẫn) leo bậc lên **lối trên** (hàng 8), đi từ nút này sang nút kế; cả nhóm (có người mang chìa) đi trên cầu nét đứt **ngay dưới** người dẫn. Người dẫn bước quá nhanh/chậm → đoạn cầu dưới chân nhóm tắt → rơi xuống gai.
- **2 người:** 1 dẫn, 1 mang chìa đi dưới. **5 người:** 1 dẫn, 4 người dưới phải dồn trong 3 đoạn cầu (12 ô).
- **Dây:** người dẫn luôn cách người kế ~3 ô theo chiều đứng.
- **Độ khó:** khó (phối hợp nhịp).

#### Đoạn 1.8 — (cửa)
```
11   .C.....X......####...DDDDD.
12   ##############################
```
- Gai + bậc → **người mang chìa chạm cửa** → cửa mở → cả nhóm vào cửa → qua level.

---

### 7.2 Level 2 — "1976–1986 · Thống nhất và Đổi mới"

Cơ chế chủ đạo: bục số, băng, bập bênh trên băng, băng chuyền xuôi + sàn sụp, **nút trên sàn chở đi chéo** + khối đỏ chữ L, **mảnh chữ** + khối số làm bậc, trần hạ dần.

#### Đoạn 2.1 — "1976 — Nước Cộng hòa xã hội chủ nghĩa Việt Nam."
```
     0         1         2         3
     0123456789012345678901234567890123456
 8   ................~~~~~~~..~~~~~~~~~~~   (gờ băng ở độ cao 9, khe 2 ô)
 9   ................#######..###########
10   ................#######..###########
11   .C..............#######..###########
12   #########NNNNNN#########XX###########   (N = bục số "n", nâng 3 ô; XX = gai đáy khe)
```
- **Cách qua:** cả nhóm đứng lên **bục số** → nâng 3 ô ngang gờ. Người đầu tiên bước sang gờ → bục **hạ ngay** → mọi người phải nhảy sang gần như cùng lúc. Gờ trên là **băng**, có khe 2 ô — chạy đà trên băng để nhảy.
- **Dây:** người chậm bị kẹt trên bục đang hạ được dây kéo lên gờ (1 kéo 1) — nhưng người kéo đang đứng trên băng, dễ bị trượt theo.
- **Độ khó:** trung bình–khó.

#### Đoạn 2.2 — "Trước 1986, việc gắn dân chủ với pháp luật chưa được đặt ra cụ thể." (giáo trình)
```
     0         1         2         3         4
     01234567890123456789012345678901234567890
11   .C...........X..........X......X.........
12   #####~~~~~~..~~~~~~~~~~..~~~~~~~~~..~~###
13   #####......##.........##........##..#####
```
- **Cách qua:** cánh đồng **băng** xen hố 2 ô và gai đơn **ngay sau mép hố** — phải lấy đà vừa đủ: chậm thì rơi hố, nhanh thì trượt vào gai.
- **Dây:** người trượt quá đà kéo người khác theo.
- **Độ khó:** khó.

#### Đoạn 2.3 — (không chữ)
```
     0         1         2         3
     0123456789012345678901234567890123
11   .C................................
12   ####~~~..wwwwwww...wwwwwww..~~~###
13   ####.......|.........|.......#####
```
- **Cách qua:** **bập bênh** đặt giữa hai bờ **băng** — vào bập bênh bằng đà trượt; tấm lệch > 8° thì cũng trơn như băng. Phải dừng đúng chỗ trên tấm.
- **Độ khó:** khó.

#### Đoạn 2.4 — (không chữ)
```
     0         1         2         3
     0123456789012345678901234567890123
11   .C............X.....................
12   #####>>>>>>>>>##..==..==..==..######
13   #####>>>>>>>>>##....................
```
- **Cách qua:** **băng chuyền trôi xuôi** (7 ô/s nếu chạy) đẩy thẳng vào gai cột 14 → phải nhảy đúng lúc (nhảy sớm/muộn đều trúng gai); sau đó là **sàn sụp**: đà quá lớn dễ nhảy quá tấm.
- **Độ khó:** trung bình–khó.

#### Đoạn 2.5 — "12/1986 — Đại hội VI: 'lấy dân làm gốc'."
(như ảnh 2 + 5)
```
     0         1         2         3         4
     01234567890123456789012345678901234567890
 5   ......................HHHH..............   (khối đỏ chữ L lên xuống ở cột 22–25)
 6   ......................H.................
 8   ..................................#######  (bờ cao: điểm cuối sàn chở)
11   .C.....................................
12   #####mmmmm.M - - - - - - - - - - - - - -     (sàn chở 6 ô, n nút "m"; lộ trình chéo lên 4 ô rồi ngang)
13   #####.......................................  (hố sâu)
```
- **Cách qua:** mỗi người đứng một nút trên **sàn chở**; sàn chỉ chạy khi **mọi nút** đều có người. Lộ trình chéo lên đi ngang qua **khối đỏ chữ L** lên xuống: người đứng ở nút phía trước phải **rời nút lùi lại** khi khối đỏ hạ xuống → sàn dừng → khối đỏ nhấc lên → đứng lại nút → sàn chạy. Canh nhịp để không ai bị khối đỏ chạm.
- **2 người:** 2 nút. **5 người:** 5 nút, ai đứng phía trước phải phản ứng.
- **Độ khó:** khó.

#### Đoạn 2.6 — "Dân chủ: bản chất, mục tiêu, động lực." (giáo trình)
```
     0         1         2         3         4
     01234567890123456789012345678901234567890
 8   ...........T...................T.........   (T2 trên bục 3 ô)
 9   .........###.................####........
10   ....T....###...........B.....####........   (T1 trên bục 2 ô; B = khối số "1")
11   .C..###..###.................####...<<<T.  (T3 cuối băng chuyền ngược)
12   ########################################
```
- **3 mảnh chữ** "bản chất" · "mục tiêu" · "động lực": **T1** bục 2 ô (chồng người); **T2** bục 3 ô → **đẩy khối "1"** sát chân bục, đứng lên khối rồi chồng người; **T3** cuối dải **băng chuyền ngược** — lấy xong bị cuốn về.
- Mỗi người mang tối đa 1 mảnh → với 2 người phải đi 2 lượt (một người mang về khung ở đoạn 2.7 rồi quay lại? — **không**: khung chữ đặt ở **cuối đoạn này**, cột 39; mỗi người mang 1 mảnh tới khung, quay lại lấy mảnh còn lại).
- **Độ khó:** trung bình.

#### Đoạn 2.7 — (không chữ)
```
     0         1         2         3
     0123456789012345678901234567890123
 7   ......^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 8   ......^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 9   ...............^^^^^^^^^^^^^^^^^^^
10   ..........................^^^^^^^^
11   .C........X..........=====........
12   ######################.....#######
```
- **Cách qua:** **trần hạ dần** theo 3 bậc: đầu đoạn còn nhảy được (qua gai cột 10), giữa đoạn chỉ nhảy thấp được, cuối đoạn **không được nhảy** — nhưng có **sàn sụp** dài phải đi qua liên tục, không được dừng.
- **Độ khó:** khó.

#### Đoạn 2.8 — (cửa)
- Bậc 1 ô + gai + cửa (cửa chỉ mở khi khung chữ đoạn 2.6 đã đủ — tín hiệu chốt).

---

### 7.3 Level 3 — "1991–1995 · Hình thành khái niệm"

Cơ chế chủ đạo: khối đỏ quét hành lang + hầm trú, **khối số rơi lấp hố làm cầu** + làm bậc, **bập bênh đôi**, mảnh chữ qua dãy nút dẫn đường / bục số / băng chuyền, **sàn chở có nút dưới vạch ranh giới**.

#### Đoạn 3.1 — "06/1991 — Cương lĩnh: Nhà nước quản lý xã hội bằng pháp luật."
```
     0         1         2         3         4
     01234567890123456789012345678901234567890
 9   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   (trần thấp suốt hành lang)
11   .C...H→→→→→→→→→→→→→→→→→→→→→→→→→→→→←H......  (khối đỏ cao 1 ô quét qua lại hàng 11)
12   #####...######...######...######...######
13   #####...######...######...######...######   ("hầm" sâu 1 ô, rộng 3 ô để trú)
```
- **Cách qua:** khối đỏ quét sát nền qua lại; cả nhóm **chui xuống hầm** (sâu 1 ô) khi khối đỏ đi qua phía trên, rồi chạy sang hầm kế. Trần thấp → không được nhảy cao.
- **5 người:** mỗi hầm 3 ô chứa tối đa 3 người → nhóm 5 người phải tách 2 hầm liền nhau (cách 3 ô — trong tầm dây).
- **Độ khó:** trung bình–khó (canh nhịp cả nhóm).

#### Đoạn 3.2 — "29/11/1991 — Lần đầu nêu khái niệm 'Nhà nước pháp quyền xã hội chủ nghĩa'."
(như ảnh 6)
```
     0         1         2         3
     0123456789012345678901234567890123
 9   ..........................########
10   ..........................########
11   .C...BB.............B.....########   (BB = khối "2" → min(2,n); B = khối "1")
12   ###########..##############.######   (hố 2 ô sâu 1 ô ở cột 11–12)
13   #############################.####
```
- **Cách qua:** đẩy **khối "2"** (2 người cùng đẩy) rơi vào **hố sâu 1 ô** → lấp thành cầu. Tiếp theo đẩy **khối "1"** sát vách 3 ô → đứng lên khối + chồng người → lên đỉnh, kéo dây người còn lại.
- **Sai lầm có thể:** đẩy khối "1" vào hố trước → khối "2" không còn chỗ lấp → khối rơi sai chỗ **tự về vị trí cũ sau 2 giây** (M7 biên).
- **Độ khó:** trung bình (suy luận nhẹ + phối hợp).

#### Đoạn 3.3 — "1992 — Hiến pháp: Điều 4 và Điều 12."
```
     0         1         2         3         4
     01234567890123456789012345678901234567890
11   .C.......................................
12   ####..wwwwwww..wwwwwww..wwwwwww..########
13   ####.....|.........|.........|...########
14   ####XXXXXXXXXXXXXXXXXXXXXXXXXXXXX########   (đáy hố toàn gai)
```
- **Cách qua:** **3 bập bênh** nối tiếp, khe 2 ô, đáy gai. Đây là đoạn bập bênh khó nhất trước level 5.
- **Độ khó:** khó.

#### Đoạn 3.4 — "01/1994 — 'Nhà nước pháp quyền thực sự của dân, do dân và vì dân'."
```
     0         1         2         3         4         5
     012345678901234567890123456789012345678901234567890
 7   ......T.....................T....................
 8   ..##o###o###o###o##.......NNNNN..........<<<<<T..
 9   ..#...............#.......................#######
11   .C#...............#..................U...........  (U = khung chữ 3 ô trống)
12   ###:::::::::::::::########################.......
```
- **3 mảnh chữ** "của dân" · "do dân" · "vì dân": **T1** phía trên lối dãy nút dẫn đường (người dẫn nhảy lấy giữa chừng); **T2** treo trên **bục số** (đứng đủ người → bục nâng → người cao nhất với lấy); **T3** cuối **băng chuyền ngược** trên gờ cao.
- **Khung chữ** U ở giữa đoạn: mang từng mảnh về.
- **Độ khó:** trung bình–khó.

#### Đoạn 3.5 — (không chữ)
```
11   .C....X.......X.........X.....
12   #######==..==....==..==..#####
```
- Đoạn ngắn dồn ép: **sàn sụp** xen gai; nhóm phải đi liền mạch.

#### Đoạn 3.6 — "01/1995 — Quan điểm được trình bày đầy đủ hơn."
```
 7   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   (vạch ranh giới)
 9   ............HH............HH..............  (2 khối đỏ lên xuống)
12   #####mmmmm.M - - - - - (chéo xuống rồi ngang) - - - ####
```
- **Sàn chở có nút** đi dưới **vạch ranh giới**: không ai được nhảy (chạm vạch); khi khối đỏ hạ xuống, người ở vị trí đó phải **bước khỏi nút** sang chỗ trống trên sàn → sàn dừng → khối đỏ lên → quay về nút.
- **Độ khó:** khó.

#### Đoạn 3.7 — (không chữ)
```
 9   ................K......
10   ...............###.....
11   .C.......###...###.....
12   ######..#####XX###..###   (cột chìa cao 2 ô giữa hai hố có gai)
```
- **Chìa khóa** trên cột 2 ô đứng giữa hai hố đáy gai → chồng người trên cột thấp bên cạnh, nhảy chéo sang.

#### Đoạn 3.8 — (cửa)
- Mang chìa qua 2 gai + bậc → cửa.

---

### 7.4 Level 4 — "2001–2022 · Hiến định và hoàn thiện"

Cơ chế chủ đạo: sàn sụp dài, **3 nút có nhãn + khối đè nút**, **vạch ranh giới + bập bênh nâng người sát vạch**, trần thấp + băng chuyền + sàn sụp, dãy nút dẫn đường + bục số, **khối nặng trên băng** + khối đỏ, sàn chở có nút + chữ L, chìa khóa cao.

#### Đoạn 4.1 — "12/2001 — Hiến định thuật ngữ 'Nhà nước pháp quyền xã hội chủ nghĩa'."
```
11   .C......................................
12   ####==.==.==.==.==.==.==.==.==.==.==.###   (11 tấm sụp 2 ô, khe 1 ô)
13   ####XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX###
```
- Đi liên tục, không ai được dừng quá 0,8 giây; người đi sau phải bám nhịp người trước (tấm vừa sụp sau lưng).

#### Đoạn 4.2 — "2011 — Quyền lực thống nhất, có phân công, phối hợp, kiểm soát."
(như ảnh 4: cổng "Cần đủ 3 nút")
```
     0         1         2         3
     0123456789012345678901234567890123
 7   ......Lập.Hành.Tư.......g.........
11   .C.B..o...o...o.........g.........   (B = khối "1")
12   ########..##..####..XX..g#########
     (nút "Lập pháp" cột 6 trên nền; "Hành pháp" cột 10 trên đảo 2 ô; "Tư pháp" cột 14 trên đảo; sau đó hố có gai trước cổng)
```
- **Cách qua:** 3 nút cùng lúc → cổng "Cần đủ 3 nút" mở (chốt). Nút cách nhau **4 ô** → người liền kề đứng nút liền kề, dây không vướng.
- **2 người:** đẩy **khối "1"** lên nút "Lập pháp" (nút trên nền thường); hai người nhảy lên 2 đảo.
- **≥ 3 người:** đứng cả 3 nút (khối thừa).
- **Độ khó:** trung bình.

#### Đoạn 4.3 — "2013 — Hiến pháp, Điều 4: hoạt động trong khuôn khổ Hiến pháp và pháp luật."
(như ảnh 4)
```
 8   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   "Ranh giới Hiến pháp & pháp luật"
11   .C...........................................
12   #####..wwwwwww..wwwwwww..##################
13   #####....|.........|.....##################
```
- **Vạch ranh giới** thấp chạy suốt đoạn. **Bập bênh**: bên nặng hạ xuống thì đầu kia **nâng người lên sát vạch** — đứng trên đầu đang nâng mà nhảy là chạm vạch. Phải giữ bập bênh gần cân bằng khi đi qua.
- **Độ khó:** khó.

#### Đoạn 4.4 — (không chữ)
```
10   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
11   .C..........................
12   ####<<<<<<<<==<<<<==<<<<<###
```
- **Trần thấp** (không nhảy được) + **băng chuyền ngược** + **sàn sụp** chen giữa: không được dừng (bị cuốn lùi), không được nhảy.

#### Đoạn 4.5 — "Hiến pháp 2013, Điều 2 và Điều 8."
```
 6   ..........NNNNN....................
 8   ..##o###o###o##......##o###o###o###
12   ###::::::::::::#####..##:::::::::::##
```
- Hai cụm **dãy nút dẫn đường** nối bằng **bục số** ở giữa: người dẫn ở cụm 1 phải xuống, cả nhóm lên bục số, rồi đổi người dẫn ở cụm 2.

#### Đoạn 4.6 — "Kiểm soát quyền lực: không có vùng cấm."
```
 9   ..........H→→→→→→→→→→→→→H.........
11   .C...BB.......................UU...   (BB = khối "n"; UU = ô đích)
12   #####~~~~~~~~~~~~~~~~~~~~~~~~~~####
```
- **Khối nặng "n"** (cả nhóm cùng đẩy) đặt trên **băng**: đẩy là trượt theo đà → phải dừng đẩy đúng lúc để khối trượt vừa vào **ô đích**; quá đà khối đập vách (vẫn kéo lại được bằng cách đẩy ngược). **Khối đỏ** quét ngang ở độ cao đầu người → khi khối đỏ đi qua, ai đang chồng/nhảy là chạm.
- Khối vào đích → cổng mở.
- **Độ khó:** khó.

#### Đoạn 4.7 — "2021 — Đại hội XIII · 09/11/2022 — Nghị quyết 27-NQ/TW."
- **Sàn chở có nút** đi lộ trình gấp khúc (ngang → chéo lên → ngang) qua **khối đỏ chữ L** + một **trạm dừng 3 giây** trên đảo có gai 2 bên: lúc dừng, khối đỏ quét ngang qua trạm → cả nhóm phải nhảy lên rồi đáp lại (nhảy từ nền sàn an toàn).

#### Đoạn 4.8 — (cửa)
- **Chìa khóa** trên bục 3 ô → khối "1" làm bậc + chồng người; mang chìa qua gai tới cửa.

---

### 7.5 Level 5 — "Câu trả lời"

Tên hiện trên màn: **"Vai trò lãnh đạo của Đảng có mâu thuẫn với nguyên tắc pháp quyền?"**. 6 đoạn khó nhất, mỗi đoạn kết hợp ≥ 3 cơ chế, mỗi dòng chữ là một ý của câu trả lời.

| Đoạn | Chữ | Thiết kế |
|------|-----|----------|
| 5.1 | "Quyền lãnh đạo được Hiến pháp ghi nhận (Điều 4)." | **Bục số** nâng lên gờ **băng** có **sàn sụp**; khe gờ có gai |
| 5.2 | "…kèm nghĩa vụ hoạt động trong khuôn khổ Hiến pháp và pháp luật." | **Vạch ranh giới** + **bập bênh đặt trên băng chuyền** (tấm vẫn ở yên, nhưng hai bờ là băng chuyền ngược) |
| 5.3 | "Quyền lực được phân công, phối hợp, kiểm soát." | **3 nút** (khối đè khi thiếu người) + **dãy nút dẫn đường** + **khối đỏ** quét dưới cầu |
| 5.4 | "Thủ tục hành chính gây phiền hà phải được bãi bỏ." (giáo trình) | **Vùng chậm** "Thủ tục phiền hà" phủ một hố 2 ô (trong vùng chậm không nhảy qua được). Đẩy **khối "bãi bỏ"** trên **băng chuyền** (khối tự trôi, phải chặn/đẩy đúng lúc) vào ô đích → vùng chậm biến mất |
| 5.5 | "Vẫn phải tiếp tục hoàn thiện cơ chế kiểm soát quyền lực (Nghị quyết 27-NQ/TW)." | **Sàn chở có nút** đi chéo dưới **trần hạ dần** + **2 khối đỏ chữ L** + trạm dừng |
| 5.6 | — | **Chìa khóa "Câu trả lời"** trên bục 3 ô (khối + chồng người) → mang qua **sàn sụp** + **bập bênh** tới cửa |

**Màn kết** (sau cửa level 5, HTML phủ lên canvas):
- Dòng lớn: **"Không mâu thuẫn"** (theo quan điểm chính thức trong bài).
- 3 ý:
  1. Sự lãnh đạo của Đảng được Hiến pháp ghi nhận, kèm nghĩa vụ hoạt động trong khuôn khổ Hiến pháp và pháp luật.
  2. Nguyên tắc pháp quyền giúp sự lãnh đạo không lạm quyền, không làm thay Nhà nước.
  3. Còn phải tiếp tục hoàn thiện cơ chế kiểm soát quyền lực (Nghị quyết 27-NQ/TW).
- Thời gian từng level của nhóm (đã có từ server) + nút "Chơi lại".

---

## 8. Ma trận cơ chế theo level (kiểm tra "kết hợp, không lặp")

| Cơ chế | L1 | L2 | L3 | L4 | L5 |
|--------|----|----|----|----|----|
| M1 nút / cột có nút | 1.6 | | | 4.2 | 5.3 |
| M2 băng | | 2.1 2.2 2.3 | | 4.6 | 5.1 |
| M3 vùng chậm | | | | | 5.4 |
| M4 bục số | | 2.1 | 3.4 | 4.5 | 5.1 |
| M5/M9 sàn chở (có nút) | | 2.5 | 3.6 | 4.7 | 5.5 |
| M6 trần nguy hiểm | | 2.7 | 3.1 3.6 | 4.3 4.4 | 5.2 5.5 |
| M7 khối số | | 2.6 | 3.2 | 4.2 4.6 4.8 | 5.3 5.4 5.6 |
| M8 phiếu / chìa / mảnh | 1.3 1.4 1.6 1.8 | 2.6 | 3.4 3.7 | 4.8 | 5.6 |
| M10 dãy nút dẫn đường | 1.7 | | 3.4 | 4.5 | 5.3 |
| M11 sàn sụp | 1.4 | 2.4 2.7 | 3.5 | 4.1 4.4 | 5.1 5.6 |
| M12 chồng người | 1.1 1.3 1.6 | 2.6 | 3.2 3.7 | 4.8 | 5.6 |
| M14 khối đỏ | 1.3 | 2.5 | 3.1 3.6 | 4.6 4.7 | 5.3 5.5 |
| M15 băng chuyền | 1.2 | 2.4 2.6 | 3.4 | 4.4 | 5.2 5.4 |
| M16 bập bênh | 1.5 | 2.3 | 3.3 | 4.3 | 5.2 5.6 |

Không có hai đoạn liền nhau dùng **cùng cặp cơ chế chính**.

---

## 9. Thay đổi kỹ thuật (để lập plan)

| Phần | Thay đổi |
|------|----------|
| `level.ts` | Thêm kiểu vật: `conveyor` (tốc độ ±), `crumble`, `hazardMover` (lộ trình, hình chữ nhật / chữ L), `seesaw` (tâm trục, độ dài), `carry` (loại: phiếu/chìa/mảnh, chữ), `receiver` (hòm phiếu / khung chữ / cửa), `numberLift` (thang không chốt, hiện số), `box` có `fall`; `mover` có `pads` gắn trên sàn; `bridge` có `sigAny` (bật khi một trong các tín hiệu bật — cho dãy nút dẫn đường) |
| `engine.ts` | Băng chuyền (cộng vận tốc nền); sàn sụp (bộ đếm thời gian / hồi); khối đỏ (kinematic cảm biến + gây thua); bập bênh (thân động + khớp quay `RevoluteJoint`, giới hạn ±25°, giảm chấn; bám theo góc + lực trượt); mang vật (`carriedBy`, nộp, về chỗ cũ khi thua, giữ qua cột mốc); khối số có trọng lực, rơi vào hố, tự về chỗ cũ sau 2 giây nếu rơi sâu, đè nút, bị băng chuyền cuốn, trượt trên băng; sàn chở chỉ chạy khi mọi nút trên sàn bấm |
| `objects.ts` + codec | Thêm trạng thái: vật đang mang (ai mang), hòm/khung đã nhận bao nhiêu, góc bập bênh, vị trí khối đỏ, tấm sụp đang ẩn |
| `renderer.ts` | Vẽ toàn bộ M1–M17 theo mục 5; lộ trình sàn chở nét đứt; vật trên đầu; dòng chữ đoạn ở mép trên |
| `story.ts` | Thay toàn bộ: mỗi đoạn 1 dòng; nhãn ≤ 4 từ; màn kết |
| `StoryPanel` | Bỏ khung đọc dài; thay bằng dòng chữ trên canvas + màn kết HTML |
| `levelData` + script sinh | Vẽ lại 5 level theo sơ đồ mục 7 (sơ đồ ở đây là phác thảo — khi vẽ thật chỉnh khoảng cách theo mục 2–3) |
| Test | Test ngắn cho từng cơ chế mới; chơi tay `?n=2`, `?n=5` |

---

## 10. Rủi ro và cách xử lý

| Rủi ro | Xử lý |
|--------|-------|
| Bập bênh + dây gây rung, giật | Giảm chấn góc; dây đã có trần lực căng; thử tay nhiều với n = 5 |
| Khối số rơi kẹt chỗ không lấy lại được | Rơi sâu hơn 1 ô → tự về chỗ cũ sau 2 giây |
| Nhóm 2 người không qua được chỗ cần nhiều người | Mục 4: nút thừa ẩn hoặc đè bằng khối; chỗ cao nhất cần 2 người |
| Sàn sụp + người chờ phía sau → dây kéo người trước rơi | Tấm hồi nhanh (3 giây); bờ chờ đủ rộng |
| Độ khó quá cao, mất quá 30 phút | Mỗi đoạn có cột mốc; nếu chơi thử quá lâu: giảm số tấm sụp / bập bênh ở L3–L5 |
| Hai người cùng chạm một vật | Người ô nhỏ hơn nhặt |

---

## 11. Quyết định cuối

- Level 5 **chỉ trả lời câu hỏi**, không nhắc các ý phản biện.

## 12. Điều chỉnh khi làm code (docs `mlngame/docs/level-phap-quyen/` là bản đúng)

| Mục | Thay đổi | Lý do |
|-----|----------|-------|
| M16 bập bênh | Thêm **lò xo ở trục**: 1 người đứng mép chỉ nghiêng ≈ 12°; ngưỡng trơn 14°, trượt hẳn 20° | Không có lò xo thì 1 người bước lên đầu tấm là nghiêng tối đa và trượt xuống hố ngay → không qua được. Nay: đi lần lượt thì qua, dồn ≥ 2 người một bên thì trượt |
| M7 khối số | Rơi thẳng xuống khi hết chỗ đỡ; rơi sâu > 2,5 ô mới về chỗ cũ; vào ô đích phải **dừng hẳn** | Khối lấp hố sâu 2 ô (đoạn 3.2); đoạn đẩy khối trên băng (4.6, 5.4) cần canh lúc thả |
| Tín hiệu `*TÊN` | Dùng chung cả level (phiếu nhặt ở đoạn 1.3, nộp ở 1.4) | |
| Chỗ hồi sinh | Cột 1–5 sau cột mốc luôn là nền trống; script sinh level tự kiểm | 5 người hồi sinh không rơi xuống hố |
| Sàn chở dừng trạm | 4 giây | |
| Phòng | Bắt đầu được khi ≥ 2 người | Q2 |
