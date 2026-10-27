# Thiết kế web + 5 level — "Hành trình Pháp quyền" (bản 3)

- Ngày: 2026-10-27 · Trạng thái: **ý tưởng, chờ nhóm duyệt** (chưa code)
- Thay đổi so với bản 2: **bỏ cách nói "ẩn dụ"**; mỗi cơ chế là **một hoạt động có thật trong nội dung** (bỏ phiếu, biểu quyết, thể chế hóa, phân công–phối hợp–kiểm soát…); **ngôn ngữ trung tính, dễ hiểu**; level dài hơn (8 đoạn/level), dùng thêm nội dung giáo trình chưa khai thác.
- Nguồn nội dung:
  - Dàn bài thuyết trình (`.docx`): 6 phần — I khái quát lý luận và hiến định; II bốn lý do; III dấu mốc 1945–2022; IV bảng đối chiếu; V ý kiến phản biện; VI kết luận.
  - Giáo trình (`docs/thuyettrinh.txt`, gọi tắt **GT**): **Chương 4** (Dân chủ XHCN và Nhà nước XHCN — nguồn chính), **Chương 2** (Sứ mệnh lịch sử của giai cấp công nhân — dùng cho phần "vì sao có Đảng lãnh đạo"), đầu Chương 5 (chưa dùng). Dẫn nguồn bằng số dòng của file, ví dụ `GT:1805`.

---

## 1. Mục tiêu

| # | Mục tiêu | Nghĩa là |
|---|----------|----------|
| M1 | **Không giải đố** | Đường đi luôn nhìn thấy; chỗ khó là phối hợp nhiều người (dây, chồng người, cùng đứng, cùng đẩy) |
| M2 | **Đi đúng dàn bài** | 5 level = 5 phần chính của bài thuyết trình; người chơi đi hết là đã đi qua toàn bộ lập luận |
| M3 | **Cơ chế = nội dung** | Mỗi cơ chế mô phỏng một việc có thật trong bài (mục 3). Không dùng hình ảnh tượng trưng |
| M4 | **Nhóm 3–5 người** | Số liệu tự tính theo số người `n` (mục 5) |
| M5 | **~30 phút** | 5 level × ~6 phút × 8 đoạn |
| M6 | **Trung thực, trung tính** | Chữ trong game là nội dung của bài/giáo trình/Hiến pháp, ghi rõ nguồn. Phần phản biện được trình bày đủ hai phía như Phần V của bài |

## 2. Quy tắc ngôn ngữ (áp dụng cho mọi chữ hiển thị trong game)

1. Câu ngắn, từ phổ thông. Mỗi khung chữ chỉ có **một ý**.
2. Mở đầu bằng nguồn: "Theo Hiến pháp 2013, Điều 4…", "Theo giáo trình…", "Theo Nghị quyết 27-NQ/TW…". Không tự đưa ra nhận định ngoài nguồn.
3. Không dùng khẩu hiệu, từ cảm thán, tính từ mạnh. Ví dụ viết "Quyền lực nhà nước là thống nhất, có phân công, phối hợp, kiểm soát" thay vì mọi cách diễn đạt hoa mỹ.
4. **Không biến bất kỳ quan điểm hay đối tượng nào thành "kẻ địch"** trong lối chơi. Chướng ngại chỉ là việc cần làm (thủ tục, khoảng cách, hố) chứ không phải con người hay tổ chức.
5. Giáo trình có một số từ ngữ nặng tính chính trị (ví dụ "thống trị", "chuyên chính", "bạo lực", "thế lực thù địch"). **Không đưa các từ này vào lối chơi.** Nếu cần nhắc, chỉ trích nguyên văn một câu ở trạm đọc, có dẫn nguồn.

## 3. Cơ chế = hoạt động có thật trong nội dung

Mỗi cơ chế của nhóm (ảnh 1–7) được gắn với **đúng hoạt động mà bài nói đến**:

