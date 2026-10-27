# 01 · Level còn 5 phần (repo `mlngame`)

Mỗi level còn **5 phần**. Một *phần* = 1 đoạn mở đầu + 0–2 đoạn **nối tiếp**. Đoạn nối tiếp vẫn có cột mốc hồi sinh (cờ nhỏ),
nhưng không có cổng mốc và không đổi khung tư liệu — thua ở cuối phần dài (vd 3.6 → 3.8) không bị đưa về đầu phần.
Hình học các đoạn giữ nguyên bản 4; chỉ **bỏ 8 đoạn**: 1.5, 1.7, 2.3, 2.7, 3.5, 4.4, 4.5, 5.3.

| Level | Phần 1 | Phần 2 | Phần 3 | Phần 4 | Phần 5 | Rộng (ô) |
|---|---|---|---|---|---|---|
| 1 | 1.1 | 1.2 | 1.3 | 1.4 | 1.6 + 1.8 | 217 |
| 2 | 2.1 | 2.2 | 2.4 | 2.5 | 2.6 + 2.8 | 238 |
| 3 | 3.1 | 3.2 | 3.3 | 3.4 | 3.6 + 3.7 + 3.8 | 280 |
| 4 | 4.1 | 4.2 | 4.3 | 4.6 | 4.7 + 4.8 | 238 |
| 5 | 5.1 | 5.2 | 5.4 | 5.5 | 5.6 | 236 |

## Bước 1 — Script sinh level

**Thay toàn bộ** `scripts/levels/levelgen.py`:

````python
# scripts/levels/levelgen.py
# Công cụ vẽ một đoạn level bằng lệnh (thay vì gõ tay 16 hàng ASCII).
# chapters.py dùng file này để sinh src/game/levelData.ts.
# Tọa độ trong đoạn: cột 0 = cột đầu của đoạn; hàng 0 = trần, hàng 11 = hàng đứng, hàng 12–15 = nền.
import json, re

# ký tự tự cấp cho vật thể (không trùng ký tự có nghĩa: # . ^ X K D S C)
POOL = "abcdefghijklmnopqrstuvwxyz0123456789!$%&*+?=:;<>{}|~@()[],/-_"


def ts(v):
    """Python → literal TypeScript gọn (khóa không có ngoặc kép)."""
    t = json.dumps(v, ensure_ascii=False, separators=(", ", ": "))
    return re.sub(r'"(\w+)": ', lambda m: m.group(1) + ": ", t)


