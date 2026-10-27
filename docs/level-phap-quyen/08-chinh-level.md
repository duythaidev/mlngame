# 08 — Nhóm tự chỉnh level, chữ, độ khó

## Sửa chữ

Chỉ sửa `src/game/story.ts` (mỗi đoạn 1 dòng, thứ tự đúng thứ tự đoạn trong `chapters.py`). Nhãn vật: bảng `LABELS`.

## Sửa hình học

1. Sửa khối đoạn trong `scripts/levels/chapters.py` (tọa độ trong đoạn: cột 0 = đầu đoạn, hàng 11 = hàng đứng, hàng 12–15 = nền).
2. Chạy:

```bash
python scripts/levels/chapters.py src/game/levelData.ts
npx vitest run
```

3. Bên `mln-server`: `npm run sync-shared` rồi build lại.

Script **báo lỗi ngay** nếu chỗ hồi sinh của đoạn (cột 1–5) không trống / không có nền.

### Giới hạn khi vẽ (đo trên engine)

| Thứ | Giới hạn |
|-----|----------|
| Nhảy một mình | bậc **1 ô**; hố **≤ 2 ô**; gai đơn |
| Chồng 2 người | bục **2 ô**; có khối 1 ô làm bậc: bục **3 ô** |
| Trần nguy hiểm `ceiling(x0, x1, row)` | hàng 8: nhảy từ nền vẫn an toàn · hàng 9: không nhảy được · hàng 10: chỉ đi bộ (vừa đầu) |
| Dây | 4 ô giữa người liền kề: chỗ nhiều người phải đứng cùng lúc cách nhau ≤ 4 ô, xếp trái → phải |
| Dãy nút dẫn đường | lối trên cao hơn cầu đúng 3 ô (`guided(..., path_row=9)` với cầu ở hàng 12) |
| Sàn chở có nút | sàn 6 ô; nhóm 5 người dùng 5 ô đầu; không cho sàn leo dốc khi còn ở dưới trần thấp |
| Nút cần mọi người | dùng `per=True` (chỉ n nút đầu hiện) — không bao giờ cần nhiều nút hơn số người |

## Chỉnh độ khó bằng hằng số (`src/lib/constants.ts`)

| Hằng số | Mặc định | Tăng thì | Giảm thì |
|---------|----------|----------|----------|
| `iceGrip` | 0.12 | băng đỡ trơn | băng trơn hơn |
| `seesawSpring` | 530 | bập bênh khó nghiêng hơn (dễ) | nghiêng nhiều hơn (khó) |
| `seesawSlip` / `seesawSlide` | 0.24 / 0.35 rad | phải lệch nhiều mới trơn/trượt (dễ) | dễ trơn hơn (khó) |
| `crumbleStand` | 0.8 s | đứng được lâu hơn (dễ) | sụp nhanh hơn (khó) |
| `crumbleBack` | 3 s | chờ hồi lâu hơn | hồi nhanh hơn |
| `moverSpeed` | 2.5 ô/s | sàn chở nhanh hơn | chậm hơn |
| `stopWait` | 4 s | dừng trạm lâu hơn | ngắn hơn |
| `boxSpeed` / `boxGlide` | 1.5 / 1 | khối đi nhanh hơn / trượt ngắn hơn | khối chậm hơn / trượt xa hơn |
| Tốc độ khối đỏ | trong `chapters.py` (`hazard(..., speed, pause)`) | khó hơn | dễ hơn |
| Tốc độ băng chuyền | trong `chapters.py` (`conveyor(..., speed)`) | khó hơn | dễ hơn |

Đổi hằng số ở web thì **phải** `npm run sync-shared` + build lại server (server chạy vật lý thật).