| # | Cơ chế | Hoạt động trong bài mà nó mô phỏng | Cách chơi | Nguồn |
|---|--------|------------------------------------|-----------|-------|
| 1 | **Cột + nút đỏ** (số cột = `n`) | **Bỏ phiếu / biểu quyết**: mỗi người một phiếu; đủ số phiếu thì thông qua | Mỗi người đứng một nút; hiện "đã bỏ `3/5` phiếu"; đủ thì hiện cầu/mở cổng | Tổng tuyển cử 06/01/1946 (docx III); "nhân dân có quyền bầu và bãi miễn" (`GT:1888`) |
| 1b | Nút đỏ, đủ `k` nhánh cùng lúc | **Phân công – phối hợp – kiểm soát** giữa lập pháp, hành pháp, tư pháp | 3 nút "Lập pháp / Hành pháp / Tư pháp", mỗi nút ≥ 1 người **cùng lúc** thì cổng mở | Điều 2 Hiến pháp 2013; `GT:1745`, `GT:1876` |
| 2 | **Sàn băng** | **Đoạn chưa có quy định cụ thể**: trước khi có quy định thì khó đứng vững | Sàn trơn có hố; chạm nút "Ban hành quy định" thì sàn thành sàn thường | "Dân chủ phải được thể chế hóa bằng pháp luật" (`GT:1690`); trước 1986 chưa đặt ra cụ thể (`GT:1650`) |
| 3 | **Vùng chậm** | **Thủ tục hành chính phiền hà** làm chậm công việc | Vùng chậm có nhãn "Thủ tục phiền hà". Kéo nhau ra bằng dây; sau khi "Cải cách hành chính" (nút) thì vùng biến mất | `GT:2012` ("giảm mạnh và bãi bỏ các thủ tục hành chính gây phiền hà") |
| 4 | **Thang nâng** (đủ người) | **Thể chế hóa**: đưa chủ trương lên thành Hiến pháp, pháp luật | Cả nhóm đứng lên bục, bục nâng lên mức "Hiến pháp/Luật" | `docx I`: "Nhà nước thể chế hóa đường lối thành pháp luật"; `GT:1690` |
| 5 | **Sàn chở theo lộ trình** | **Tiến trình phát triển thể chế theo thời gian** (dòng thời gian thật) | Sàn đi qua các mốc 1945 → 2022, dừng ở mỗi mốc để hiện nội dung | `docx III` |
| 6 | **Trần chết, trần thấp** | **"Hoạt động trong khuôn khổ Hiến pháp và pháp luật"** | Khu vực có khung; chạm trần/ra ngoài khung thì làm lại đoạn. Có nhãn "Khuôn khổ Hiến pháp và pháp luật" | Điều 4 khoản 3 (`docx I`, `II.2`); Điều 8 |
| 7 | **Khối nặng** (đủ `w` người đẩy) | **Việc cần nhiều người cùng làm**: bãi bỏ thủ tục phiền hà; xử lý vi phạm theo quy định | Khối nhãn "Thủ tục phiền hà" (`w = 2`) hoặc "Vi phạm" (`w = n`); đẩy vào ô "Bãi bỏ" / "Xử lý theo quy định" | `GT:2012`; "không có vùng cấm, không có ngoại lệ" (`docx II.4`) |
| A | Mảnh tư liệu **đúng màu từng người** | **Mỗi công dân một phiếu** | Mỗi người nhặt phiếu đúng màu mình ở chỗ riêng | Tổng tuyển cử |
| B | **Hòm phiếu** | **Bầu cử** | Thả đủ `n` phiếu vào hòm thì cửa mở | Tổng tuyển cử |
| ~~E~~ | ~~Giữ cửa luân phiên~~ | **Đã bỏ khi làm code**: dây nối theo thứ tự ô dài 4 ô nên với 4–5 người, người giữ nút không tới được nút mà không vượt qua người khác. Thay bằng "cả nhóm cùng đứng nút 3 giây" | — | — |
| F | **Bốn trạm tuần tự** | **"Dân biết, dân bàn, dân làm, dân kiểm tra"** | Trạm 1 đọc thông tin · trạm 2 cùng đứng nút (bàn) · trạm 3 đẩy khối (làm) · trạm 4 nút cuối (kiểm tra) | `GT:1775`, `GT:1882` |
| G | **Biển "Không có lối tắt"** | **Phòng, chống tham nhũng, lãng phí; không có ngoại lệ** | Lối tắt nhìn thấy rõ có gai; đường chính rõ ràng | `docx II.4`; `GT:2027` |
| H | **Cột mốc hồi sinh** | Mỗi đoạn là một nội dung | Thua thì về đầu đoạn | — |
| I | **Dừng ở trạm** | Đọc nội dung | Sàn chở dừng 4 s tại mốc | — |

