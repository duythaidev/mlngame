# Spec — "Mỗi máy tự lái nhân vật của mình" (bỏ mô hình host)

- Ngày: 2026-10-21
- Trạng thái: chờ duyệt
- Thay thế: mô hình host-authoritative hiện tại (`rooms/{id}/inputs` + `rooms/{id}/state`)

## 1. Vấn đề

Hiện tại một trình duyệt (host = người ở ô nhỏ nhất) chạy toàn bộ vật lý. Người khác gửi phím bấm lên Firebase → host → Firebase → về lại mình. Đo thực tế:

- Host điều khiển mượt (vật lý chạy ngay trên máy host).
- Máy khách: mỗi phím bấm đi 2 vòng qua Firebase (RTT máy khách đo được ~155 ms), cộng thời gian chờ host gửi. Mọi cách che (ngoại suy, đoán trước) đều gây giật/kéo lùi; nội suy thì mượt nhưng trễ.
- Khi tab host bị trình duyệt hãm (bị ẩn/che), cả phòng đứng hình (log: 1.5 s host chỉ chạy 2 tick).

Firebase không chạy được code game liên tục (Realtime Database chỉ lưu và chuyển dữ liệu; Cloud Functions chạy theo sự kiện, cần gói Blaze). Nên vật lý phải chạy trong trình duyệt — nhưng không nhất thiết chỉ ở một máy.

## 2. Mục tiêu và tiêu chí thành công

| # | Tiêu chí | Cách kiểm |
|---|----------|-----------|
| G1 | Mọi người chơi điều khiển nhân vật của mình **ngay lập tức** (0 vòng mạng giữa phím bấm và chuyển động trên màn hình của mình) | Bấm phím ở máy khách bất kỳ: nhân vật chạy trong cùng khung hình |
| G2 | Nhân vật người khác chuyển động **mượt, không giật lùi** | Quay màn hình máy khách 30 s: vị trí người khác không bao giờ nhảy ngược chiều đang đi |
| G3 | Không còn "máy host": một tab bị ẩn chỉ làm **nhân vật của chính người đó** đứng yên, phần còn lại vẫn chạy | Ẩn tab một người → những người khác vẫn chơi bình thường |
| G4 | Giữ nguyên tính năng: dây nối chuỗi, kéo rơi dây chuyền, cứu người dưới hố, chồng người, bị đè đầu không nhảy, không đẩy nhau, Thua 1 s rồi cả nhóm về chỗ cũ, `restart.mp3` mọi máy, tiếng nhảy chỉ máy mình, chìa khóa, cửa, tự qua màn 3 s, level cuối bấm R về Level 1, admin xem thời gian hoàn thành | Danh sách kiểm thử mục 10 |
| G5 | Vẫn chạy trên Firebase gói Spark, không thêm server | — |

## 3. Không làm (non-goals)

- Dây **không** cần chính xác tuyệt đối giữa các máy: chấp nhận lệch ~0.1–0.2 s, cảm giác kéo hơi mềm (đã được người dùng đồng ý).
- Không chống gian lận (máy người chơi tự báo vị trí của mình).
- Không xem trực tiếp cho admin (đã bỏ; admin chỉ thấy thời gian hoàn thành).

## 4. Ý tưởng cốt lõi

Mỗi máy chạy **một thế giới vật lý của riêng mình** cho cả level:

- **Nhân vật của mình** = vật thể động (dynamic), điều khiển bằng phím, chịu trọng lực, va chạm, dây — chạy y hệt engine hiện tại.
- **Nhân vật người khác** = vật thể "kinematic" (không chịu lực, không bị đẩy), đặt theo vị trí người đó gửi lên, đã nội suy. Nhờ vậy mình vẫn đứng lên đầu họ được, bị họ chặn, và dây vẫn có điểm neo.
- Mỗi máy gửi **vị trí nhân vật của mình** lên Firebase ~20 lần/s (chỉ khi có thay đổi).
- Các sự kiện ảnh hưởng cả nhóm (chết, nhặt chìa, thắng, qua màn) đi qua **một node trạng thái chung** và được ghi bằng **transaction** của Firebase → ai đến trước thắng, mọi máy cùng thấy một kết quả ("một người xác nhận").