class Seg:
    def __init__(s, w, start="C", sy=11):
        s.w = w
        s.g = [["."] * w for _ in range(16)]
        for x in range(w):
            s.g[0][x] = "#"
            for y in range(12, 16):
                s.g[y][x] = "#"
        if sy != 11:  # xuất phát trên nền cao: cột 0–6 đặc từ hàng sy+1 xuống
            s.fill(0, 6, sy + 1, 11, "#")
        s.g[sy][1] = start
        s.objs = {}
        s.sigs = {}
        s.door = None
        s.used = set()
        s.cont = False  # True = nối tiếp phần của đoạn trước

    # ---------------------------------------------------------------- vẽ địa hình
    def put(s, x, y, c):
        s.g[y][x] = c

    def fill(s, x0, x1, y0, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                s.g[y][x] = c

    def pit(s, x0, x1, y0=12):
        """Hố từ hàng y0 xuống đáy (rơi là thua)."""
        s.fill(x0, x1, y0, 15, ".")

    def dip(s, x0, x1):
        """Hầm sâu 1 ô (chỉ bỏ hàng 12)."""
        s.fill(x0, x1, 12, 12, ".")

    def ceiling(s, x0, x1, row):
        """Trần nguy hiểm: hàng 1..row-1 đặc, hàng `row` là vùng chết."""
        s.fill(x0, x1, 1, row - 1, "#")
        s.fill(x0, x1, row, row, "^")

    # ---------------------------------------------------------------- vật thể
    def _ch(s):
        for c in POOL:
            if c not in s.used:
                s.used.add(c)
                return c
        raise RuntimeError("hết ký tự vật thể trong đoạn")

    def area(s, spec, x0, x1, y0, y1):
        c = s._ch()
        s.fill(x0, x1, y0, y1, c)
        s.objs[c] = spec
        return c

    def cells(s, spec, pts):
        c = s._ch()
        for x, y in pts:
            s.put(x, y, c)
        s.objs[c] = spec
        return c

    def sign(s, x, y, label):
        s.cells({"t": "sign", "label": label}, [(x, y)])

    def pads(s, xs, sig, y=11, per=False, label=None):
        spec = {"t": "pad", "sig": sig}
        if per:
            spec["perPlayer"] = True
        if label:
            spec["label"] = label
        s.cells(spec, [(x, y) for x in xs])

    def gate(s, x, sig, y0=1, y1=11, label=None):
        spec = {"t": "gate", "sig": sig}
        if label:
            spec["label"] = label
        s.area(spec, x, x, y0, y1)

    def bridge(s, x0, x1, sig, any_=None, y=12):
        spec = {"t": "bridge", "sig": sig}
        if any_:
            spec["any"] = any_
        s.area(spec, x0, x1, y, y)

    def ice(s, x0, x1, y=12):
        s.area({"t": "ice"}, x0, x1, y, y)

    def conveyor(s, x0, x1, speed, y=12):
        s.area({"t": "conveyor", "speed": speed}, x0, x1, y, y)

    def crumble(s, x0, x1, y=12):
        s.area({"t": "crumble"}, x0, x1, y, y)

    def lift(s, x0, x1, rise, drop=False, need=None, y=12, label=None):
        spec = {"t": "lift", "rise": rise}
        if drop:
            spec["drop"] = True
        if need is not None:
            spec["need"] = need
        if label:
            spec["label"] = label
        s.area(spec, x0, x1, y, y)

    def mover(s, x0, w, path, stops=None, pads=False, y=12):
        spec = {"t": "mover", "path": path}
        if stops:
            spec["stops"] = stops
        if pads:
            spec["pads"] = True
        s.area(spec, x0, x0 + w - 1, y, y)

    def box(s, x, y, w, h, weight, sig=None, label=None):
        """(x, y) = ô trên-trái."""
        spec = {"t": "box", "weight": weight}
        if sig:
            spec["sig"] = sig
        if label:
            spec["label"] = label
        s.area(spec, x, x + w - 1, y, y + h - 1)

    def goal(s, x0, x1, y0, y1, sig, label=None):
        spec = {"t": "goal", "sig": sig}
        if label:
            spec["label"] = label
        s.area(spec, x0, x1, y0, y1)

    def hazard(s, x, y, w, h, path, speed, pause=0.5, extra=None):
        spec = {"t": "hazard", "path": path, "speed": speed, "pause": pause}
        if extra:
            spec["extra"] = extra
        s.area(spec, x, x + w - 1, y, y + h - 1)

    def seesaw(s, x0, x1, y=12):
        """Tấm bập bênh ở hàng y, cột trục (giữa) đặc từ hàng y+1 xuống đáy."""
        s.area({"t": "seesaw"}, x0, x1, y, y)
        mid = (x0 + x1) // 2
        s.fill(mid, mid, y + 1, 15, "#")

    def carry(s, kind, pts, to, text=None, per=False):
        spec = {"t": "carry", "kind": kind, "to": to}
        if text:
            spec["text"] = text
        if per:
            spec["perPlayer"] = True
        s.cells(spec, pts)

    def receiver(s, x0, x1, y0, y1, kind, sig, label=None):
        spec = {"t": "receiver", "kind": kind, "sig": sig}
        if label:
            spec["label"] = label
        s.area(spec, x0, x1, y0, y1)

    def doorway(s, x0, sig, y=11):
        """Cửa 5×2 có đáy ở hàng y; mở khi tín hiệu `sig` bật."""
        s.fill(x0, x0 + 4, y - 1, y, "D")
        s.door = sig

    def rows(s):
        return ["".join(r) for r in s.g]

    def check_spawn(s, name):
        """Chỗ hồi sinh (cột 1–5 ngay cạnh cột mốc) phải trống và có nền đứng được cho 5 người."""
        sy = next(y for y in range(16) if s.g[y][1] in "SC")
        for x in range(1, 6):
            if x != 1 and s.g[sy][x] != ".":
                raise ValueError(f"{name}: ô hồi sinh ({x},{sy}) bị chiếm bởi {s.g[sy][x]!r}")
            under = s.g[sy + 1][x]
            spec = s.objs.get(under)
            if under != "#" and not (spec and spec["t"] in ("ice", "conveyor")):
                raise ValueError(f"{name}: dưới ô hồi sinh ({x},{sy + 1}) không có nền ({under!r})")


def emit(chapters):
    out = [
        "// src/game/levelData.ts",
        "// SINH TỰ ĐỘNG bởi scripts/levels/chapters.py — sửa ở đó rồi chạy lại, không sửa tay file này.",
        "// Ký hiệu: # nền · . trống · X gai · ^ vùng chết · S xuất phát · C cột mốc · D cửa",
        "//          ký tự khác = vật thể khai báo trong objs của đoạn đó (xem ObjSpec trong level.ts).",
        'import type { ChapterDef } from "./level";',
        "",
        "export const CHAPTERS: ChapterDef[] = [",
    ]
    for cid, name, segs in chapters:
        for i, s in enumerate(segs):
            s.check_spawn(f"level {cid} đoạn {i + 1}")
        parts = [i for i, s in enumerate(segs) if not s.cont]
        if not parts or parts[0] != 0:
            raise ValueError(f"level {cid}: đoạn đầu phải mở một phần")
        out += ["  {", f"    id: {ts(cid)},", f"    name: {ts(name)},", f"    parts: {ts(parts)},", "    segments: ["]
        for i, s in enumerate(segs):
            out += [f"      // đoạn {i + 1}", "      {", "        rows: ["]
            out += [f"          {json.dumps(r)}," for r in s.rows()]
            out.append("        ],")
            if s.objs:
                out.append("        objs: {")
                out += [f"          {json.dumps(k)}: {ts(v)}," for k, v in s.objs.items()]
                out.append("        },")
            if s.sigs:
                out.append(f"        sigs: {ts(s.sigs)},")
            if s.door:
                out.append(f"        door: {ts(s.door)},")
            out.append("      },")
        out += ["    ],", "  },"]
    out.append("];")
    return "\n".join(out) + "\n"
````

**Thay toàn bộ** `scripts/levels/chapters.py`:

````python
# scripts/levels/chapters.py
# 5 level "Từ lịch sử đến câu trả lời" (spec: docs/superpowers/specs/2026-10-28-level-lich-su-v4-design.md).
# Sửa hình học ở đây rồi chạy (ở thư mục gốc mlngame):
#   python scripts/levels/chapters.py src/game/levelData.ts
# Mỗi khối "# x.y" là một đoạn (có một cột mốc C ở cột 1). Chữ hiển thị nằm trong src/game/story.ts.
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from levelgen import Seg, emit


def guided(s, x0, sections, path_row, sig_prefix):
    """Dãy nút dẫn đường (M10): cầu chia đoạn 4 ô ở hàng 12 trên hố, lối trên ở hàng path_row có nút trên mỗi đoạn.
    Nút i (đang đứng) bật đoạn cầu i−1, i, i+1. Trả về cột ngay sau đoạn cầu cuối."""
    end = x0 + 4 * sections - 1
    s.pit(x0, end)
    s.fill(x0 - 1, end + 1, path_row, path_row, "#")  # lối trên
    for i in range(sections):
        a = x0 + 4 * i
        me = f"{sig_prefix}{i}"
        near = [f"{sig_prefix}{j}" for j in (i - 1, i + 1) if 0 <= j < sections]
        s.bridge(a, a + 3, me, near)
        s.pads([a + 1], me, y=path_row - 1)
    return end + 1


def stairs_up(s, x, from_row, to_row):
    """Bậc thang 1 ô từ hàng đứng from_row lên tới mặt hàng to_row (mỗi bậc một cột)."""
    row = from_row
    while row > to_row:
        s.fill(x, x, row, 11, "#")
        x += 1
        row -= 1
    return x


C = []

# ====================================================================== LEVEL 1 · 1945–1946
L = []
# 1.1 — bậc, hố, vách 2 ô (chồng người + kéo dây)
s = Seg(36, "S")
s.fill(8, 11, 11, 11, "#")
s.pit(14, 15)
s.pit(19, 20)
s.fill(24, 35, 10, 11, "#")
L.append(s)

# 1.2 — băng chuyền ngược + gai (bắt đầu trên nền cao)
s = Seg(36, sy=9)
s.conveyor(10, 32, -2)
for x in (14, 22, 28):
    s.put(x, 11, "X")
L.append(s)

# 1.3 — phiếu bầu ở 5 chỗ khó
s = Seg(42)
s.fill(7, 9, 10, 11, "#")              # bục 2 ô (P1)
s.pit(12, 13)
s.pit(16, 17)                           # đảo 14–15 (P2)
s.hazard(20, 10, 1, 2, [[0, 0], [9, 0]], 3, 0.6)   # khối đỏ quét 20 → 29 (P3)
s.fill(32, 33, 10, 11, "#")            # bục 2 ô (P4)
s.pit(37, 38)                           # P5 treo trên hố
s.carry("ballot", [(8, 9), (14, 11), (25, 11), (32, 9), (37, 9)], "*B", per=True)
L.append(s)

# 1.4 — mang phiếu qua sàn sụp → hòm phiếu
s = Seg(37)
s.pit(6, 27)
for x in (8, 12, 16, 20, 24):
    s.crumble(x, x + 1)
s.receiver(31, 32, 10, 11, "ballot", "*B", "homphieu")
s.gate(35, "*B")
L.append(s)

# 1.6 — cột có nút giữa hố → cầu vàng → chìa trên bục 2 ô
s = Seg(38)
s.pit(6, 29)
for x in (8, 12, 16, 20, 24):
    s.fill(x, x + 1, 12, 15, "#")
s.pads([8, 12, 16, 20, 24], "A", per=True)
s.sigs["A"] = {"latch": True}
s.bridge(26, 29, "A")
s.fill(33, 34, 10, 11, "#")
s.carry("key", [(33, 9)], "*K")
L.append(s)

# 1.8 — cửa (người mang chìa chạm cửa)
s = Seg(26)
s.fill(6, 7, 11, 11, "#")
s.put(12, 11, "X")
s.doorway(17, "*K")
s.cont = True  # cùng phần với đoạn trước (giữ cột mốc hồi sinh, không có cổng mốc)
L.append(s)
C.append(("1", "1919–1946 · Nền móng", L))

# ====================================================================== LEVEL 2 · 1976–1986
L = []
# 2.1 — bục số lên gờ băng có khe
s = Seg(40, "S")
s.lift(7, 12, 3, drop=True)
s.fill(13, 39, 9, 11, "#")
s.ice(13, 22, 9)
s.pit(23, 24, 9)
s.put(23, 15, "X")
s.put(24, 15, "X")
s.ice(25, 31, 9)
L.append(s)

# 2.2 — cánh đồng băng, hố và gai
s = Seg(42)
s.ice(4, 9)
s.pit(10, 11)
s.ice(12, 21)
s.pit(22, 23)
s.ice(24, 31)
s.pit(32, 33)
s.ice(34, 38)
for x in (15, 27, 36):
    s.put(x, 11, "X")
L.append(s)

# 2.4 — băng chuyền xuôi vào gai + sàn sụp
s = Seg(36)
s.conveyor(4, 13, 2)
s.put(14, 11, "X")
s.pit(16, 27)
for x in (17, 21, 25):
    s.crumble(x, x + 1)
L.append(s)

# 2.5 — sàn chở có nút đi chéo, khối đỏ chữ L dập xuống
s = Seg(46)
s.pit(6, 37)
s.mover(6, 6, [[0, 0], [10, -4], [26, -4]], pads=True)
s.hazard(24, 4, 1, 1, [[0, 0], [0, 3]], 2, 0.8, extra=[0, -3, 1, 3])   # đầu dập 1×1 + cán phía trên
s.fill(38, 45, 8, 11, "#")
L.append(s)

# 2.6 — 3 mảnh chữ: bục 2 ô · bục 3 ô (khối làm bậc) · cuối băng chuyền ngược → khung chữ
s = Seg(46)
s.fill(7, 9, 10, 11, "#")
s.box(15, 11, 1, 1, 1)
s.fill(20, 22, 9, 11, "#")
s.conveyor(27, 37, -2)
s.carry("word", [(8, 9)], "*W", text="banchat")
s.carry("word", [(21, 8)], "*W", text="muctieu")
s.carry("word", [(37, 11)], "*W", text="dongluc")
s.receiver(41, 43, 9, 11, "word", "*W", "khungchu")
L.append(s)

# 2.8 — cửa (mở khi khung chữ đủ)
s = Seg(26)
s.fill(6, 6, 11, 11, "#")
s.put(11, 11, "X")
s.doorway(17, "*W")
s.cont = True  # cùng phần với đoạn trước (giữ cột mốc hồi sinh, không có cổng mốc)
L.append(s)
C.append(("2", "1976–1986 · Thống nhất và Đổi mới", L))

# ====================================================================== LEVEL 3 · 1991–1995
L = []
# 3.1 — hành lang, khối đỏ quét sát nền, hầm trú
s = Seg(44, "S")
s.ceiling(4, 43, 8)
for x0 in (7, 16, 25, 34):
    s.dip(x0, x0 + 4)
s.hazard(6, 11, 2, 1, [[0, 0], [34, 0]], 4, 0.4)
L.append(s)

# 3.2 — khối "2" rơi lấp hố làm cầu, khối "1" làm bậc lên vách 3 ô
s = Seg(36)
s.box(7, 11, 3, 1, 2)
s.pit(13, 15)
s.fill(13, 15, 14, 15, "#")
s.fill(13, 15, 13, 13, "X")
s.box(17, 11, 1, 1, 1)
s.fill(24, 35, 9, 11, "#")
L.append(s)

# 3.3 — ba bập bênh, đáy gai
s = Seg(38)
s.pit(6, 34)
s.fill(6, 34, 15, 15, "X")
s.seesaw(8, 14)
s.seesaw(17, 23)
s.seesaw(26, 32)
L.append(s)

# 3.4 — 3 mảnh chữ: dãy nút dẫn đường · bục số · băng chuyền ngược trên gờ → khung chữ
s = Seg(54)
stairs_up(s, 6, 11, 10)
s.fill(7, 7, 10, 11, "#")
guided(s, 9, 3, 9, "G")
s.carry("word", [(15, 6)], "*Y", text="cuadan")
s.lift(25, 30, 3, drop=True)
s.carry("word", [(27, 6)], "*Y", text="dodan")
s.fill(31, 53, 9, 11, "#")
s.conveyor(36, 47, -2, 9)
s.carry("word", [(47, 8)], "*Y", text="vidan")
s.receiver(50, 51, 6, 8, "word", "*Y", "khungchu")
s.gate(52, "*Y", y1=8)
L.append(s)

# 3.6 — sàn chở có nút dưới trần nguy hiểm, 2 đầu dập
s = Seg(48)
s.pit(6, 43)
s.mover(6, 6, [[0, 0], [17, 0], [25, -2], [32, -2]], pads=True)
s.ceiling(6, 21, 9)
s.ceiling(22, 43, 7)
s.hazard(16, 10, 1, 1, [[0, 0], [0, 1]], 1.5, 0.8)
s.hazard(32, 8, 1, 1, [[0, 0], [0, 1]], 1.5, 0.8)
s.fill(44, 47, 10, 11, "#")
L.append(s)

# 3.7 — chìa trên bục nổi 2 ô (chồng người), gai hai bên
s = Seg(32)
s.put(8, 11, "X")
s.fill(11, 13, 10, 10, "#")
s.carry("key", [(12, 9)], "*K")
s.put(18, 11, "X")
s.pit(22, 23)
s.cont = True  # cùng phần với đoạn trước (giữ cột mốc hồi sinh, không có cổng mốc)
L.append(s)

# 3.8 — cửa
s = Seg(26)
s.fill(7, 8, 11, 11, "#")
s.put(11, 11, "X")
s.doorway(17, "*K")
s.cont = True  # cùng phần với đoạn trước (giữ cột mốc hồi sinh, không có cổng mốc)
L.append(s)
C.append(("3", "1991–1995 · Hình thành khái niệm", L))

# ====================================================================== LEVEL 4 · 2001–2022
L = []
# 4.1 — chuỗi sàn sụp trên hố gai
s = Seg(40, "S")
s.pit(6, 36)
s.fill(6, 36, 15, 15, "X")
for x in range(7, 36, 3):
    s.crumble(x, x + 1)
L.append(s)

# 4.2 — 3 nút có nhãn cách nhau 4 ô; khối "1" đè nút khi thiếu người → cổng
s = Seg(34)
s.box(7, 11, 1, 1, 1)
s.pads([10], "A", label="lapphap")
s.pit(11, 12)
s.pads([14], "A", label="hanhphap")
s.pit(16, 17)
s.pads([18], "A", label="tuphap")
s.sigs["A"] = {"latch": True}
s.pit(21, 22)
s.gate(26, "A", label="du3nut")
L.append(s)

# 4.3 — vạch ranh giới + hai bập bênh
s = Seg(40)
s.ceiling(3, 37, 8)
s.sign(2, 9, "ranhgioi")
s.pit(6, 24)
s.seesaw(8, 14)
s.seesaw(17, 23)
L.append(s)

# 4.6 — khối "cả nhóm" trên băng phải dừng đúng ô đích; khối đỏ quét ngang
s = Seg(40)
s.ice(3, 34)
s.box(8, 10, 2, 2, "all", sig="G", label="kiemsoat")
s.goal(25, 26, 10, 11, "G", "dich")
s.hazard(12, 10, 1, 2, [[0, 0], [10, 0]], 3, 1.5)
s.gate(37, "G")
L.append(s)

# 4.7 — sàn chở có nút, trạm dừng, khối đỏ quét qua sàn, đầu dập ở đoạn leo
s = Seg(50)
s.pit(6, 41)
s.mover(6, 6, [[0, 0], [10, 0], [16, -3], [30, -3]], stops=[1], pads=True)
s.hazard(14, 11, 1, 1, [[0, 0], [10, 0]], 4, 0.3)
s.hazard(32, 5, 1, 1, [[0, 0], [0, 2.5]], 2, 0.8, extra=[0, -4, 1, 4])
s.fill(42, 49, 9, 11, "#")
L.append(s)

# 4.8 — chìa trên bục 3 ô (khối làm bậc + chồng người) → cửa trên bục
s = Seg(32)
s.box(8, 11, 1, 1, 1)
s.fill(18, 31, 9, 11, "#")
s.carry("key", [(19, 8)], "*K")
s.doorway(24, "*K", y=8)
s.cont = True  # cùng phần với đoạn trước (giữ cột mốc hồi sinh, không có cổng mốc)
L.append(s)
C.append(("4", "2001–2022 · Hiến định và hoàn thiện", L))

# ====================================================================== LEVEL 5 · Câu trả lời
L = []
# 5.1 — bục số lên gờ băng, sàn sụp qua khe gai
s = Seg(44, "S")
s.lift(6, 11, 3, drop=True)
s.fill(12, 43, 9, 11, "#")
s.ice(12, 20, 9)
s.pit(21, 26, 9)
s.fill(21, 26, 15, 15, "X")
s.crumble(21, 22, 9)
s.crumble(25, 26, 9)
s.put(33, 8, "X")
L.append(s)

# 5.2 — vạch ranh giới + bập bênh giữa hai băng chuyền ngược
s = Seg(40)
s.ceiling(3, 37, 8)
s.conveyor(3, 7, -2)
s.pit(8, 9)
s.seesaw(10, 16)
s.pit(17, 18)
s.conveyor(19, 27, -2)
s.put(31, 11, "X")
L.append(s)

# 5.4 — vùng chậm chắn hố; đẩy khối "bãi bỏ" trên băng dừng đúng ô đích
s = Seg(46)
s.conveyor(4, 12, -2)
s.ice(14, 26)
s.box(15, 10, 2, 2, 2, sig="T", label="baibo")
s.goal(22, 23, 10, 11, "T", "dich")
s.area({"t": "slow", "sig": "T", "label": "thutuc"}, 28, 39, 8, 11)
s.pit(32, 33)
L.append(s)

# 5.5 — sàn chở có nút đi chéo dưới trần hạ dần, 2 đầu dập, trạm dừng
s = Seg(52)
s.pit(6, 45)
s.mover(6, 6, [[0, 0], [8, 0], [16, -3], [24, -3], [34, -3]], stops=[3], pads=True)
s.ceiling(6, 13, 9)
s.ceiling(14, 45, 6)
s.hazard(11, 10, 1, 1, [[0, 0], [0, 1]], 1.5, 0.8)
s.hazard(35, 7, 1, 1, [[0, 0], [0, 1]], 1.5, 0.6)
s.fill(46, 51, 9, 11, "#")
L.append(s)

# 5.6 — chìa "câu trả lời" trên bục 3 ô → sàn sụp → bập bênh → cửa
s = Seg(52)
s.box(6, 11, 1, 1, 1)
s.fill(13, 15, 9, 11, "#")
s.carry("key", [(14, 8)], "*K")
s.pit(18, 25)
s.crumble(19, 20)
s.crumble(23, 24)
s.pit(28, 37)
s.seesaw(30, 36)
s.doorway(44, "*K")
L.append(s)
C.append(("5", "Câu trả lời", L))

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "src/game/levelData.ts"
    open(out, "w", encoding="utf-8", newline="\n").write(emit(C))
    print("ok", [sum(x.w for x in segs) for _, _, segs in C])
````

Chạy (ở thư mục `mlngame`):

```bash
python scripts/levels/chapters.py src/game/levelData.ts
```

In ra đúng: `ok [215, 236, 278, 236, 234]` (độ rộng 5 level, chưa tính 2 cột vách). File `src/game/levelData.ts` được ghi lại — **không sửa tay**.

## Bước 2 — `level.ts` biết phần

**Thay toàn bộ** `src/game/level.ts`:

````ts
// src/game/level.ts
import { CHAPTERS } from "./levelData";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Số người cần: một con số cố định, hoặc "all" = tất cả nguồn đang bật (thường = số người chơi). */
export type Need = number | "all";

/**
 * Vật thể đặt trong level bằng một chữ thường trong lưới ASCII.
 * Các ô cùng chữ: loại "vùng" (xem AREA) gộp thành MỘT hình chữ nhật;
 * loại "ô" (pad, carry, sign) thì mỗi ô là một vật, đánh số k theo thứ tự x tăng dần.
 * label / text là KHÓA tra trong src/game/story.ts (không có khóa thì hiện nguyên chữ).
 */
export type ObjSpec =
  | { t: "pad"; sig: string; label?: string; perPlayer?: boolean } // nút đỏ: người hoặc khối đè lên = đang bấm
  | { t: "gate"; sig: string; label?: string } // khối đặc, biến mất khi sig bật
  | { t: "bridge"; sig: string; any?: string[]; label?: string } // chỉ hiện khi sig (hoặc một trong `any`) bật
  | { t: "ice" } // sàn băng (đặc, trơn cố định)
  | { t: "slow"; sig?: string; label?: string } // vùng chậm (không đặc); sig bật → biến mất
  | { t: "lift"; rise: number; need?: Need; drop?: boolean; label?: string } // thang / bục số (drop: thiếu người là hạ)
  | { t: "mover"; path: [number, number][]; need?: Need; stops?: number[]; pads?: boolean; label?: string } // sàn chở
  | { t: "box"; weight: Need; sig?: string; label?: string } // khối số: đủ `weight` người đẩy mới đi; có trọng lực
  | { t: "goal"; sig: string; label?: string } // ô đích của khối (không đặc)
  | { t: "conveyor"; speed: number } // băng chuyền (đặc): + sang phải, − sang trái (ô/s)
  | { t: "crumble" } // sàn sụp
  | { t: "hazard"; path: [number, number][]; speed: number; pause?: number; extra?: [number, number, number, number] } // khối đỏ di chuyển
  | { t: "seesaw" } // bập bênh: tấm 1 hàng, trục ở giữa
  | { t: "carry"; kind: "ballot" | "key" | "word"; to: string; text?: string; perPlayer?: boolean } // vật mang trên đầu
  | { t: "receiver"; kind: "ballot" | "word"; sig: string; label?: string } // hòm phiếu / khung chữ
  | { t: "sign"; label: string }; // biển chữ ngắn

/** Luật của một tín hiệu. Mặc định: need "all", không giữ (tắt khi hết đủ người), không chờ. */
export interface SigSpec {
  need?: Need;
  latch?: boolean; // đã bật thì bật mãi (tới khi chơi lại level)
  padLatch?: boolean; // mỗi nút đã có người đứng thì nhớ "đã bấm" (không cần đứng cùng lúc)
  hold?: number; // phải đủ người liên tục chừng này giây mới bật
}

export interface SegmentDef {
  rows: string[]; // đúng 16 hàng, mọi hàng cùng độ dài
  objs?: Record<string, ObjSpec>;
  sigs?: Record<string, SigSpec>;
  door?: string; // tên tín hiệu (trong đoạn này) mở cửa cuối level
}

export interface ChapterDef {
  id: string;
  name: string;
  /** Chỉ số đoạn mở đầu mỗi phần (có cổng mốc + ảnh tư liệu). Không có = mỗi đoạn một phần. */
  parts?: number[];
  segments: SegmentDef[];
}

export interface ObjDef {
  id: number; // chỉ số trong level.objects
  seg: number; // đoạn chứa vật
  k: number; // thứ tự trong nhóm cùng chữ (x tăng dần)
  of: number; // số vật trong nhóm cùng chữ
  spec: ObjSpec; // tên sig đã gắn tiền tố đoạn: "<đoạn>.<tên>"
  rect: Rect;
}

export interface Checkpoint {
  x: number; // cột của ô C (hoặc S)
  y: number; // hàng của ô C
  seg: number;
}

export interface Level {
  id: string;
  name: string;
  w: number; // số cột
  h: number; // số hàng
  solids: Rect[];
  spikes: Rect[];
  hazards: Rect[]; // ô "^": chạm là thua (vùng trần chết)
  key: Rect | null;
  door: Rect | null;
  spawn: { x: number; y: number };
  checkpoints: Checkpoint[]; // [0] = điểm xuất phát
  segCount: number;
  segX: number[]; // cột bắt đầu của từng đoạn
  partOf: number[]; // đoạn → phần (0-based)
  partCount: number;
  objects: ObjDef[];
  sigs: Record<string, SigSpec>;
  sigNames: string[]; // sắp xếp — thứ tự bit tín hiệu trong snapshot
  doorSig: string | null; // null = cửa mở bằng chìa khóa K (level cũ)
  bitOf: number[]; // object id → vị trí bit trạng thái (-1 = không có)
  bodyOf: number[]; // object id → vị trí trong danh sách thân di động (-1 = không có)
  angleOf: number[]; // object id → vị trí trong danh sách góc bập bênh (-1 = không có)
  carryOf: number[]; // object id → vị trí trong chuỗi trạng thái vật mang (-1 = không có)
  crumbleOf: number[]; // object id → vị trí trong danh sách sàn sụp (-1 = không có)
  bitCount: number;
  bodyCount: number;
  angleCount: number;
  carryCount: number;
  crumbleCount: number;
}

// Quy ước: mọi level cao đúng 16 hàng (canvas giữ nguyên kích thước khi qua màn).
// Giới hạn khả năng (đã đo trên engine):
//  - nhảy một mình lên được bậc cao ≤ 1 ô; chồng 2 người lên được bục cao 2 ô
//  - nhảy xa vượt được hố ≤ 2 ô và gai đơn (1 ô); gai rộng 2 ô liền nhau thì KHÔNG nhảy qua được
//  - người đứng trên cao đi ra xa sẽ kéo người dưới bục lên nhờ dây
const TRAINING: Record<string, { name: string; rows: string[] }> = {
  t1: {
    name: "Luyện tập 1 — Khởi động",
    rows: [
      "########################################",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#.............................K........#",
      "#...........................####.DDDDD.#",
      "#.S...................X..........DDDDD.#",
      "###########..###########################",
      "###########..###########################",
      "###########..###########################",
      "###########..###########################",
    ],
  },
  t2: {
    name: "Luyện tập 2 — Hố và gai",
    rows: [
      "################################################",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#...................................K..........#",
      "#.................................####...DDDDD.#",
      "#.S.....##..........X.............####...DDDDD.#",
      "##############..#########..#####################",
      "##############..#########..#####################",
      "##############..#########..#####################",
      "##############..#########..#####################",
    ],
  },
};

/** Ký tự có nghĩa cố định; mọi ký tự khác là vật thể khai báo trong objs của đoạn. */
const RESERVED = new Set(["#", ".", "^", "X", "K", "D", "S", "C"]);

const AREA = new Set(["gate", "bridge", "ice", "slow", "lift", "mover", "box", "goal", "conveyor", "crumble", "hazard", "seesaw", "receiver"]);

/** Gộp các ô thành dải ngang, rồi gộp dải giống nhau nằm liền nhau (vách không còn khe → không mắc khi trượt). */
function mergeCells(cells: { x: number; y: number }[]): Rect[] {
  const set = new Set(cells.map((c) => `${c.x},${c.y}`));
  const rows = [...new Set(cells.map((c) => c.y))].sort((a, b) => a - b);
  const runs: Rect[] = [];
  for (const y of rows) {
    const xs = cells.filter((c) => c.y === y).map((c) => c.x).sort((a, b) => a - b);
    let start = -1;
    for (let i = 0; i <= xs.length; i++) {
      const x = xs[i];
      if (start < 0) start = x;
      if (i === xs.length || !set.has(`${x + 1},${y}`)) {
        if (i < xs.length) runs.push({ x: start, y, w: x - start + 1, h: 1 });
        start = -1;
      }
    }
  }
  const merged: Rect[] = [];
  for (const r of runs) {
    const above = merged.find((m) => m.x === r.x && m.w === r.w && m.y + m.h === r.y);
    if (above) above.h += 1;
    else merged.push({ ...r });
  }
  return merged;
}

/** Đoạn → phần theo def.parts (chỉ số đoạn mở đầu mỗi phần, tăng dần, bắt đầu từ 0). */
function partsOf(def: ChapterDef): { partOf: number[]; partCount: number } {
  const starts = def.parts ?? def.segments.map((_, i) => i);
  if (starts[0] !== 0 || starts.some((s, i) => i > 0 && s <= starts[i - 1]) || starts[starts.length - 1] >= def.segments.length)
    throw new Error(`Level ${def.id}: parts phải tăng dần, bắt đầu từ 0 và nhỏ hơn số đoạn`);
  const partOf = def.segments.map((_, si) => starts.filter((s) => s <= si).length - 1);
  return { partOf, partCount: starts.length };
}

/** Phần (0-based) chứa cột mốc hiện tại của nhóm. */
export function partAt(level: Level, cp: number): number {
  return level.partOf[level.checkpoints[cp]?.seg ?? 0] ?? 0;
}

/** Ghép các đoạn theo chiều ngang (thêm vách trái/phải) rồi dựng Level. Xuất ra để test dựng level riêng. */
export function buildLevel(def: ChapterDef): Level {
  const H = 16;
  const offsets: number[] = [];
  let w = 1; // cột 0 = vách trái
  def.segments.forEach((s, i) => {
    if (s.rows.length !== H) throw new Error(`Level ${def.id} đoạn ${i + 1}: cần ${H} hàng, có ${s.rows.length}`);
    const sw = s.rows[0].length;
    s.rows.forEach((r, y) => {
      if (r.length !== sw) throw new Error(`Level ${def.id} đoạn ${i + 1} hàng ${y}: dài ${r.length}, cần ${sw}`);
    });
    offsets.push(w);
    w += sw;
  });
  w += 1; // vách phải
  const solidCells: { x: number; y: number }[] = [];
  const hazardCells: { x: number; y: number }[] = [];
  const spikes: Rect[] = [];
  const checkpoints: Checkpoint[] = [];
  const objects: ObjDef[] = [];
  const sigs: Record<string, SigSpec> = {};
  let spawn: { x: number; y: number } | null = null;
  let key: Rect | null = null;
  let door: Rect | null = null;
  let doorSig: string | null = null;
  const doorCells: { x: number; y: number }[] = [];

  for (let y = 0; y < H; y++) {
    solidCells.push({ x: 0, y }, { x: w - 1, y });
  }

  def.segments.forEach((s, si) => {
    const ox = offsets[si];
    // tên tín hiệu: "*TÊN" = dùng chung cả level (vd phiếu nhặt ở đoạn 3, nộp ở đoạn 4); còn lại riêng từng đoạn
    const pre = (name: string) => (name.startsWith("*") ? name : `${si}.${name}`);
    for (const [name, spec] of Object.entries(s.sigs ?? {})) sigs[pre(name)] = spec;
    if (s.door) doorSig = pre(s.door);

    const letters = new Map<string, { x: number; y: number }[]>();
    s.rows.forEach((row, y) => {
      for (let cx = 0; cx < row.length; cx++) {
        const c = row[cx];
        const x = ox + cx;
        if (c === "#") solidCells.push({ x, y });
        else if (c === "^") hazardCells.push({ x, y });
        else if (c === "X") spikes.push({ x, y, w: 1, h: 1 });
        else if (c === "K") key = { x, y, w: 1, h: 1 };
        else if (c === "D") doorCells.push({ x, y });
        else if (c === "S") {
          spawn = { x: x + 0.5, y: y + 0.5 };
          checkpoints.unshift({ x, y, seg: si });
        } else if (c === "C") checkpoints.push({ x, y, seg: si });
        else if (!RESERVED.has(c)) {
          if (!s.objs?.[c]) throw new Error(`Level ${def.id} đoạn ${si + 1}: ký tự "${c}" chưa khai báo trong objs`);
          const list = letters.get(c) ?? [];
          list.push({ x, y });
          letters.set(c, list);
        }
      }
    });

    for (const [c, cells] of letters) {
      const raw = s.objs![c];
      const spec = { ...raw } as ObjSpec;
      if ("sig" in spec && spec.sig) (spec as { sig: string }).sig = pre(spec.sig);
      if (spec.t === "carry") spec.to = pre(spec.to);
      if (spec.t === "bridge" && spec.any) spec.any = spec.any.map(pre);
      if (AREA.has(spec.t)) {
        const xs = cells.map((p) => p.x);
        const ys = cells.map((p) => p.y);
        const rect = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
        if (rect.w * rect.h !== cells.length) throw new Error(`Level ${def.id} đoạn ${si + 1}: chữ "${c}" phải là một hình chữ nhật kín`);
        objects.push({ id: 0, seg: si, k: 0, of: 1, spec, rect });
      } else {
        [...cells]
          .sort((a, b) => a.x - b.x || a.y - b.y)
          .forEach((p, k) => objects.push({ id: 0, seg: si, k, of: cells.length, spec, rect: { x: p.x, y: p.y, w: 1, h: 1 } }));
      }
    }
  });

  if (!spawn) throw new Error(`Level ${def.id}: thiếu ô S`);
  if (doorCells.length) {
    const xs = doorCells.map((p) => p.x);
    const ys = doorCells.map((p) => p.y);
    door = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
  }
  checkpoints.sort((a, b) => a.x - b.x);

  return finish({
    id: def.id,
    name: def.name,
    w,
    h: H,
    solids: mergeCells(solidCells),
    spikes,
    hazards: mergeCells(hazardCells),
    key,
    door,
    spawn,
    checkpoints,
    segCount: def.segments.length,
    segX: offsets,
    ...partsOf(def),
    objects,
    sigs,
    doorSig,
  });
}

type LevelCore = Omit<
  Level,
  | "sigNames"
  | "bitOf"
  | "bodyOf"
  | "angleOf"
  | "carryOf"
  | "crumbleOf"
  | "bitCount"
  | "bodyCount"
  | "angleCount"
  | "carryCount"
  | "crumbleCount"
>;

/** Đánh số vật thể, gom tên tín hiệu, tính vị trí trạng thái trong snapshot (dùng chung cho engine và client). */
function finish(core: LevelCore): Level {
  core.objects.forEach((o, i) => (o.id = i));
  const names = new Set(Object.keys(core.sigs));
  for (const o of core.objects) {
    if ("sig" in o.spec && o.spec.sig) names.add(o.spec.sig);
    if (o.spec.t === "carry") names.add(o.spec.to);
  }
  const bitOf: number[] = [];
  const bodyOf: number[] = [];
  const angleOf: number[] = [];
  const carryOf: number[] = [];
  const crumbleOf: number[] = [];
  let bits = 0;
  let bodies = 0;
  let angles = 0;
  let carries = 0;
  let crumbles = 0;
  for (const o of core.objects) {
    const t = o.spec.t;
    bitOf.push(t === "pad" || t === "box" || t === "crumble" ? bits++ : -1);
    bodyOf.push(t === "lift" || t === "mover" || t === "box" || t === "hazard" ? bodies++ : -1);
    angleOf.push(t === "seesaw" ? angles++ : -1);
    carryOf.push(t === "carry" ? carries++ : -1);
    crumbleOf.push(t === "crumble" ? crumbles++ : -1);
  }
  return {
    ...core,
    sigNames: [...names].sort(),
    bitOf,
    bodyOf,
    angleOf,
    carryOf,
    crumbleOf,
    bitCount: bits,
    bodyCount: bodies,
    angleCount: angles,
    carryCount: carries,
    crumbleCount: crumbles,
  };
}

/** Định dạng cũ: một lưới có sẵn vách, chìa khóa K mở cửa (level luyện tập). */
function parseTraining(id: string, name: string, rows: string[]): Level {
  const h = rows.length;
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`Level ${id}: hàng ${i} dài ${r.length}, cần ${w}`);
  });
  const solidCells: { x: number; y: number }[] = [];
  const spikes: Rect[] = [];
  const doorCells: { x: number; y: number }[] = [];
  let key: Rect | null = null;
  let spawn = { x: 2, y: 2 };
  let sx = 1;
  let sy = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c === "#") solidCells.push({ x, y });
      if (c === "X") spikes.push({ x, y, w: 1, h: 1 });
      if (c === "K") key = { x, y, w: 1, h: 1 };
      if (c === "D") doorCells.push({ x, y });
      if (c === "S") {
        spawn = { x: x + 0.5, y: y + 0.5 };
        sx = x;
        sy = y;
      }
    }
  }
  const xs = doorCells.map((p) => p.x);
  const ys = doorCells.map((p) => p.y);
  const door = doorCells.length
    ? { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 }
    : null;
  return finish({
    id,
    name,
    w,
    h,
    solids: mergeCells(solidCells),
    spikes,
    hazards: [],
    key,
    door,
    spawn,
    checkpoints: [{ x: sx, y: sy, seg: 0 }],
    segCount: 1,
    segX: [0],
    partOf: [0],
    partCount: 1,
    objects: [],
    sigs: {},
    doorSig: null,
  });
}