Cơ chế C (sàn sụp) và D (cân quyền lực) của bản 2: **bỏ** (C không có hoạt động tương ứng trực tiếp; D khó làm vật lý, đã có 1b thay thế).

## 4. Năm level (mỗi level 8 đoạn)

Cột "Nguồn": `docx I…VI` = phần của bài thuyết trình; `GT:số` = dòng trong `thuyettrinh.txt`.

### Level 1 — Dân chủ và Nhà nước: khái quát (docx I)

| Đoạn | Nội dung hiển thị | Cơ chế | Nguồn |
|------|-------------------|--------|-------|
| 1 | "Đảng lãnh đạo, Nhà nước quản lý, Nhân dân làm chủ" — cơ chế vận hành chung của hệ thống chính trị | Đi bộ làm quen; dây | docx I |
| 2 | **Dân chủ là gì**: từ "demoskratos" (Hy Lạp cổ đại), nghĩa là quyền lực thuộc về nhân dân | Nhặt mảnh tư liệu | GT:974 |
| 3 | **Ba phương diện của dân chủ**: quyền lực; chế độ xã hội; nguyên tắc tổ chức | **3 mảnh, mỗi mảnh một phương diện** (phiếu màu A) | GT:996–1013 |
| 4 | **Dân chủ qua các thời kỳ**: nguyên thủy → chủ nô → phong kiến → tư sản → XHCN (1917). Câu hỏi giáo trình nêu: "Dân là ai?" | Dòng thời gian 5 bục; số người cần đứng nút tăng dần 1 → `n` (số người được tính là "dân" mở rộng dần) | GT:1098–1165 |
| 5 | **Hồ Chí Minh**: "Nước ta là nước dân chủ…" (đoạn trích) | Trạm đọc; cầu nhịp 2 bằng nút 1 (bỏ phiếu) | GT:1705–1713 |
| 6 | **Điều 2 Hiến pháp 2013**: Nhà nước của Nhân dân; quyền lực thống nhất, có phân công, phối hợp, kiểm soát | **3 nút "Lập pháp / Hành pháp / Tư pháp"** cùng lúc (1b) | docx I; GT:1745 |
| 7 | **Điều 8 Hiến pháp 2013**: Nhà nước tổ chức và hoạt động theo Hiến pháp và pháp luật | Đoạn **trần "Khuôn khổ"** ngắn, dạy luật chơi (6) | docx I |
| 8 | Tóm tắt phần I; cửa "Hiến pháp 2013" | Hòm phiếu (B): thả đủ `n` phiếu | docx I |

### Level 2 — Bốn lý do cốt lõi (docx II) + vì sao có sự lãnh đạo của Đảng (GT Ch.2, Ch.4)

| Đoạn | Nội dung | Cơ chế | Nguồn |
|------|----------|--------|-------|
| 1 | **Lý do 1 — Mục tiêu chung**: "dân giàu, nước mạnh, dân chủ, công bằng, văn minh" | 5 mảnh (mỗi mảnh một mục tiêu); bật `n` mảnh bắt buộc | docx II.1 |
| 2 | **Lý do 2 — Cơ sở hiến định**: Điều 4 khoản 1 (lực lượng lãnh đạo) | Thang nâng (4) | docx II.2 |
| 3 | Điều 4 khoản 2: gắn bó với Nhân dân, chịu sự giám sát và chịu trách nhiệm trước Nhân dân | **4 trạm "dân biết – bàn – làm – kiểm tra"** (F) | docx II.2; GT:1775 |
| 4 | Điều 4 khoản 3: tổ chức Đảng và đảng viên hoạt động trong khuôn khổ Hiến pháp và pháp luật | **Trần "Khuôn khổ"** dài, có gai đơn và hố 2 ô (6) | docx II.2 |
| 5 | **Lý do 3 — Phương thức lãnh đạo**: bằng đường lối; bằng công tác cán bộ; bằng kiểm tra, giám sát; bằng nêu gương | **4 trạm, mỗi trạm một cơ chế khác nhau** (nút, thang, khối, giữ cửa) | docx II.3 |
| 6 | **Lý do 4 — Kiểm soát quyền lực, chống tham nhũng**: Ủy ban Kiểm tra các cấp; "không có vùng cấm, không có ngoại lệ" | **Khối "Vi phạm"** `w = n` đẩy vào ô "Xử lý theo quy định" (7) + biển "Không có lối tắt" (G) | docx II.4 |
| 7 | **Vì sao có Đảng lãnh đạo (giáo trình)**: Đảng ra đời từ sự kết hợp chủ nghĩa Mác – Lênin với phong trào công nhân; ở Việt Nam kết hợp thêm với phong trào yêu nước (Hồ Chí Minh) | **Ba nhánh đường nhập thành một**: 3 người ở 3 nhánh cùng bấm thì ba đường nối lại (1b) | GT:356–358, 375–381 |
| 8 | **Bản chất chính trị của dân chủ XHCN**: dân chủ và vai trò lãnh đạo của Đảng "không loại trừ nhau" — nội dung theo giáo trình; cửa "Điều 4 Hiến pháp 2013" | Cổng 3 bàn đạp | GT:1403–1407 |

