# 05 · Đồng bộ, đo tải, triển khai

Code dùng chung (`level.ts`, `levelData.ts`, …) **không đổi** ở lần này, nhưng chạy lại cho chắc (ở `mln-server`):

```bash
npm run sync-shared
npx vitest run
npm run build
```

## RAM 300 MB có đủ cho 36 người?

Đo trên bản build (`dist/main.mjs`, Node 24, Windows), 36 client giả (9 phòng × 4, mỗi người bấm phím ngẫu nhiên 4 lần/giây) + 1 admin xem lưới và xem to 1 phòng, trong 45 giây:

| Chỉ số | Kết quả |
|---|---|
| RAM server lúc rảnh | 85 MB |
| RAM server khi chơi | 113 → 147 MB (tối đa 147 MB) |
| Snapshot tới mỗi người chơi | ~18 lần/giây, khoảng cách p95 = 65 ms, 0 lần vào phòng lỗi |
| Admin nhận | 1 gói `rooms`/giây ≈ 4 KB/giây · 4,8 gói `focus`/giây ≈ 0,8 KB/giây |

→ Giới hạn `MemoryMax=300M` trong `deploy/mlngame.service` **đủ, dư khoảng 2 lần**. Admin xem không làm nặng server: gói tóm tắt chỉ tạo 1 lần/giây cho mọi admin.

## Đo lại trên server thật

Trên máy chủ, trong thư mục `mln-server` (cổng thử 3601, không đụng bản đang chạy). Server thử chạy từ `/tmp` để **không** nạp file `.env` thật (có `NODE_ENV=production` sẽ chặn `AUTH_DISABLED`):

```bash
(cd /tmp && exec env AUTH_DISABLED=1 PORT=3601 DB_PATH=/tmp/load.db node ~/mln-server/dist/main.mjs) & SRV=$!
sleep 2
npx tsx scripts/loadtest.ts --url http://127.0.0.1:3601 --rooms 9 --per-room 4 --seconds 60 &
npx tsx scripts/adminprobe.ts http://127.0.0.1:3601 50
ps -o rss= -p $SRV   # RAM server (KB), đo lúc loadtest vẫn đang chạy
kill $SRV
```

Đạt: `loadtest` in `OK`, RAM dưới 250 000 KB.

Bản đang chạy bằng systemd: `systemctl show mlngame -p MemoryCurrent` (byte).

## Triển khai

1. `mln-server`: build, chép `dist/main.mjs` lên server, `sudo systemctl restart mlngame` (như `mlngame/docs/level-phap-quyen/07-server.md`).
2. Đăng luật Firebase mới (file 04).
3. `mlngame`: deploy Vercel như cũ.

Thứ tự quan trọng: **server trước, web sau** — web mới gửi `admin:hello`, server cũ không hiểu → admin thấy "Mất kết nối game server".
