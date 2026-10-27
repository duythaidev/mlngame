# 04 · Luật Firebase Realtime Database

Luật cũ cho **mọi người** ghi `roomList` (ai cũng tạo / xóa / bắt đầu được phòng). Luật mới:

| Đường dẫn | Ai ghi được |
|---|---|
| `admins` | không ai (chỉ sửa tay trong Firebase console) |
| `roomList/{phòng}` (tên, max, phase, level) | admin |
| `roomList/{phòng}/players/{uid}` | chính người đó (tên ≤ 20 ký tự) |
| `rooms/{phòng}` (allowed, xóa phòng) | admin |
| `rooms/{phòng}/slots/{ô}` | người chơi, chỉ ô có trong `allowed`, ô trống hoặc ô của mình, `uid` phải là của mình |

Hai nhánh cũ `pos` và `game` (thời chạy vật lý trên máy chủ phòng) đã bỏ — code không còn dùng.

**Thay toàn bộ** `docs/database.rules.json`:

````json
{
  "rules": {
    ".read": "auth != null",
    "admins": {
      ".write": false
    },
    "roomList": {
      "$roomId": {
        ".write": "auth != null && root.child('admins').child(auth.uid).val() === true",
        "players": {
          "$uid": {
            ".write": "auth != null && auth.uid === $uid",
            ".validate": "newData.isString() && newData.val().length <= 20"
          }
        }
      }
    },
    "rooms": {
      "$roomId": {
        ".write": "auth != null && root.child('admins').child(auth.uid).val() === true",
        ".read": "auth != null",
        "slots": {
          "$slot": {
            ".write": "auth != null && root.child('rooms').child($roomId).child('allowed').child($slot).val() === true && (!data.exists() || data.child('uid').val() === auth.uid)",
            ".validate": "!newData.exists() || (newData.child('uid').val() === auth.uid && newData.child('name').isString() && newData.child('name').val().length <= 20)"
          }
        }
      }
    }
  }
}
````

Rồi dán đúng nội dung file này vào Firebase console → Realtime Database → **Rules** → Publish.

✅ **Kiểm tra**

- Tab ẩn danh (người chơi): vào phòng được, nhưng gõ trong console `firebase.database().ref('roomList/x/phase').set('playing')` bị `PERMISSION_DENIED`.
- Tài khoản admin: tạo / xóa phòng, Bắt đầu / Dừng chạy được.