### Level 3 — Dấu mốc 1945–2022 (docx III) · "dòng thời gian"

Toàn level là một **sàn chở (5)** đi qua dòng thời gian, mỗi mốc dừng 4 s (I). Giữa các mốc là đoạn đi bộ/phối hợp ngắn.

| Đoạn | Mốc | Cơ chế dọc đường | Nguồn |
|------|-----|-------------------|-------|
| 1 | 1919 — "Việt Nam yêu cầu ca"; 02/9/1945 — Tuyên ngôn Độc lập | Lên sàn chở bằng thang nâng (4) | docx III.1 |
| 2 | 06/01/1946 — Tổng tuyển cử bầu Quốc hội đầu tiên | **Phiếu màu (A) + Hòm phiếu (B)** | docx III.1; GT:1317–1324 |
| 3 | 11/1946 — Hiến pháp 1946 (không có điều khoản nào nêu vai trò lãnh đạo của Đảng — đúng như bài) | Sàn chở; xà thấp | docx III.1 |
| 4 | 12/1986 — Đại hội VI, Đổi mới; "lấy dân làm gốc" | **Sàn băng "chưa có quy định cụ thể" (2)** → nút "Ban hành quy định" | docx III.2; GT:1650–1671 |
| 5 | 1991: Cương lĩnh (06/1991); Hội nghị TW 2 khóa VII (29/11/1991): khái niệm "Nhà nước pháp quyền XHCN" | Sàn chở; gai trên sàn nhấp nháy báo trước | docx III.3 |
| 6 | 01/1994 và 01/1995: "Nhà nước pháp quyền của dân, do dân, vì dân" | Khúc cua lên dốc | docx III.3 |
| 7 | 1992 (Hiến pháp 1992: Điều 4, Điều 12); 12/2001; 2011 (Cương lĩnh: phân công, phối hợp, kiểm soát); 11/2013 (Hiến pháp 2013 — Điều 4 bổ sung đảng viên; Đảng chịu sự giám sát) | Ba nút Lập pháp/Hành pháp/Tư pháp (1b) | docx III.4 |
| 8 | 2021 Đại hội XIII; 09/11/2022 Nghị quyết 27-NQ/TW | Cửa "Nghị quyết 27-NQ/TW" | docx III.5 |

### Level 4 — Nhà nước pháp quyền XHCN Việt Nam (docx IV + GT Ch.4 II, III.2)