```
Máy A (s0)                         Firebase RTDB                        Máy B (s1)
──────────                         ─────────────                        ──────────
vật lý: s0 động, s1 kinematic  ──► rooms/{id}/pos/s0 (20 Hz) ──►  s0 kinematic (nội suy)
s1 kinematic (nội suy)        ◄──  rooms/{id}/pos/s1 (20 Hz) ◄──  vật lý: s1 động
             └───── transaction ──► rooms/{id}/game ◄── transaction ─────┘
                                   {lv, epoch, status, key, loseBy, ...}
```

## 5. Dữ liệu trên Firebase

### 5.1 `rooms/{id}/pos/{slot}` — vị trí do chủ ô ghi

Một chuỗi ngắn (giống codec `v2` hiện có):

```
v3|ms|epoch|x|y|vx|vy|flags
```

| Trường | Ý nghĩa |
|--------|---------|
| `ms` | Đồng hồ của máy gửi (`performance.now()` làm tròn ms) lúc lấy mẫu. Chỉ dùng để nội suy theo từng người, không so giữa các máy |
| `epoch` | Lượt chơi mà mẫu này thuộc về (xem 5.2). Bên nhận bỏ mẫu có `epoch` khác lượt hiện tại |
| `x,y,vx,vy` | Vị trí/vận tốc ×100, làm tròn |
| `flags` | bit 1 `grounded`, bit 2 `inDoor` (tâm đang trong vùng cửa), bit 4 `frozen` (đang đứng yên vì Thua) |

Ghi bằng `StateSender` hiện có: chỉ gửi khi đổi (change-key bỏ `ms`), nhắc lại mỗi 1 s, tối đa ~20 Hz (`minIntervalMs = 50`), tối đa 3 lần ghi chờ ack.
`onDisconnect().remove()` cho node này khi vào phòng.

### 5.2 `rooms/{id}/game` — trạng thái chung (ít khi đổi)

```ts
interface GameState {
  lv: string;          // level đang chơi
  epoch: number;       // lượt chơi: +1 mỗi lần restart / qua màn / đổi người trong phòng
  status: "play" | "lose" | "won";
  key: 0 | 1;          // đã có chìa khóa trong lượt này
  loseBy?: string;     // slot gây ra Thua
  at: number;          // giờ server (ms) lúc chuyển sang status hiện tại
  levelStart: number;  // giờ server lúc bắt đầu level (lượt đầu tiên của level) — để tính thời gian hoàn thành
}
```

Mọi thay đổi đi qua **một hàm thuần** `reduceGame(state, event, nowServer) → state | undefined` (undefined = không đổi, transaction hủy). Transaction gọi hàm này, nên hai máy gửi cùng lúc thì chỉ một thay đổi được áp dụng.

| Sự kiện (ai gửi) | Điều kiện | Kết quả |
|------------------|-----------|---------|
| `died{slot, epoch}` (máy có nhân vật chết) | `status=play` và `epoch` khớp | `status=lose, loseBy=slot, at=now` |
| `gotKey{epoch}` (máy có nhân vật chạm chìa) | `status=play`, `key=0`, `epoch` khớp | `key=1` |
| `allInDoor{epoch}` (điều phối viên) | `status=play`, `key=1`, `epoch` khớp | `status=won, at=now` |
| `restart{epoch}` (điều phối viên) | `status=lose`, `now − at ≥ 1000` | `status=play, epoch+1, key=0, at=now` |
| `nextLevel{epoch}` (điều phối viên) | `status=won`, `now − at ≥ 3000`, còn level kế | `lv=kế, epoch+1, status=play, key=0, at=now, levelStart=now` |
| `replay{epoch}` (điều phối viên, phím R) | `status=won` và (level cuối → về `LEVEL_IDS[0]`; không phải cuối → chơi lại level hiện tại) | `epoch+1, status=play, key=0, at=now` (+ `lv, levelStart` nếu về Level 1) |
| `rosterChanged{epoch}` (điều phối viên, khi danh sách ô đổi) | bất kỳ | `epoch+1, status=play, key=0, at=now` |
| `start{lv}` (máy bấm "Bắt đầu" ở sảnh) | luôn được | `lv` = level của phòng (`roomList/{id}/level`), `epoch+1` (hoặc 1 nếu chưa có), `status=play, key=0, at=now, levelStart=now` |