const LEVELS: Record<string, Level> = {
  ...Object.fromEntries(CHAPTERS.map((c) => [c.id, buildLevel(c)])),
  ...Object.fromEntries(Object.entries(TRAINING).map(([id, l]) => [id, parseTraining(id, l.name, l.rows)])),
};

/** Thứ tự các level chính (qua màn tự động theo thứ tự này). Level luyện tập không nằm trong danh sách. */
export const LEVEL_IDS = CHAPTERS.map((c) => c.id);
export const TRAINING_IDS = Object.keys(TRAINING);

export function getLevel(id: string): Level {
  return LEVELS[id] ?? LEVELS[LEVEL_IDS[0]];
}

/** Level kế tiếp, hoặc null nếu đây là level cuối (level luyện tập luôn là cuối). */
export function nextLevelId(id: string): string | null {
  const i = LEVEL_IDS.indexOf(id);
  return i >= 0 && i + 1 < LEVEL_IDS.length ? LEVEL_IDS[i + 1] : null;
}
````

## Bước 3 — Test cũ

**Sửa** `src/game/mechanics.test.ts` — 1 chỗ (mỗi chỗ: tìm đúng đoạn TÌM, thay bằng đoạn THAY):

1. TÌM:

````ts
        expect(L.segCount).toBeGreaterThanOrEqual(6);
````

   THAY bằng:

````ts
        expect(L.segCount).toBeGreaterThanOrEqual(5);
        expect(L.partCount).toBe(5);
````


✅ **Kiểm tra**

```bash
npx vitest run src/game/mechanics.test.ts
```

Xanh hết (10 test "5 level dựng được…" cho 2 và 5 người). `tsc` sẽ còn đỏ tới hết file 02 — bình thường.