| Đoạn | Nội dung | Cơ chế | Nguồn |
|------|----------|--------|-------|
| 1 | **Quan niệm chung về nhà nước pháp quyền**: thượng tôn pháp luật; công dân hiểu biết và tuân thủ pháp luật; các cơ quan phân công, phối hợp, kiểm soát | Trần "Khuôn khổ" (6) | GT:1807–1824 |
| 2 | **Nội dung Cương lĩnh**: đề cao vai trò tối thượng của Hiến pháp và pháp luật; bảo đảm quyền con người; phân công giữa các nhánh quyền lực; chịu sự giám sát của nhân dân; ngăn ngừa quan liêu, tham nhũng | 5 mảnh, bật `n` | GT:1825–1842 |
| 3 | **Đặc điểm 1**: nhà nước của dân, do dân, vì dân | **Nút bỏ phiếu (1)** | GT:1865 |
| 4 | **Đặc điểm 2**: tổ chức và hoạt động dựa trên Hiến pháp và pháp luật | Trần "Khuôn khổ" (6) | GT:1867 |
| 5 | **Đặc điểm 3**: quyền lực thống nhất, phân công, phối hợp, kiểm soát (lập pháp, hành pháp, tư pháp) | 3 nút cùng lúc (1b) | GT:1876 |
| 6 | **Đặc điểm 4**: do Đảng Cộng sản Việt Nam lãnh đạo (Điều 4); nhân dân giám sát "dân biết, dân bàn, dân làm, dân kiểm tra" | **4 trạm (F)** | GT:1879–1884 |
| 7 | **Đặc điểm 5 và 6**: tôn trọng quyền con người; nhân dân có quyền bầu và bãi miễn đại biểu không xứng đáng; tập trung dân chủ | Nút bỏ phiếu + **giữ cửa luân phiên** (E, "dân chủ ↔ nhà nước" hai chiều) | GT:1885–1894; GT:1577–1621 |
| 8 | **Bảng đối chiếu (docx IV)**: nguồn gốc quyền lực · cơ sở hoạt động · ranh giới quyền lực · trách nhiệm giải trình | 4 mảnh = 4 hàng của bảng; cửa "Hiến pháp và pháp luật" | docx IV |

### Level 5 — Ý kiến phản biện, giải pháp và kết luận (docx V–VI + GT Ch.4 III.3)

| Đoạn | Nội dung | Cơ chế | Nguồn |
|------|----------|--------|-------|
| 1 | **Phản biện 1**: chưa có cơ chế độc lập xét tính hợp hiến các quyết định của Đảng — kèm **cách giải đáp chính thức** | Trạm đọc chung: cả nhóm đứng nút để đọc; mở sau đủ thời gian hiển thị | docx V |
| 2 | **Phản biện 2**: tư pháp chưa đủ độc lập — kèm cách giải đáp chính thức | Trạm đọc chung | docx V |
| 3 | **Phản biện 3**: "rule by law" hay "rule of law" — kèm cách giải đáp chính thức | Trạm đọc chung | docx V |
| 4 | Điểm khác nhau giữa hai phía: **cách hiểu về pháp quyền** (đặc thù từng nước hay nguyên tắc phổ quát) | Trạm đọc; giữ cửa luân phiên (E) | docx V (câu cuối) |
| 5 | **Năm việc phát huy dân chủ** (giáo trình): (1) thể chế kinh tế thị trường định hướng XHCN; (2) xây dựng Đảng trong sạch, vững mạnh; (3) xây dựng nhà nước pháp quyền vững mạnh; (4) nâng cao vai trò các tổ chức chính trị – xã hội; (5) hoàn thiện hệ thống giám sát, phản biện xã hội. Thêm: nâng cao dân trí, văn hóa pháp luật | **5 nút, mỗi nút một việc**; nút giữ trạng thái sau khi kích hoạt; đủ 5 nút thì mở cổng | GT:1910–1989 |
| 6 | **Bốn việc hoàn thiện nhà nước pháp quyền**: (1) dưới sự lãnh đạo của Đảng; (2) cải cách thể chế và phương thức hoạt động (Quốc hội; hành chính); (3) đội ngũ cán bộ, công chức trong sạch; (4) phòng, chống tham nhũng, lãng phí | **Vùng chậm "Thủ tục phiền hà" (3) → Khối "Thủ tục" đẩy bỏ (7)**; biển "Không có lối tắt" (G) | GT:1992–2038 |
| 7 | **Nghị quyết 27-NQ/TW**: tiếp tục hoàn thiện; còn phải hoàn thiện cơ chế kiểm soát quyền lực và nâng cao hiệu lực thực thi pháp luật (docx VI) | Sàn chở tổng kết, dừng ở trạm | docx VI |
| 8 | **Kết luận (docx VI)**, ba ý: lãnh đạo của Đảng được Hiến pháp ghi nhận kèm nghĩa vụ hoạt động trong khuôn khổ pháp luật; nguyên tắc pháp quyền là yêu cầu để sự lãnh đạo không rơi vào lạm quyền, bao biện, làm thay Nhà nước; còn phải tiếp tục hoàn thiện. Cửa cuối → **Màn hình Kết thúc** (Bảng đối chiếu + kết luận + câu mở thảo luận) | Giữ cửa luân phiên (E) | docx VI |

