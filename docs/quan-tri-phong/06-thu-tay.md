# 06 · Thử tay

Chạy server dev (`mln-server`): `AUTH_DISABLED=1 npm run dev` (hoặc bản thật có Firebase). Web: `npm run dev`.

- [ ] Admin đăng nhập → góc trên hiện "● Đã nối game server".
- [ ] Tạo 2 phòng. Mở 2 tab ẩn danh vào phòng 1, 1 tab vào phòng 2: sảnh chờ ghi "Đang chờ ban tổ chức bắt đầu lượt thi…", không còn nút Bắt đầu, không có nhãn Chủ phòng.
- [ ] Admin bấm **▶ Bắt Đầu Tất Cả**: mọi tab người chơi chuyển vào màn chơi; bảng xếp hạng có 2 phòng; ô thu nhỏ đổi hình mỗi giây.
- [ ] Bấm ô thu nhỏ phòng 1 → khung xem to, nhân vật chạy mượt (trễ ~¼ giây so với người chơi). Đóng khung → không còn nhận gói `focus` (DevTools → Network → WS).
- [ ] Người chơi rơi hố → cột "Thua" tăng 1 trong ≤ 1 giây.
- [ ] "Tới level…" chọn Level 3 → phòng nhảy sang Level 3, các level đã xong vẫn còn trong bảng.
- [ ] Thắng Level 5 → phòng đứng ở poster kết, bảng ghi "🏁 Về đích"; người chơi bấm R không có tác dụng.
- [ ] **■ Dừng Tất Cả** → người chơi về sảnh chờ; bảng xếp hạng giữ nguyên.
- [ ] Xóa phòng → biến khỏi lưới và bảng xếp hạng; người trong phòng thấy "Phòng không tồn tại".
- [ ] Tắt server khi admin đang mở trang → hiện "Mất kết nối…"; bật lại → tự nối lại, đang xem to phòng nào thì vẫn xem tiếp phòng đó.