"Giờ server" = `Date.now() + offset` với `offset` đọc từ `.info/serverTimeOffset` của Firebase (có sẵn, miễn phí).

### 5.3 Điều phối viên (coordinator)

Không chạy vật lý cho ai. Chỉ là người **gửi các sự kiện định giờ / cần nhìn cả nhóm**: `allInDoor`, `restart`, `nextLevel`, `replay`, `rosterChanged`, và ghi thời gian hoàn thành cho admin.

- Là người ở **ô nhỏ nhất** đang có trong `slots` (giống quy tắc host cũ, mọi máy tự tính).
- Vì mọi sự kiện đều qua transaction có điều kiện, nếu điều phối viên rớt/ẩn tab, **bất kỳ máy nào** cũng được gửi `restart`/`nextLevel` khi đã quá hạn thêm 1.5 s (`now − at ≥ hạn + 1500`). Không có chuyện cả phòng kẹt vì một người.
- Thời gian hoàn thành: khi transaction `allInDoor` thành công, máy đã gửi nó ghi `roomList/{id}/results/{lv} = (at − levelStart)/1000` (1 chữ số thập phân). Rule đã có sẵn.

### 5.4 Node cũ

`rooms/{id}/inputs` và `rooms/{id}/state` không còn dùng. Xóa code đọc/ghi chúng; rules liên quan có thể giữ hoặc xóa (không ảnh hưởng).

### 5.5 Security rules thêm vào `rooms/$roomId`

```json
"pos": {
  "$slot": {
    ".write": "auth != null && root.child('rooms').child($roomId).child('slots').child($slot).child('uid').val() === auth.uid",
    ".validate": "newData.isString() && newData.val().length < 120"
  }
},
"game": {
  ".write": "auth != null && root.child('rooms').child($roomId).child('slots').exists()",
  ".validate": "newData.hasChildren(['lv', 'epoch', 'status', 'key', 'at', 'levelStart'])"
}
```

(`game` cho mọi người đã đăng nhập ghi khi phòng có người — tin cậy bạn bè như phần còn lại của demo.)

## 6. Vật lý trên mỗi máy

Engine giữ nguyên toàn bộ hằng số `PHYS` và các hàm `drive`, `applyRope`, `blocker`, `stepOverLedge`, `slippingOffEdge`. Thay đổi:

### 6.1 Hai loại actor

`GameEngine` nhận thêm danh sách ô do máy này điều khiển: `new GameEngine(level, slots, { local: string[] })`. Mặc định (không truyền) = mọi ô đều local → **Sandbox giữ nguyên hành vi** (2 người cùng bàn phím).

| | Actor local | Actor remote |
|-|-------------|--------------|
| Loại body | dynamic (như hiện tại) | kinematic, cùng hình dạng + cảm biến chân |
| Điều khiển | `drive()` từ phím | `setRemote(slot, x, y, vx, vy)` mỗi frame: đặt vị trí + vận tốc (để va chạm/dây thấy chuyển động đúng chiều) |
| Kiểm luật (gai, rơi hố, chìa, cửa) | Có, chỉ cho chính nó | Không |

Kinematic không bị đẩy, nên "không đẩy nhau được" vẫn đúng; đứng lên đầu người khác vẫn được (cảm biến chân thấy body kinematic); người khác đứng trên đầu mình vẫn chặn nhảy (cảm biến chân của body kinematic chạm body mình).

### 6.2 Dây chia đôi

Với mỗi đoạn dây A–B, máy chỉ tính các đoạn có **ít nhất một đầu là local**:

- Hai đầu local (Sandbox): như hiện tại.
- Một đầu local, một đầu remote: giải ràng buộc như hai vật cùng khối lượng, nhưng **chỉ áp phần xung lượng lên đầu local** (tức đầu local tự sửa một nửa độ giãn). Máy bên kia tự sửa nửa còn lại. Khi độ giãn vượt `PHYS.ropeMaxStretch`, phía local áp **toàn bộ** phần sửa → dây không bao giờ dài vô hạn trên bất kỳ máy nào.
- Hai đầu remote: bỏ qua (chỉ vẽ).