Cách trình bày phản biện: là **trạm đọc chung** (không phải chướng ngại), luôn hiển thị **cả ý phản biện và cách giải đáp chính thức** cạnh nhau với cùng cỡ chữ, đúng như Phần V của bài.

## 5. Cơ chế cho nhóm 3–5 người

`n` = số người khi bắt đầu level. Một bản thiết kế/level; số liệu tự tính theo `n`.

| Thứ co giãn | Quy tắc |
|-------------|---------|
| Cột nút bỏ phiếu (1) | Số cột = `n`, mỗi cột 1 nút |
| 3 nút Lập pháp/Hành pháp/Tư pháp (1b) | Cố định 3 nút. Người thứ 4, 5 đi nhặt mảnh |
| 5 nút giải pháp (L5 đoạn 5) | Nút giữ trạng thái sau khi kích hoạt nên 3 người vẫn kích hoạt đủ 5 nút |
| Thang nâng (4), sàn chở (5) | Chạy khi đủ `n` người đứng lên |
| Khối nặng (7) | `w = 2` (thủ tục phiền hà) hoặc `w = n` (xử lý vi phạm) |
| Mảnh tư liệu | Mỗi level đặt 5 vị trí, bật `n` vị trí (mảnh bắt buộc = `n`) |
| Bục cao | 2 ô: chồng 2 người; 3 ô: chồng 3 người (luôn đủ vì `n ≥ 3`) |
| Cửa | Rộng 6 ô |
| Hồi sinh | Thua → cả nhóm về cột mốc đoạn hiện tại |

Giới hạn khả năng (đo trên engine): nhảy một mình ~1.6 ô; chồng 2 ~2.4 ô; chồng 3 ~3.2 ô; vượt hố ≤ 2 ô; gai đơn nhảy qua được; dây 4 ô.

## 6. Nội dung giáo trình chưa dùng trong dàn bài (có thể bổ sung nếu cần level dài hơn)

Bảng này trả lời câu hỏi "còn phần nào trong tài liệu chưa dùng". Đã đưa vào level ở mục 4: các mục được ghi "(đã dùng ở …)".

