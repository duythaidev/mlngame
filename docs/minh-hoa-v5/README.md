# Bản 5 "Minh họa" — tài liệu code "bê vào là chạy"

Refactor game dây Pico Rope (`E:\Web\mln131\mlngame` + server `E:\Web\mln131\mln-server`):

- **Level:** mỗi level còn **5 phần** (bỏ 8 đoạn của bản 4, giữ nguyên hình học các đoạn còn lại).
- **Giao diện ngoài canvas:** thanh thời gian + 5 tem của level · khung tư liệu ảnh bên phải canvas · thẻ mở level · poster kết "KHÔNG MÂU THUẪN" + 25 tem.
- **Trong canvas:** "bộ áo" **sáng** cho 5 thời kỳ — trời, nền 2 lớp cuộn chậm, gạch, cổng mốc có năm to, đạo cụ trang trí, đồ họa cho 17 cơ chế (ẩn dụ bằng hình), hạt hiệu ứng.
- **Ảnh:** dùng `.jpg` (ảnh thật) khi trùng tên với `.webp` (ảnh AI); nén mọi ảnh ≤ 150 KB.

Thiết kế: `docs/superpowers/specs/2026-10-29-minh-hoa-v5-design.md` và `2026-10-29-minh-hoa-v5-prompt-va-do-hoa.md`.

## Thứ tự làm (đạt mục ✅ Kiểm tra của file trước rồi mới sang file sau)

| # | File | Làm gì | Repo |
|---|------|--------|------|
| 01 | [01-level-5-phan.md](01-level-5-phan.md) | Script sinh level (5 phần), `level.ts` biết phần, sinh lại `levelData.ts` | mlngame |
| 02 | [02-chu-va-tien-do.md](02-chu-va-tien-do.md) | `story.ts` (chữ + ảnh 25 phần), `progress.ts` (tiến độ ra React), bỏ dòng chữ chạy | mlngame |
| 03 | [03-anh.md](03-anh.md) | Nén ảnh ≤ 150 KB bằng `sharp`, file ghi nguồn ảnh thật | mlngame |
| 04 | [04-khoi-minh-hoa.md](04-khoi-minh-hoa.md) | Các khối minh họa đọc dữ liệu thật, tem theo phần, poster sáng, CSS không đụng trang | mlngame |
| 05 | [05-bo-cuc-trang-choi.md](05-bo-cuc-trang-choi.md) | `GameStage` 2 cột, gắn vào Sandbox + Room, bỏ `EndingPanel` | mlngame |
| 06 | [06-do-hoa-canvas.md](06-do-hoa-canvas.md) | Thư mục `src/theme/` + `renderer.ts` mới | mlngame |
| 07 | [07-server.md](07-server.md) | Đồng bộ `level.ts` + `levelData.ts` sang server, test, build | mln-server |
| 08 | [08-thu-tay.md](08-thu-tay.md) | Danh sách thử tay trong trình duyệt | cả hai |

`tsc` chỉ xanh trở lại sau file 06 (02 xóa `storyTracker.ts` mà renderer cũ còn dùng) — làm liền 02 → 06.

## Quy ước

- **Thay toàn bộ / Tạo mới** `đường/dẫn` = xóa nội dung cũ (nếu có) rồi dán nguyên khối code bên dưới. Đường dẫn tính từ thư mục gốc repo đang nói tới.
- **Sửa** `đường/dẫn` — N chỗ = với mỗi chỗ, tìm **đúng** đoạn TÌM (xuất hiện đúng 1 lần trong file) rồi thay bằng đoạn THAY. File không nhắc tới thì **giữ nguyên**.
- **Xóa** file = xóa hẳn file đó.
- Lệnh chạy ở thư mục gốc repo đang nói tới (`mlngame` hoặc `mln-server`).
- Code trong docs được **trích tự động từ bản sao đã chạy test**, không gõ lại tay.

## Mức đã kiểm chứng (Node 24.14, Windows)

Code được **trích thẳng từ các file docs này** áp vào bản sao mới của hai repo gốc rồi chạy:

- `mlngame`: `tsc -b` sạch · **77/77 test xanh** (47 test cũ + 30 test mới: 5 phần/level, chữ ≤ giới hạn, ảnh tồn tại, tiến độ, tem, màu, cổng mốc, đạo cụ, hạt) · `vite build` thành công · `eslint` còn 3 lỗi **có sẵn từ trước** (`engine.ts:263`, `Room.tsx` setState trong effect, `EraSplashBanner.tsx` effect cũ) — ít hơn trước 1 lỗi.
- `mln-server`: `tsc --noEmit` sạch · **48/48 test xanh** · `npm run build` thành công.
- Script nén ảnh chạy trên bản sao thư mục `public/art`: 15 MB → 4,6 MB, mọi ảnh ≤ 150 KB.
- Đã mở trên trình duyệt (Sandbox, `/showcase`): 5 level đúng bộ áo sáng, cổng mốc có năm, thẻ mở level, khung tư liệu ảnh thật, poster kết sáng. Đo vẽ một khung: **~3,5 ms** với 5 người (60 FPS cần ≤ 16,7 ms).

**Chưa kiểm chứng:** chơi hết từng level bằng tay với 2 và 5 người (đường đi không đổi so với bản 4, chỉ bớt đoạn); xem trên máy chiếu thật. Danh sách thử tay ở file 08.

## Quyết định cần biết

| Quyết định | Lý do |
|-----------|-------|
| Phần = nhóm đoạn; đoạn nối tiếp **giữ** cột mốc hồi sinh (cờ nhỏ, không cổng) | Phần dài như 3.6+3.7+3.8 (106 ô) không bắt cả nhóm chơi lại từ đầu khi thua |
| Đạo cụ trang trí khai báo ở `src/theme/props.ts`, **không** ở `levelData` | Server không phải đổi; vị trí tự chọn ô nền trống, không đè vật thể |
| Thẻ mở level **không khóa** điều khiển | Server chạy liên tục; khóa phải đổi giao thức mạng |
| Tem bay từ vị trí **xấp xỉ** canvas, không đúng tọa độ cổng | Tọa độ cổng nằm trong canvas, tem nằm trong React |
| **Chưa thêm âm thanh mới** (`stamp`, `ballot`, `gate-bell`…) | Spec ghi "tùy chọn"; cần file âm thanh có giấy phép — nhóm bổ sung sau qua `src/lib/sound.ts` |
| Theme sáng thay các màu trời tối trong spec B8 (L4 navy, L5 đỏ thẫm) | Yêu cầu nhóm 2026-10-29 |

## Nhóm cần soát

- 2 dòng chữ mới trong `src/game/story.ts`: L2 phần 3 và L4 phần 5 (xem file 02).
- Điền nguồn 8 ảnh thật trong `public/art/NGUON-ANH.md` (file 03).