Hệ quả mong đợi (đã chấp nhận): người chạy kéo dây sẽ chậm lại một chút rồi người kia mới "bị kéo" theo trên máy họ sau ~1 vòng mạng; dây có cảm giác hơi đàn hồi.

### 6.3 Luật trên mỗi máy (chỉ actor local)

- Chạm gai / tụt khỏi đáy map → gửi `died`. Từ lúc gửi đến khi thấy `status=lose`, nhân vật local **đứng yên** (không chờ mạng mới dừng).
- Chạm chìa (khi `key=0`) → gửi `gotKey`. Chìa biến mất trên màn hình ngay khi `key=1` về.
- Tâm trong vùng cửa → bật bit `inDoor` trong `pos`.
- `status=lose` hoặc `won` → actor local đóng băng (giữ nguyên chỗ), hiển thị như hiện tại.
- `epoch` đổi → dựng lại thế giới: actor local về điểm xuất phát `spawn.x + chỉ số ô (theo thứ tự đã sắp xếp)`, xóa bộ đệm nội suy của mọi người.

### 6.4 Nội suy người khác

Mỗi người khác có một bộ đệm riêng (tổng quát hóa `SnapshotBuffer` hiện có): mẫu theo đồng hồ `ms` **của người gửi**, vẽ trễ `REMOTE_DELAY_MS = 80`, trượt tuyến tính giữa 2 mẫu, không ngoại suy, không trượt xuyên qua `epoch` khác. Vị trí nội suy vừa dùng để **vẽ**, vừa đưa vào engine qua `setRemote`.

## 7. Âm thanh và hoạt ảnh

| Sự kiện | Trước | Sau |
|---------|-------|-----|
| Nhảy | đếm `j` trong snapshot host | phát ngay khi engine local thực sự nhảy (không qua mạng) |
| Thua | `d` 0→1 trong snapshot | `status` chuyển sang `lose` (mọi máy, kể cả máy gây ra) |
| Thời gian hoạt ảnh Thua | `engine.lose.t` / đồng hồ cục bộ | `(giờ server − game.at)/1000` |
| Người gây ra (nháy đỏ) | `c` trong snapshot | `game.loseBy` |

## 8. Thay đổi theo file

| File | Thay đổi |
|------|----------|
| `src/game/engine.ts` | Thêm chế độ actor local/remote, `setRemote`, dây chia đôi, luật chỉ cho local; trong chế độ mạng engine **không tự restart** mà báo sự kiện (`died`, `gotKey`) qua callback và nhận `freeze()` / `respawn(epoch)` / `setKey(k)` từ ngoài. Chế độ toàn-local (Sandbox) giữ hành vi cũ |
| `src/net/gameState.ts` (mới) | `GameState`, `reduceGame()` thuần, hàm gửi sự kiện bằng `runTransaction` |
| `src/net/posCodec.ts` (mới) | encode/decode chuỗi `v3` cho `pos/{slot}` |
| `src/net/interpolate.ts` | Tổng quát `SnapshotBuffer` thành bộ đệm vị trí một người (`RemoteTrack`) |
| `src/components/GameCanvas.tsx` | Viết lại vòng lặp: engine local + nghe `pos/*` + nghe `game` + gửi `pos/{mySlot}` + điều phối viên. Bỏ mọi code `inputs`/`state`/host |
| `src/lib/rooms.ts` | `joinRoom`: thêm `onDisconnect` cho `pos/{slot}`; khởi tạo `game` khi phòng bắt đầu (`phase → playing`) nếu chưa có |
| `src/pages/Room.tsx` | Prop `isHost` → `isCoordinator` (chỉ đổi tên/ý nghĩa); nút R / "về sảnh" giữ |
| `src/net/codec.ts`, `stateSender.ts`, `netStats.ts` | `codec.ts` (v2) bỏ khi không còn dùng; `StateSender` dùng lại cho `pos`; `NetStats` dùng cho overlay `?net=1` (gửi/nhận mỗi giây, độ trễ mẫu người khác) |
| Firebase Rules | Thêm `pos`, `game` (mục 5.5) |