| # | Nội dung trong giáo trình | Nguồn | Gợi ý đưa vào game | Mức nhạy cảm |
|---|---------------------------|-------|--------------------|--------------|
| 1 | Khái niệm dân chủ và ba phương diện | GT:974–1027 | (đã dùng ở L1 đoạn 2–3) | Thấp |
| 2 | Dân chủ qua các thời kỳ: nguyên thủy, chủ nô, phong kiến, tư sản, XHCN; Công xã Pa-ri 1871; Cách mạng Tháng Mười 1917 | GT:1098–1189 | (đã dùng ở L1 đoạn 4, rút gọn). Có thể mở rộng thành **một level riêng** "Lịch sử dân chủ" nếu cần thêm thời lượng | Thấp |
| 3 | Dân chủ là **mục tiêu, bản chất, động lực** của phát triển, và "gắn với kỷ luật, kỷ cương, được thể chế hóa bằng pháp luật" | GT:1685–1732 | Thêm đoạn L1 hoặc L4: **4 nút bốn vai trò** (mục tiêu · bản chất · động lực · gắn với pháp luật) | Thấp |
| 4 | **Dân chủ gián tiếp** (nhân dân bầu Quốc hội, nhiệm kỳ 5 năm) và **dân chủ trực tiếp** (được thông tin, bàn bạc, kiểm tra, giám sát) | GT:1735–1757 | Thêm đoạn L3/L4: hai lối đi, một lối "đại diện" (bầu người thay mặt đi tiếp) và một lối "trực tiếp" (đi cùng nhau) | Thấp |
| 5 | **Bản chất kinh tế** và **bản chất tư tưởng – văn hóa** của dân chủ XHCN (ngoài bản chất chính trị) | GT:1333–1383 | Đoạn bổ sung L2: ba cột "chính trị – kinh tế – văn hóa" | Vừa (có từ ngữ lý luận nặng; nên trích ngắn) |
| 7 | **Quan hệ hai chiều dân chủ ↔ nhà nước**; cảnh báo: nếu vi phạm nguyên tắc dân chủ, quyền lực của nhân dân có thể trở thành quyền lực của một nhóm; nhà nước là "công cụ thực thi" dân chủ | GT:1577–1632 | (đã dùng ở L4 đoạn 7, cơ chế E). Có thể làm thành **đoạn riêng** có hai cổng qua lại | Thấp |
| 8 | **Dân chủ XHCN ở Việt Nam**: trước 1986 chưa nêu rõ khái niệm; Đại hội VI lấy "dân làm gốc"; 35 năm đổi mới; "dân chủ là bản chất, mục tiêu, động lực" | GT:1641–1692 | (đã dùng ở L3 đoạn 4) | Thấp |
| 9 | **Hồ Chí Minh về dân chủ**: "Dân là chủ và dân làm chủ"; "chính quyền là đầy tớ trung thành của nhân dân"; làm chủ nhà nước, xã hội, bản thân | GT:1028–1067; 1705–1713 | (đã dùng ở L1 đoạn 5). Thêm đoạn "ba kiểu làm chủ" (nhà nước · xã hội · bản thân) = 3 mảnh | Thấp |
| 11 | Chương 2: **điều kiện chủ quan** — Đảng là nhân tố chủ quan quan trọng nhất; liên minh công – nông – trí thức; đặc điểm giai cấp công nhân Việt Nam (gắn bó với dân tộc, truyền thống yêu nước, đoàn kết) | GT:348–385, 636–656 | Một đoạn bổ sung L2 (sau đoạn 7): **ba nhóm cùng đứng nút "liên minh"** (công nhân – nông dân – trí thức) | Vừa |
| 12 | Chương 2: **xây dựng, chỉnh đốn Đảng** là then chốt; Đảng "trong sạch, vững mạnh" | GT:694–700, 774–791 | Đã có tương ứng ở L5 đoạn 5 (việc số 2). Có thể thêm đoạn riêng nếu cần | Vừa |
| 13 | Chương 2: **ba nội dung sứ mệnh ở Việt Nam** (kinh tế — công nghiệp hóa, hiện đại hóa; chính trị – xã hội; văn hóa – tư tưởng) | GT:724–816 | **Level phụ (tùy chọn)** "Ba nhiệm vụ": 3 khu vực, mỗi khu vực một cơ chế | Vừa |
| 14 | Chương 2: **phương hướng và giải pháp** (năm giải pháp xây dựng giai cấp công nhân; chính sách việc làm, bảo hiểm, nhà ở) | GT:819–936 | Chỉ nên dùng nếu nhóm muốn mở rộng chủ đề sang phần công nhân; nội dung này **lệch** khỏi đề bài | Thấp nhưng lệch đề |
| 15 | Câu hỏi ôn tập cuối chương (Ch.4: 5 câu; Ch.2: 5 câu) | GT:937–951, 2039–2049 | Dùng làm **câu hỏi thảo luận** ở Màn hình Kết thúc (không phải câu đố trong game). Câu 5 của Ch.4: "Liên hệ trách nhiệm cá nhân" | Thấp |
| 16 | Chương 5 (cơ cấu xã hội – giai cấp, liên minh) | GT:2051–2070 | File dừng ngay phần mở đầu, chưa có nội dung; **không dùng** | — |

Đề xuất nếu cần thêm thời lượng: **(a)** mục 2 + 9 thành level mở đầu "Lịch sử dân chủ" (6 phút); **(b)** mục 6 + 7 thành level "Nhà nước và dân chủ" đặt giữa L3 và L4; **(c)** mục 13 thành level phụ. Khi đó tổng 7–8 level; nhóm quyết định.

## 7. Thiết kế web (tóm tắt)

