# Quản trị phòng thi — tài liệu code "bê vào là chạy"

Bỏ "chủ phòng" (di sản thời chạy vật lý trên máy người chơi). **Admin** quản lý mọi phòng: bắt đầu / dừng lượt thi (từng phòng hoặc tất cả cùng lúc), xem trực tiếp (lưới ảnh thu nhỏ + xem to một phòng), bảng xếp hạng trực tiếp.

Giảm tải: admin **không** nhận luồng vị trí liên tục — server gửi 1 gói tóm tắt/giây cho mọi phòng; chỉ phòng đang xem to mới nhận 5 gói/giây (web tự nội suy cho mượt).

## Thứ tự làm

| # | File | Làm gì | Repo |
|---|------|--------|------|
| 01 | [01-server.md](01-server.md) | Kiểm quyền admin, lượt thi + số lần thua, xếp hạng, kênh admin Socket.IO | mln-server |
| 02 | [02-web-bo-chu-phong.md](02-web-bo-chu-phong.md) | Bỏ chủ phòng / phím R ở trang người chơi | mlngame |
| 03 | [03-web-admin.md](03-web-admin.md) | Bàn quản trị mới: điều khiển, xếp hạng, lưới, xem to | mlngame |
| 04 | [04-firebase.md](04-firebase.md) | Luật Firebase: chỉ admin tạo / xóa / bắt đầu phòng | Firebase console |
| 05 | [05-dong-bo-trien-khai.md](05-dong-bo-trien-khai.md) | Đồng bộ, **đo RAM (300 MB đủ cho 36 người)**, thứ tự triển khai | cả hai |
| 06 | [06-thu-tay.md](06-thu-tay.md) | Danh sách thử tay | cả hai |

## Quy ước

- **Thay toàn bộ / Tạo mới** `đường/dẫn` = dán nguyên khối code (đường dẫn tính từ gốc repo đang nói tới). File không nhắc tới thì giữ nguyên.
- Lệnh chạy ở thư mục gốc repo đang nói tới.
- Code trong docs được **trích tự động từ bản sao đã chạy test**, không gõ lại tay.

## Mức đã kiểm chứng (Node 24.14, Windows)

Code trích thẳng từ các file docs này áp vào bản sao mới của hai repo:

- `mln-server`: `tsc --noEmit` sạch · **61/61 test xanh** · build xong · đo tải 36 người + 1 admin: RAM tối đa **147 MB**.
- `mlngame`: `tsc -b` sạch · **94/94 test xanh** · build xong · `eslint` chỉ còn 3 lỗi có sẵn từ trước.

**Chưa kiểm chứng:** trang admin trên trình duyệt thật với server thật và Firebase thật (luật mới); RAM trên server VN (lệnh đo ở file 05).

## Quyết định cần biết

| Quyết định | Lý do |
|---|---|
| Admin nhận tóm tắt 1 gói/giây, xem to 5 gói/giây | Admin chỉ cần xem; không thêm luồng vị trí 20–30 gói/giây cho mỗi phòng |
| Xếp hạng tính trên server, giữ trong RAM | Không thêm bảng; server khởi động lại giữa lượt thì mất xếp hạng (kết quả từng level vẫn ghi SQLite như cũ) |
| Phòng đã có lượt thi không bị tự hủy khi trống | Giữ để xếp hạng; admin xóa phòng mới hủy |
| "Dừng" chỉ đưa người chơi về sảnh, không xóa kết quả | Bắt đầu lại mới xóa (lượt mới) |
| Người vào / rời giữa level → level đó chơi lại từ đầu (như trước) | Giữ hành vi engine cũ; thời gian level tính lại từ lúc dựng lại |
| Số lần thua chỉ hiển thị, **không** tính vào xếp hạng | Theo tiêu chí đã chốt: tiến độ → tổng thời gian |
