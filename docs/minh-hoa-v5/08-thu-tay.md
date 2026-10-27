# 08 · Thử tay trên trình duyệt

Chạy `npm run dev` trong `mlngame`, mở `http://localhost:5173/sandbox?n=2` (2 người: W A D và ← → ↑; phím `1`–`5` chọn level, `0` level luyện tập, `P` về cột mốc, `R` chơi lại).

## Giao diện ngoài canvas

- [ ] Vào trang: thẻ mở Level 1 (ảnh `era1`, dấu đỏ "1919 - 1946") phủ canvas ~2 giây rồi trượt sang trái.
- [ ] Thanh thời gian: mốc 1 sáng; hàng 5 tem dưới thanh đều mờ.
- [ ] Khung tư liệu bên phải: ảnh `l1p1`, năm **1919**, cụm "THẦN LINH PHÁP QUYỀN", 5 chấm (chấm 1 đậm).
- [ ] Đi qua cổng mốc phần 2: tem 1 bay vào ô 1 và đóng dấu; thẻ tư liệu lật sang ảnh `l1p2.jpg` (ảnh thật), năm **02/9/1945**.
- [ ] Thua (rơi hố) rồi hồi sinh: tem **không** bay lại, khung tư liệu không đổi.
- [ ] Phím `3`: thẻ mở Level 3 hiện lại; tem về 5 ô mờ (không bay); khung tư liệu `l3p1`.
- [ ] Phím `0`: thanh thời gian + khung tư liệu ẩn, canvas vẫn chạy, góc trên có chữ "Tìm chìa khóa".
- [ ] Thu nhỏ cửa sổ dưới 960 px: khung tư liệu xuống dưới canvas, ảnh nhỏ 160 px, chữ cạnh ảnh; không có thanh cuộn ngang.
- [ ] Màn hình 1024 × 768 (máy chiếu): 2 cột vừa, không tràn ngang.

## Trong canvas (mỗi level xem phần đầu)

- [ ] L1: trời vàng nhạt, đồi + tre, mái đình, cột cờ, gạch đất nện có cỏ; cổng làng mái ngói với bảng **1919**.
- [ ] L2: trời xám nhạt, nhà máy, nhà tập thể, cột điện; tới phần 4 trời chuyển cam hồng, khói ống khói chuyển trắng hồng, có tia nắng.
- [ ] L3: trời xanh ngọc nhạt, trụ sở cột trắng, hàng cây; gạch granite; vòm đá trắng có sao.
- [ ] L4: trời xanh nhạt, thành phố kính, dải cờ đỏ–vàng; phần 2 có **3 trụ** (sách · bánh răng · búa); phần 3 trần đỏ chữ chạy "RANH GIỚI HIẾN PHÁP & PHÁP LUẬT", bập bênh là **cán cân** 2 đĩa.
- [ ] L5: trời vàng kem, dải panorama làng → nhà máy → cột trắng → thành phố; gạch vàng vân trống đồng; phần 3 khối "Bãi bỏ" là **chồng hồ sơ buộc dây** — đẩy vào đích thì hóa chim giấy bay lên, vùng giấy tờ biến mất.
- [ ] Cơ chế: phiếu bầu (giấy ✓ đỏ) nhặt được, lơ lửng lắc trên đầu; hòm phiếu gỗ có `k/5` tăng; chìa là **cuốn Hiến pháp** bìa đỏ (năm 1946 / 1992 / 2013); sàn sụp L2 là **tem phiếu**, đếm ngược `0.8s`; khối đỏ L2 búa, L3 con lắc xích, L4–5 găng đỏ.
- [ ] Người đứng nút của dãy dẫn đường (L3 phần 4) có **lá cờ đỏ** sau lưng.
- [ ] Thắng Level 5: pháo hoa nhẹ; poster kết nền kem sáng phủ canvas, "KHÔNG MÂU THUẪN" hiện từng chữ, 3 ý, 25 tem sáng; Sandbox có nút "Chơi lại từ Level 1".

## Hiệu năng

Mở DevTools → Console, dán (chạy khi tab đang hiện):

```js
await new Promise(r=>{let n=0;const t0=performance.now();(function f(){n++;performance.now()-t0<3000?requestAnimationFrame(f):r(n/3)})()})
```

Kết quả ≥ 55 (khung/giây). Thử cả `?n=5`.

## Phòng online (2 tab, server local)

- [ ] Cả hai tab cùng thấy thanh thời gian / khung tư liệu đổi khi nhóm qua cổng mốc.
- [ ] Server tự sang level kế khi thắng: thẻ mở level mới hiện ở cả hai tab.
- [ ] Thắng Level 5: poster ghi "Bấm R để cả phòng chơi lại" (chủ phòng) / "Chờ chủ phòng bấm R…" (người khác).