| Màn hình | Nội dung |
|----------|----------|
| Trang chủ | Tên game, câu hỏi của bài làm phụ đề, dòng thời gian 5 chương |
| Sảnh / phòng chờ | Như hiện tại; phòng < 3 người không bắt đầu được |
| Mở chương (3 s) | Tên chương, câu hỏi chính của chương |
| Trong level | Canvas + thanh trên: tên chương · đoạn `3/8` · mảnh `k/n` · thời gian · khung nội dung (≤ 140 ký tự, 5 s) |
| Thẻ tổng kết | Sau cửa: 3–4 dòng ý chính + nguồn |
| Kết thúc | Bảng đối chiếu (docx IV), kết luận (docx VI), câu hỏi thảo luận (mục 6 #15) |
| Admin | Phòng nào ở chương/đoạn nào; thời gian từng chương |

Màu theo chương: 1 trung tính sáng · 2 đỏ nhạt + vàng (Hiến pháp) · 3 sepia → sáng dần theo thời gian · 4 xanh nhạt · 5 trắng sáng. Màu chỉ để phân biệt chương.

## 8. Thay đổi kỹ thuật (để lập plan)

| Cơ chế | Cách làm trong engine | Mức |
|--------|----------------------|-----|
| 1, 1b, E, F: nút đếm người, nút giữ trạng thái, cổng | Vùng cảm biến đếm người; trạng thái "kích hoạt giữ mãi" hoặc "đang giữ"; cổng = khối đặc bật/tắt | Vừa |
| 2 Sàn băng | Khi chân chạm ô băng: giảm ma sát; có thể đổi thành ô thường khi nút kích hoạt | Nhỏ |
| 3 Vùng chậm | Trong vùng: tốc độ ×0.35, nhảy ×0.7; vùng biến mất khi nút kích hoạt | Nhỏ |
| 4 Thang nâng | Thân kinematic, lên khi đủ người | Vừa |
| 5, I Sàn chở + dừng trạm | Thân kinematic chạy theo điểm, dừng 4 s | Vừa–khó |
| 6 Trần chết | Gai ở hàng trần + vùng chết chữ nhật | Nhỏ |
| 7 Khối nặng | Thân động khối lượng lớn; chỉ di chuyển khi ≥ `w` người tì và cùng bấm hướng đó | Vừa |
| A, B Phiếu/hòm phiếu | Mảnh có chủ theo slot; cửa đếm mảnh | Nhỏ |
| G, H, trạm ký ức | Chủ yếu ở renderer/client | Nhỏ |
| `story.ts` | Toàn bộ chữ (đoạn, mảnh, thẻ tổng kết, phản biện/giải đáp) trong một file dữ liệu để nhóm soát và sửa | Nhỏ |

Giữ hướng hiện tại: engine chạy trên `mln-server` (đồng bộ bằng `sync-shared`), client chỉ vẽ.

## 9. Tiêu chí thành công

- [ ] Nhóm 3 người và 5 người đều qua được 5 level (bot + chơi thử thật).
- [ ] Không ai đứng yên quá 20 s vì "không biết làm gì" khi chơi thử.
- [ ] Tổng thời gian lần đầu chơi: 25–35 phút.
- [ ] Mọi chữ trong game khớp bài/giáo trình/Hiến pháp và có nguồn; một thành viên soát `story.ts`; không còn từ trong danh sách ở mục 2.5.
- [ ] Phần phản biện hiển thị đủ cả ý phản biện và cách giải đáp chính thức, cùng cỡ chữ.

## 10. Quyết định của nhóm

**Đã chốt (2026-10-27):**
1. Giữ **5 level dài** (8 đoạn/level), không thêm level phụ.
2. **"Tệ quan liêu"** nằm ở phần **kiểm soát quyền lực** (L2 đoạn 6, L4 đoạn 2), đúng như giáo trình (`GT:1837`). Không dùng bối cảnh "bao cấp".
3. **Bỏ** nội dung giáo trình về chức năng nhà nước và thách thức hiện nay (đã xóa khỏi bảng mục 6).
4. **Không làm** chế độ người dẫn.

**Code:** tài liệu cầm tay chỉ việc ở `mlngame/docs/level-phap-quyen/` (README + 01–08). Hình học thực tế, nội dung chữ và các điều chỉnh khi làm code (bỏ cơ chế E, vát góc đáy nhân vật, chủ mảnh chia trái → phải…) ghi trong README của bộ docs đó; khi khác với bảng ở mục 4 thì **docs là bản đúng**.