## 9. Giới hạn và rủi ro

| Rủi ro | Mức | Xử lý |
|--------|-----|-------|
| **Giới hạn ghi của RTDB (~1.000 ghi/s cho cả database)**: mỗi người đang di chuyển ghi 20 lần/s → phòng 4 người = 80 ghi/s | Trung bình | Đủ ~12 phòng 4 người cùng chạy liên tục; đứng yên thì gần 0. Nếu cần nhiều hơn: giảm còn 15 Hz (`minIntervalMs = 66`) |
| Băng thông tải xuống 10 GB/tháng | Thấp | 4 người × 20 Hz × 3 người nhận × ~60 B ≈ 15 KB/s ≈ 50 MB/giờ chơi |
| Hai máy thấy dây khác nhau (ví dụ máy A thấy B đã rơi, máy B thấy mình còn bám) | Đã chấp nhận | Chết chỉ do chính chủ nhân vật quyết định → không có "chết oan" do máy khác |
| Người đứng trên đầu người khác bị lệch khi người dưới chạy | Thấp | Đã không có "chở người trên đầu" từ trước; người trên tự đứng yên, người dưới trượt ra như hiện tại |
| Hai người cùng chạm chìa / cùng chết | Không | Transaction: chỉ một thay đổi |
| Điều phối viên rớt mạng giữa lúc Thua | Không | Ai cũng được gửi `restart` sau hạn + 1.5 s |
| Gian lận (sửa vị trí) | Bỏ qua | Ngoài phạm vi demo |

## 10. Kiểm thử

**Tự động (vitest):**
- `reduceGame`: mỗi dòng của bảng 5.2 (điều kiện đúng → kết quả; sai epoch/status → undefined); hai `died` liên tiếp chỉ đổi một lần; `restart` trước 1000 ms bị từ chối.
- `posCodec`: round-trip; chuỗi cũ/hỏng → `null`; độ dài < 120.
- `RemoteTrack`: nội suy tuyến tính; gói đến dồn không làm vị trí đi lùi; không trượt qua `epoch` khác.
- Engine chế độ mạng (chạy trong Node như các bot mô phỏng đã dùng): actor local không đẩy được actor remote; local đứng được trên đầu remote; remote đứng trên đầu local thì local không nhảy được; local chạm gai → callback `died` đúng 1 lần và actor đứng yên; dây chia đôi kéo local về phía remote và giãn không vượt `ropeRest + ropeMaxStretch`; chế độ toàn-local cho kết quả giống engine cũ (chạy lại bot 3 level: thắng, 0 lần chết).

**Thủ công (3 cửa sổ/3 máy, `?net=1`):**
- [ ] Máy khách bấm phím: chạy ngay (G1).
- [ ] Nhìn người khác chạy 30 s: không giật lùi (G2).
- [ ] Ẩn tab một người: người khác vẫn chơi; người bị ẩn đứng yên trên màn hình người khác (G3).
- [ ] Chạm gai ở máy bất kỳ: mọi máy "THUA!" + `restart.mp3`, 1 s sau cả nhóm về chỗ cũ.
- [ ] Nhặt chìa, cả nhóm vào cửa: mọi máy "HOÀN THÀNH", 3 s sau sang level kế; admin thấy thời gian.
- [ ] Level 3 thắng: điều phối viên bấm R (hoặc nút R trên điện thoại) → về Level 1.
- [ ] Kéo rơi dây chuyền, cứu người dưới hố, chồng người lấy chìa vẫn làm được (cảm giác dây mềm hơn là chấp nhận được).
- [ ] Rút mạng điều phối viên khi đang Thua: phòng vẫn restart sau ~2.5 s.

## 11. Thứ tự làm (gợi ý cho plan)

1. `reduceGame` + `posCodec` + `RemoteTrack` (thuần, test trước).
2. Engine: actor remote + dây chia đôi + chế độ báo sự kiện; giữ Sandbox chạy như cũ.
3. `GameCanvas` mới + `rooms.ts` + rules.
4. Điều phối viên + thời gian hoàn thành + âm thanh/hoạt ảnh.
5. Kiểm thử thủ công, đo `?net=1`.
