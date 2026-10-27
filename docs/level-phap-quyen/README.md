# Level bản 4 "Từ lịch sử đến câu trả lời" — tài liệu code "bê vào là chạy"

Biến game dây Pico Rope (`E:\Web\mln131\mlngame` + server `E:\Web\mln131\mln-server`) thành **5 level**:
4 level kể lịch sử (1945–1946 → 1976–1986 → 1991–1995 → 2001–2022) và **level 5 trả lời câu hỏi** của bài thuyết trình
(*"Vai trò lãnh đạo của Đảng có mâu thuẫn với nguyên tắc pháp quyền?"* → màn kết "Không mâu thuẫn" + 3 ý).

- Thiết kế đã duyệt: `mlngame/docs/superpowers/specs/2026-10-28-level-lich-su-v4-design.md` (đọc mục 2–5 trước khi sửa level).
- Bộ docs này **thay thế** bản trước trong cùng thư mục (bản "5 chương"). Áp được lên **repo gốc** lẫn repo **đã áp bản trước**: mọi file cần đổi đều đưa nguyên file; file 05 và 06 có bước **dọn file của bản trước**.
- Chơi được với **2–5 người**; dây nối 4 ô giữa người liền kề là cơ chế gốc, có ở mọi đoạn.

## Thứ tự làm (đạt mục ✅ Kiểm tra của file trước rồi mới sang file sau)

| # | File | Làm gì | Repo |
|---|------|--------|------|
| 01 | [01-du-lieu-level.md](01-du-lieu-level.md) | Hằng số, kiểu vật thể, dựng level từ đoạn, trạng thái gửi trong snapshot | mlngame |
| 02 | [02-engine.md](02-engine.md) | Engine: 17 cơ chế (nút, cổng, cầu, băng, vùng chậm, bục số, sàn chở có nút, trần nguy hiểm, khối số có trọng lực, mang vật, dãy nút dẫn đường, sàn sụp, khối đỏ, băng chuyền, bập bênh, cột mốc) | mlngame |
| 03 | [03-level-va-noi-dung.md](03-level-va-noi-dung.md) | Script sinh level + `levelData.ts` (5 level, 38 đoạn) + `story.ts` (mỗi đoạn 1 dòng) | mlngame |
| 04 | [04-codec-noi-suy.md](04-codec-noi-suy.md) | Gửi trạng thái vật thể trong snapshot; nội suy thang/sàn chở/khối/khối đỏ | mlngame |
| 05 | [05-giao-dien.md](05-giao-dien.md) | Vẽ toàn bộ cơ chế, dòng chữ đoạn, màn kết, Sandbox 2–5 người, phòng ≥ 2 người | mlngame |
| 06 | [06-test.md](06-test.md) | Test ngắn từng cơ chế + chạy thử bằng tay trong Sandbox | mlngame |
| 07 | [07-server.md](07-server.md) | Đồng bộ code sang `mln-server`, sửa 2 test, build, triển khai | mln-server |
| 08 | [08-chinh-level.md](08-chinh-level.md) | Cách nhóm tự sửa level / chữ / độ khó sau này | mlngame |

## Quy ước

- Mỗi khối code bắt đầu bằng dòng chú thích đường dẫn (`// src/...`, `# scripts/...`) — **đường dẫn tương đối trong repo** đang nói tới.
- "Tạo mới / thay toàn bộ" = xóa nội dung cũ (nếu có) rồi dán nguyên khối. File không nhắc tới thì **giữ nguyên**.
- Lệnh chạy ở thư mục gốc repo đang nói tới (`mlngame` hoặc `mln-server`).
- Code trong docs được **sinh tự động từ bản đã chạy test**, không gõ lại tay.

## Mức đã kiểm chứng (Node 24.14, Windows)

Code được trích thẳng từ docs này vào bản sao của hai repo gốc và chạy:

- `mlngame`: `tsc -b` sạch; **47/47 test xanh** (test từng cơ chế, test "5 level dựng được, đứng yên ở xuất phát 3 giây không ai chết" với 2 và 5 người, và các test cũ); `vite build` thành công; `eslint` chỉ còn 1 lỗi **có sẵn từ trước** ở `Room.tsx`.
- `mln-server`: `tsc --noEmit` sạch; **48/48 test xanh**; `npm run build` thành công.
- Đã mở Sandbox trên trình duyệt: băng chuyền, phiếu, dòng chữ đoạn, bập bênh (nghiêng/trượt), sàn chở có nút đi chéo chở người, khối đỏ — hiển thị và chạy đúng.
- Script sinh level **tự kiểm** chỗ hồi sinh của mọi đoạn (5 ô trống, có nền).

**Chưa kiểm chứng (theo yêu cầu nhóm, không làm bot chơi hết level):** chơi hết từng level bằng tay với 2 và 5 người; độ khó / thời lượng thật. File 06 có danh sách việc cần thử tay và file 08 có bảng hằng số để chỉnh độ khó.

## Ký hiệu trong lưới level (`levelData.ts`)

| Ký tự | Nghĩa |
|-------|-------|
| `#` | nền đặc |
| `.` | trống |
| `X` | gai (chạm nửa dưới ô là thua) |
| `^` | vùng chết (trần nguy hiểm) |
| `S` | xuất phát · `C` cột mốc hồi sinh · `D` cửa |
| ký tự khác | vật thể, khai báo trong `objs` của đoạn (script tự cấp ký tự) |
