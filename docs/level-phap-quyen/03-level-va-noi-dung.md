# 03 — Level và nội dung chữ (repo `mlngame`)

Hình học 5 level **không gõ tay**: viết bằng lệnh Python (`scripts/levels/chapters.py`, dùng công cụ `levelgen.py`), script sinh ra `src/game/levelData.ts`.
Mỗi khối `# x.y` trong `chapters.py` là một đoạn, khớp mục 7 của spec. Muốn sửa level: sửa `chapters.py` rồi chạy lại (file 08).

## Bước 1 — Công cụ vẽ đoạn

Lệnh vẽ: `pit` (hố), `dip` (hầm sâu 1 ô), `ceiling` (trần nguy hiểm), `pads`, `gate`, `bridge`, `ice`, `conveyor`, `crumble`, `lift`, `mover`, `box`, `goal`,
`hazard`, `seesaw` (kèm cột trục), `carry`, `receiver`, `sign`, `doorway`. `check_spawn` báo lỗi nếu chỗ hồi sinh (cột 1–5 sau cột mốc) không an toàn.

**Tạo mới / thay toàn bộ** `scripts/levels/levelgen.py` (216 dòng):

```python
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
        out += ["  {", f"    id: {ts(cid)},", f"    name: {ts(name)},", "    segments: ["]
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
```

## Bước 2 — 5 level

Các hàm phụ: `guided()` = dãy nút dẫn đường (cầu chia đoạn 4 ô + lối trên cao hơn 3 ô có nút trên từng đoạn); `stairs_up()` = bậc thang 1 ô.

**Tạo mới / thay toàn bộ** `scripts/levels/chapters.py` (445 dòng):

```python
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

# 1.5 — hai bập bênh trên hố
s = Seg(35)
s.pit(6, 25)
s.seesaw(8, 14)
s.seesaw(17, 23)
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

# 1.7 — dãy nút dẫn đường (người dẫn đi lối trên)
s = Seg(40)
x = stairs_up(s, 6, 11, 10)            # bậc (6,11) → lối trên hàng 9
s.fill(7, 7, 10, 11, "#")
end = guided(s, 10, 6, 9, "G")
L.append(s)

# 1.8 — cửa (người mang chìa chạm cửa)
s = Seg(26)
s.fill(6, 7, 11, 11, "#")
s.put(12, 11, "X")
s.doorway(17, "*K")
L.append(s)
C.append(("1", "1945–1946 · Nền móng", L))

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

# 2.3 — bập bênh giữa hai bờ băng
s = Seg(36)
s.ice(3, 6)
s.pit(7, 8)
s.seesaw(9, 15)
s.pit(16, 17)
s.ice(18, 26)
s.put(23, 11, "X")
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

# 2.7 — trần hạ dần + sàn sụp liền
s = Seg(36)
s.ceiling(5, 13, 7)
s.ceiling(14, 23, 9)
s.ceiling(24, 35, 10)
s.put(9, 11, "X")
s.pit(25, 32)
for x in (25, 27, 29, 31):
    s.crumble(x, x + 1)
L.append(s)

# 2.8 — cửa (mở khi khung chữ đủ)
s = Seg(26)
s.fill(6, 6, 11, 11, "#")
s.put(11, 11, "X")
s.doorway(17, "*W")
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

# 3.5 — sàn sụp xen gai
s = Seg(32)
s.pit(6, 9)
s.crumble(7, 8)
s.put(12, 11, "X")
s.pit(14, 21)
s.crumble(15, 16)
s.crumble(19, 20)
s.put(25, 11, "X")
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
L.append(s)

# 3.8 — cửa
s = Seg(26)
s.fill(7, 8, 11, 11, "#")
s.put(11, 11, "X")
s.doorway(17, "*K")
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

# 4.4 — trần thấp (không nhảy được) + băng chuyền ngược + sàn sụp liền
s = Seg(36)
s.ceiling(3, 33, 10)
s.conveyor(4, 12, -2)
s.pit(13, 16)
s.crumble(13, 14)
s.crumble(15, 16)
s.conveyor(17, 25, -2)
s.pit(26, 29)
s.crumble(26, 27)
s.crumble(28, 29)
L.append(s)

# 4.5 — hai cụm dãy nút dẫn đường nối bằng bục số
s = Seg(54)
stairs_up(s, 6, 11, 10)
s.fill(7, 7, 10, 11, "#")
guided(s, 9, 3, 9, "G")
s.lift(25, 30, 3, drop=True)
s.fill(31, 53, 9, 11, "#")
s.fill(32, 32, 8, 8, "#")
s.fill(33, 33, 7, 8, "#")
s.pit(35, 46, 9)
s.fill(34, 47, 6, 6, "#")
for i in range(3):
    a = 35 + 4 * i
    me = f"H{i}"
    near = [f"H{j}" for j in (i - 1, i + 1) if 0 <= j < 3]
    s.bridge(a, a + 3, me, near, y=9)
    s.pads([a + 1], me, y=5)
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

# 5.3 — 3 nút có nhãn (khối đè khi thiếu người) → dãy nút dẫn đường có khối đỏ quét ngang cầu
s = Seg(48)
s.pads([6], "A", label="lapphap")
s.pads([10], "A", label="hanhphap")
s.pads([14], "A", label="tuphap")
s.sigs["A"] = {"latch": True}
s.box(17, 11, 1, 1, 1)
s.gate(20, "A", label="du3nut")
stairs_up(s, 22, 11, 10)
s.fill(23, 23, 10, 11, "#")
guided(s, 25, 3, 9, "G")
s.hazard(25, 11, 1, 1, [[0, 0], [11, 0]], 3, 0.5)
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
```

## Bước 3 — Sinh `levelData.ts`

```bash
python scripts/levels/chapters.py src/game/levelData.ts
```

Phải in: `ok [290, 308, 310, 326, 282]` (độ rộng 5 level, đơn vị ô). (Windows báo lỗi mã hóa khi in tiếng Việt: chạy `set PYTHONIOENCODING=utf-8` trước, PowerShell: `$env:PYTHONIOENCODING="utf-8"`.)

Kết quả phải giống hệt khối dưới (dán thẳng cũng được nếu máy không có Python):

**Tạo mới / thay toàn bộ** `src/game/levelData.ts` (1070 dòng) — file sinh tự động:

```ts
// src/game/levelData.ts
// SINH TỰ ĐỘNG bởi scripts/levels/chapters.py — sửa ở đó rồi chạy lại, không sửa tay file này.
// Ký hiệu: # nền · . trống · X gai · ^ vùng chết · S xuất phát · C cột mốc · D cửa
//          ký tự khác = vật thể khai báo trong objs của đoạn đó (xem ObjSpec trong level.ts).
import type { ChapterDef } from "./level";

export const CHAPTERS: ChapterDef[] = [
  {
    id: "1",
    name: "1945–1946 · Nền móng",
    segments: [
      // đoạn 1
      {
        rows: [
          "####################################",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "........................############",
          ".S......####............############",
          "##############..###..###############",
          "##############..###..###############",
          "##############..###..###############",
          "##############..###..###############",
        ],
      },
      // đoạn 2
      {
        rows: [
          "####################################",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          ".C..................................",
          "#######.............................",
          "#######.......X.......X.....X.......",
          "##########aaaaaaaaaaaaaaaaaaaaaaa###",
          "####################################",
          "####################################",
          "####################################",
        ],
        objs: {
          "a": {t: "conveyor", speed: -2},
        },
      },
      // đoạn 3
      {
        rows: [
          "##########################################",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "........b.......................b....b....",
          ".......###..........a...........##........",
          ".C.....###....b.....a....b......##........",
          "############..##..###################..###",
          "############..##..###################..###",
          "############..##..###################..###",
          "############..##..###################..###",
        ],
        objs: {
          "a": {t: "hazard", path: [[0, 0], [9, 0]], speed: 3, pause: 0.6},
          "b": {t: "carry", kind: "ballot", to: "*B", perPlayer: true},
        },
      },
      // đoạn 4
      {
        rows: [
          "#####################################",
          "...................................g.",
          "...................................g.",
          "...................................g.",
          "...................................g.",
          "...................................g.",
          "...................................g.",
          "...................................g.",
          "...................................g.",
          "...................................g.",
          "...............................ff..g.",
          ".C.............................ff..g.",
          "######..aa..bb..cc..dd..ee..#########",
          "######......................#########",
          "######......................#########",
          "######......................#########",
        ],
        objs: {
          "a": {t: "crumble"},
          "b": {t: "crumble"},
          "c": {t: "crumble"},
          "d": {t: "crumble"},
          "e": {t: "crumble"},
          "f": {t: "receiver", kind: "ballot", sig: "*B", label: "homphieu"},
          "g": {t: "gate", sig: "*B"},
        },
      },
      // đoạn 5
      {
        rows: [
          "###################################",
          "...................................",
          "...................................",
          "...................................",
          "...................................",
          "...................................",
          "...................................",
          "...................................",
          "...................................",
          "...................................",
          "...................................",
          ".C.................................",
          "######..aaaaaaa..bbbbbbb..#########",
          "######.....#........#.....#########",
          "######.....#........#.....#########",
          "######.....#........#.....#########",
        ],
        objs: {
          "a": {t: "seesaw"},
          "b": {t: "seesaw"},
        },
      },
      // đoạn 6
      {
        rows: [
          "######################################",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          ".................................c....",
          ".................................##...",
          ".C......a...a...a...a...a........##...",
          "######..##..##..##..##..##bbbb########",
          "######..##..##..##..##..##....########",
          "######..##..##..##..##..##....########",
          "######..##..##..##..##..##....########",
        ],
        objs: {
          "a": {t: "pad", sig: "A", perPlayer: true},
          "b": {t: "bridge", sig: "A"},
          "c": {t: "carry", kind: "key", to: "*K"},
        },
        sigs: {A: {latch: true}},
      },
      // đoạn 7
      {
        rows: [
          "########################################",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "...........b...d...f...h...j...l........",
          ".........##########################.....",
          ".......#................................",
          ".C....##................................",
          "##########aaaacccceeeeggggiiiikkkk######",
          "##########........................######",
          "##########........................######",
          "##########........................######",
        ],
        objs: {
          "a": {t: "bridge", sig: "G0", any: ["G1"]},
          "b": {t: "pad", sig: "G0"},
          "c": {t: "bridge", sig: "G1", any: ["G0", "G2"]},
          "d": {t: "pad", sig: "G1"},
          "e": {t: "bridge", sig: "G2", any: ["G1", "G3"]},
          "f": {t: "pad", sig: "G2"},
          "g": {t: "bridge", sig: "G3", any: ["G2", "G4"]},
          "h": {t: "pad", sig: "G3"},
          "i": {t: "bridge", sig: "G4", any: ["G3", "G5"]},
          "j": {t: "pad", sig: "G4"},
          "k": {t: "bridge", sig: "G5", any: ["G4"]},
          "l": {t: "pad", sig: "G5"},
        },
      },
      // đoạn 8
      {
        rows: [
          "##########################",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          ".................DDDDD....",
          ".C....##....X....DDDDD....",
          "##########################",
          "##########################",
          "##########################",
          "##########################",
        ],
        door: "*K",
      },
    ],
  },
  {
    id: "2",
    name: "1976–1986 · Thống nhất và Đổi mới",
    segments: [
      // đoạn 1
      {
        rows: [
          "########################################",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          ".............bbbbbbbbbb..ccccccc########",
          ".............##########..###############",
          ".S...........##########..###############",
          "#######aaaaaa##########..###############",
          "#######################..###############",
          "#######################..###############",
          "#######################XX###############",
        ],
        objs: {
          "a": {t: "lift", rise: 3, drop: true},
          "b": {t: "ice"},
          "c": {t: "ice"},
        },
      },
      // đoạn 2
      {
        rows: [
          "##########################################",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          ".C.............X...........X........X.....",
          "####aaaaaa..bbbbbbbbbb..cccccccc..ddddd###",
          "##########..##########..########..########",
          "##########..##########..########..########",
          "##########..##########..########..########",
        ],
        objs: {
          "a": {t: "ice"},
          "b": {t: "ice"},
          "c": {t: "ice"},
          "d": {t: "ice"},
        },
      },
      // đoạn 3
      {
        rows: [
          "####################################",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          ".C.....................X............",
          "###aaaa..bbbbbbb..ccccccccc#########",
          "#######..#######..##################",
          "#######..#######..##################",
          "#######..#######..##################",
        ],
        objs: {
          "a": {t: "ice"},
          "b": {t: "seesaw"},
          "c": {t: "ice"},
        },
      },
      // đoạn 4
      {
        rows: [
          "####################################",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          ".C............X.....................",
          "####aaaaaaaaaa##.bb..cc..dd.########",
          "################............########",
          "################............########",
          "################............########",
        ],
        objs: {
          "a": {t: "conveyor", speed: 2},
          "b": {t: "crumble"},
          "c": {t: "crumble"},
          "d": {t: "crumble"},
        },
      },
      // đoạn 5
      {
        rows: [
          "##############################################",
          "..............................................",
          "..............................................",
          "..............................................",
          "........................b.....................",
          "..............................................",
          "..............................................",
          "..............................................",
          "......................................########",
          "......................................########",
          "......................................########",
          ".C....................................########",
          "######aaaaaa..........................########",
          "######................................########",
          "######................................########",
          "######................................########",
        ],
        objs: {
          "a": {t: "mover", path: [[0, 0], [10, -4], [26, -4]], pads: true},
          "b": {t: "hazard", path: [[0, 0], [0, 3]], speed: 2, pause: 0.8, extra: [0, -3, 1, 3]},
        },
      },
      // đoạn 6
      {
        rows: [
          "##############################################",
          "..............................................",
          "..............................................",
          "..............................................",
          "..............................................",
          "..............................................",
          "..............................................",
          "..............................................",
          ".....................d........................",
          "........c...........###..................fff..",
          ".......###..........###..................fff..",
          ".C.....###.....a....###..............e...fff..",
          "###########################bbbbbbbbbbb########",
          "##############################################",
          "##############################################",
          "##############################################",
        ],
        objs: {
          "a": {t: "box", weight: 1},
          "b": {t: "conveyor", speed: -2},
          "c": {t: "carry", kind: "word", to: "*W", text: "banchat"},
          "d": {t: "carry", kind: "word", to: "*W", text: "muctieu"},
          "e": {t: "carry", kind: "word", to: "*W", text: "dongluc"},
          "f": {t: "receiver", kind: "word", sig: "*W", label: "khungchu"},
        },
      },
      // đoạn 7
      {
        rows: [
          "####################################",
          ".....###############################",
          ".....###############################",
          ".....###############################",
          ".....###############################",
          ".....###############################",
          ".....###############################",
          ".....^^^^^^^^^######################",
          "..............######################",
          "..............^^^^^^^^^^############",
          "........................^^^^^^^^^^^^",
          ".C.......X..........................",
          "#########################aabbccdd###",
          "#########################........###",
          "#########################........###",
          "#########################........###",
        ],
        objs: {
          "a": {t: "crumble"},
          "b": {t: "crumble"},
          "c": {t: "crumble"},
          "d": {t: "crumble"},
        },
      },
      // đoạn 8
      {
        rows: [
          "##########################",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          ".................DDDDD....",
          ".C....#....X.....DDDDD....",
          "##########################",
          "##########################",
          "##########################",
          "##########################",
        ],
        door: "*W",
      },
    ],
  },
  {
    id: "3",
    name: "1991–1995 · Hình thành khái niệm",
    segments: [
      // đoạn 1
      {
        rows: [
          "############################################",
          "....########################################",
          "....########################################",
          "....########################################",
          "....########################################",
          "....########################################",
          "....########################################",
          "....########################################",
          "....^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",
          "............................................",
          "............................................",
          ".S....aa....................................",
          "#######.....####.....####.....####.....#####",
          "############################################",
          "############################################",
          "############################################",
        ],
        objs: {
          "a": {t: "hazard", path: [[0, 0], [34, 0]], speed: 4, pause: 0.4},
        },
      },
      // đoạn 2
      {
        rows: [
          "####################################",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "....................................",
          "........................############",
          "........................############",
          ".C.....aaa.......b......############",
          "#############...####################",
          "#############XXX####################",
          "####################################",
          "####################################",
        ],
        objs: {
          "a": {t: "box", weight: 2},
          "b": {t: "box", weight: 1},
        },
      },
      // đoạn 3
      {
        rows: [
          "######################################",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          "......................................",
          ".C....................................",
          "######..aaaaaaa..bbbbbbb..ccccccc..###",
          "######.....#........#........#.....###",
          "######.....#........#........#.....###",
          "######XXXXX#XXXXXXXX#XXXXXXXX#XXXXX###",
        ],
        objs: {
          "a": {t: "seesaw"},
          "b": {t: "seesaw"},
          "c": {t: "seesaw"},
        },
      },
      // đoạn 4
      {
        rows: [
          "######################################################",
          "....................................................m.",
          "....................................................m.",
          "....................................................m.",
          "....................................................m.",
          "....................................................m.",
          "...............g...........i......................llm.",
          "..................................................llm.",
          "..........b...d...f............................k..llm.",
          "........##############.........#####jjjjjjjjjjjj######",
          ".......#.......................#######################",
          ".C....##.......................#######################",
          "#########aaaacccceeee####hhhhhh#######################",
          "#########............#################################",
          "#########............#################################",
          "#########............#################################",
        ],
        objs: {
          "a": {t: "bridge", sig: "G0", any: ["G1"]},
          "b": {t: "pad", sig: "G0"},
          "c": {t: "bridge", sig: "G1", any: ["G0", "G2"]},
          "d": {t: "pad", sig: "G1"},
          "e": {t: "bridge", sig: "G2", any: ["G1"]},
          "f": {t: "pad", sig: "G2"},
          "g": {t: "carry", kind: "word", to: "*Y", text: "cuadan"},
          "h": {t: "lift", rise: 3, drop: true},
          "i": {t: "carry", kind: "word", to: "*Y", text: "dodan"},
          "j": {t: "conveyor", speed: -2},
          "k": {t: "carry", kind: "word", to: "*Y", text: "vidan"},
          "l": {t: "receiver", kind: "word", sig: "*Y", label: "khungchu"},
          "m": {t: "gate", sig: "*Y"},
        },
      },
      // đoạn 5
      {
        rows: [
          "################################",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          ".C..........X............X......",
          "######.aa.####.bb..cc.##########",
          "######....####........##########",
          "######....####........##########",
          "######....####........##########",
        ],
        objs: {
          "a": {t: "crumble"},
          "b": {t: "crumble"},
          "c": {t: "crumble"},
        },
      },
      // đoạn 6
      {
        rows: [
          "################################################",
          "......######################################....",
          "......######################################....",
          "......######################################....",
          "......######################################....",
          "......######################################....",
          "......######################################....",
          "......################^^^^^^^^^^^^^^^^^^^^^^....",
          "......################..........c...............",
          "......^^^^^^^^^^^^^^^^..........................",
          "................b...........................####",
          ".C..........................................####",
          "######aaaaaa................................####",
          "######......................................####",
          "######......................................####",
          "######......................................####",
        ],
        objs: {
          "a": {t: "mover", path: [[0, 0], [17, 0], [25, -2], [32, -2]], pads: true},
          "b": {t: "hazard", path: [[0, 0], [0, 1]], speed: 1.5, pause: 0.8},
          "c": {t: "hazard", path: [[0, 0], [0, 1]], speed: 1.5, pause: 0.8},
        },
      },
      // đoạn 7
      {
        rows: [
          "################################",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          "............a...................",
          "...........###..................",
          ".C......X.........X.............",
          "######################..########",
          "######################..########",
          "######################..########",
          "######################..########",
        ],
        objs: {
          "a": {t: "carry", kind: "key", to: "*K"},
        },
      },
      // đoạn 8
      {
        rows: [
          "##########################",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          "..........................",
          ".................DDDDD....",
          ".C.....##..X.....DDDDD....",
          "##########################",
          "##########################",
          "##########################",
          "##########################",
        ],
        door: "*K",
      },
    ],
  },
  {
    id: "4",
    name: "2001–2022 · Hiến định và hoàn thiện",
    segments: [
      // đoạn 1
      {
        rows: [
          "########################################",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          "........................................",
          ".S......................................",
          "######.aa.bb.cc.dd.ee.ff.gg.hh.ii.jj.###",
          "######...............................###",
          "######...............................###",
          "######XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX###",
        ],
        objs: {
          "a": {t: "crumble"},
          "b": {t: "crumble"},
          "c": {t: "crumble"},
          "d": {t: "crumble"},
          "e": {t: "crumble"},
          "f": {t: "crumble"},
          "g": {t: "crumble"},
          "h": {t: "crumble"},
          "i": {t: "crumble"},
          "j": {t: "crumble"},
        },
      },
      // đoạn 2
      {
        rows: [
          "##################################",
          "..........................e.......",
          "..........................e.......",
          "..........................e.......",
          "..........................e.......",
          "..........................e.......",
          "..........................e.......",
          "..........................e.......",
          "..........................e.......",
          "..........................e.......",
          "..........................e.......",
          ".C.....a..b...c...d.......e.......",
          "###########..###..###..###########",
          "###########..###..###..###########",
          "###########..###..###..###########",
          "###########..###..###..###########",
        ],
        objs: {
          "a": {t: "box", weight: 1},
          "b": {t: "pad", sig: "A", label: "lapphap"},
          "c": {t: "pad", sig: "A", label: "hanhphap"},
          "d": {t: "pad", sig: "A", label: "tuphap"},
          "e": {t: "gate", sig: "A", label: "du3nut"},
        },
        sigs: {A: {latch: true}},
      },
      // đoạn 3
      {
        rows: [
          "########################################",
          "...###################################..",
          "...###################################..",
          "...###################################..",
          "...###################################..",
          "...###################################..",
          "...###################################..",
          "...###################################..",
          "...^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^..",
          "..a.....................................",
          "........................................",
          ".C......................................",
          "######..bbbbbbb..ccccccc.###############",
          "######.....#........#....###############",
          "######.....#........#....###############",
          "######.....#........#....###############",
        ],
        objs: {
          "a": {t: "sign", label: "ranhgioi"},
          "b": {t: "seesaw"},
          "c": {t: "seesaw"},
        },
      },
      // đoạn 4
      {
        rows: [
          "####################################",
          "...###############################..",
          "...###############################..",
          "...###############################..",
          "...###############################..",
          "...###############################..",
          "...###############################..",
          "...###############################..",
          "...###############################..",
          "...###############################..",
          "...^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^..",
          ".C..................................",
          "####aaaaaaaaabbccdddddddddeeff######",
          "#############....#########....######",
          "#############....#########....######",
          "#############....#########....######",
        ],
        objs: {
          "a": {t: "conveyor", speed: -2},
          "b": {t: "crumble"},
          "c": {t: "crumble"},
          "d": {t: "conveyor", speed: -2},
          "e": {t: "crumble"},
          "f": {t: "crumble"},
        },
      },
      // đoạn 5
      {
        rows: [
          "######################################################",
          "......................................................",
          "......................................................",
          "......................................................",
          "......................................................",
          "....................................i...k...m.........",
          "..................................##############......",
          ".................................#....................",
          "..........b...d...f.............##....................",
          "........##############.........####hhhhjjjjllll#######",
          ".......#.......................####............#######",
          ".C....##.......................####............#######",
          "#########aaaacccceeee####gggggg####............#######",
          "#########............##############............#######",
          "#########............##############............#######",
          "#########............##############............#######",
        ],
        objs: {
          "a": {t: "bridge", sig: "G0", any: ["G1"]},
          "b": {t: "pad", sig: "G0"},
          "c": {t: "bridge", sig: "G1", any: ["G0", "G2"]},
          "d": {t: "pad", sig: "G1"},
          "e": {t: "bridge", sig: "G2", any: ["G1"]},
          "f": {t: "pad", sig: "G2"},
          "g": {t: "lift", rise: 3, drop: true},
          "h": {t: "bridge", sig: "H0", any: ["H1"]},
          "i": {t: "pad", sig: "H0"},
          "j": {t: "bridge", sig: "H1", any: ["H0", "H2"]},
          "k": {t: "pad", sig: "H1"},
          "l": {t: "bridge", sig: "H2", any: ["H1"]},
          "m": {t: "pad", sig: "H2"},
        },
      },
      // đoạn 6
      {
        rows: [
          "########################################",
          ".....................................e..",
          ".....................................e..",
          ".....................................e..",
          ".....................................e..",
          ".....................................e..",
          ".....................................e..",
          ".....................................e..",
          ".....................................e..",
          ".....................................e..",
          "........bb..d............cc..........e..",
          ".C......bb..d............cc..........e..",
          "###aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa#####",
          "########################################",
          "########################################",
          "########################################",
        ],
        objs: {
          "a": {t: "ice"},
          "b": {t: "box", weight: "all", sig: "G", label: "kiemsoat"},
          "c": {t: "goal", sig: "G", label: "dich"},
          "d": {t: "hazard", path: [[0, 0], [10, 0]], speed: 3, pause: 1.5},
          "e": {t: "gate", sig: "G"},
        },
      },
      // đoạn 7
      {
        rows: [
          "##################################################",
          "..................................................",
          "..................................................",
          "..................................................",
          "..................................................",
          "................................c.................",
          "..................................................",
          "..................................................",
          "..................................................",
          "..........................................########",
          "..........................................########",
          ".C............b...........................########",
          "######aaaaaa..............................########",
          "######....................................########",
          "######....................................########",
          "######....................................########",
        ],
        objs: {
          "a": {t: "mover", path: [[0, 0], [10, 0], [16, -3], [30, -3]], stops: [1], pads: true},
          "b": {t: "hazard", path: [[0, 0], [10, 0]], speed: 4, pause: 0.3},
          "c": {t: "hazard", path: [[0, 0], [0, 2.5]], speed: 2, pause: 0.8, extra: [0, -4, 1, 4]},
        },
      },
      // đoạn 8
      {
        rows: [
          "################################",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          "................................",
          "........................DDDDD...",
          "...................b....DDDDD...",
          "..................##############",
          "..................##############",
          ".C......a.........##############",
          "################################",
          "################################",
          "################################",
          "################################",
        ],
        objs: {
          "a": {t: "box", weight: 1},
          "b": {t: "carry", kind: "key", to: "*K"},
        },
        door: "*K",
      },
    ],
  },
  {
    id: "5",
    name: "Câu trả lời",
    segments: [
      // đoạn 1
      {
        rows: [
          "############################################",
          "............................................",
          "............................................",
          "............................................",
          "............................................",
          "............................................",
          "............................................",
          "............................................",
          ".................................X..........",
          "............bbbbbbbbbcc..dd#################",
          "............#########......#################",
          ".S..........#########......#################",
          "######aaaaaa#########......#################",
          "#####################......#################",
          "#####################......#################",
          "#####################XXXXXX#################",
        ],
        objs: {
          "a": {t: "lift", rise: 3, drop: true},
          "b": {t: "ice"},
          "c": {t: "crumble"},
          "d": {t: "crumble"},
        },
      },
      // đoạn 2
      {
        rows: [
          "########################################",
          "...###################################..",
          "...###################################..",
          "...###################################..",
          "...###################################..",
          "...###################################..",
          "...###################################..",
          "...###################################..",
          "...^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^..",
          "........................................",
          "........................................",
          ".C.............................X........",
          "###aaaaa..bbbbbbb..ccccccccc############",
          "########..#######..#####################",
          "########..#######..#####################",
          "########..#######..#####################",
        ],
        objs: {
          "a": {t: "conveyor", speed: -2},
          "b": {t: "seesaw"},
          "c": {t: "conveyor", speed: -2},
        },
      },
      // đoạn 3
      {
        rows: [
          "################################################",
          "....................e...........................",
          "....................e...........................",
          "....................e...........................",
          "....................e...........................",
          "....................e...........................",
          "....................e...........................",
          "....................e...........................",
          "....................e.....g...i...k.............",
          "....................e...##############..........",
          "....................e..#........................",
          ".C....a...b...c..d..e.##.l......................",
          "#########################ffffhhhhjjjj###########",
          "#########################............###########",
          "#########################............###########",
          "#########################............###########",
        ],
        objs: {
          "a": {t: "pad", sig: "A", label: "lapphap"},
          "b": {t: "pad", sig: "A", label: "hanhphap"},
          "c": {t: "pad", sig: "A", label: "tuphap"},
          "d": {t: "box", weight: 1},
          "e": {t: "gate", sig: "A", label: "du3nut"},
          "f": {t: "bridge", sig: "G0", any: ["G1"]},
          "g": {t: "pad", sig: "G0"},
          "h": {t: "bridge", sig: "G1", any: ["G0", "G2"]},
          "i": {t: "pad", sig: "G1"},
          "j": {t: "bridge", sig: "G2", any: ["G1"]},
          "k": {t: "pad", sig: "G2"},
          "l": {t: "hazard", path: [[0, 0], [11, 0]], speed: 3, pause: 0.5},
        },
        sigs: {A: {latch: true}},
      },
      // đoạn 4
      {
        rows: [
          "##############################################",
          "..............................................",
          "..............................................",
          "..............................................",
          "..............................................",
          "..............................................",
          "..............................................",
          "..............................................",
          "............................eeeeeeeeeeee......",
          "............................eeeeeeeeeeee......",
          "...............cc.....dd....eeeeeeeeeeee......",
          ".C.............cc.....dd....eeeeeeeeeeee......",
          "####aaaaaaaaa#bbbbbbbbbbbbb#####..############",
          "################################..############",
          "################################..############",
          "################################..############",
        ],
        objs: {
          "a": {t: "conveyor", speed: -2},
          "b": {t: "ice"},
          "c": {t: "box", weight: 2, sig: "T", label: "baibo"},
          "d": {t: "goal", sig: "T", label: "dich"},
          "e": {t: "slow", sig: "T", label: "thutuc"},
        },
      },
      // đoạn 5
      {
        rows: [
          "####################################################",
          "......########################################......",
          "......########################################......",
          "......########################################......",
          "......########################################......",
          "......########################################......",
          "......########^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^......",
          "......########.....................c................",
          "......########......................................",
          "......^^^^^^^^................................######",
          "...........b..................................######",
          ".C............................................######",
          "######aaaaaa..................................######",
          "######........................................######",
          "######........................................######",
          "######........................................######",
        ],
        objs: {
          "a": {t: "mover", path: [[0, 0], [8, 0], [16, -3], [24, -3], [34, -3]], stops: [3], pads: true},
          "b": {t: "hazard", path: [[0, 0], [0, 1]], speed: 1.5, pause: 0.8},
          "c": {t: "hazard", path: [[0, 0], [0, 1]], speed: 1.5, pause: 0.6},
        },
      },
      // đoạn 6
      {
        rows: [
          "####################################################",
          "....................................................",
          "....................................................",
          "....................................................",
          "....................................................",
          "....................................................",
          "....................................................",
          "....................................................",
          "..............b.....................................",
          ".............###....................................",
          ".............###............................DDDDD...",
          ".C....a......###............................DDDDD...",
          "##################.cc..dd.##..eeeeeee.##############",
          "##################........##.....#....##############",
          "##################........##.....#....##############",
          "##################........##.....#....##############",
        ],
        objs: {
          "a": {t: "box", weight: 1},
          "b": {t: "carry", kind: "key", to: "*K"},
          "c": {t: "crumble"},
          "d": {t: "crumble"},
          "e": {t: "seesaw"},
        },
        door: "*K",
      },
    ],
  },
];
```

## Bước 4 — Chữ

Mỗi đoạn **1 dòng** (≤ 90 ký tự, có năm hoặc nguồn ngắn); `""` = đoạn không có chữ. Nhãn vật ≤ 4 từ. Màn kết: câu hỏi → "Không mâu thuẫn" + 3 ý.
Nhóm chỉ cần soát file này.

**Tạo mới / thay toàn bộ** `src/game/story.ts` (111 dòng):

```ts
// src/game/story.ts
// TOÀN BỘ chữ hiển thị trong 5 level. Nhóm soát và sửa ở file này.
// Quy tắc: mỗi đoạn MỘT dòng ý chính (≤ 90 ký tự, có năm hoặc nguồn ngắn); nhãn ≤ 4 từ; không chữ hướng dẫn cách chơi.

export interface LevelStory {
  lines: string[]; // dòng chữ của từng đoạn (theo thứ tự trong levelData.ts); "" = đoạn không có chữ
}

/** Nhãn trên vật thể (khóa dùng trong scripts/levels/chapters.py). */
const LABELS: Record<string, string> = {
  homphieu: "Hòm phiếu",
  khungchu: "Khung chữ",
  lapphap: "Lập pháp",
  hanhphap: "Hành pháp",
  tuphap: "Tư pháp",
  du3nut: "Cần đủ 3 nút",
  ranhgioi: "Ranh giới Hiến pháp & pháp luật",
  kiemsoat: "Kiểm soát quyền lực",
  dich: "Đích",
  baibo: "Bãi bỏ",
  thutuc: "Thủ tục phiền hà",
  // mảnh chữ
  banchat: "bản chất",
  muctieu: "mục tiêu",
  dongluc: "động lực",
  cuadan: "của dân",
  dodan: "do dân",
  vidan: "vì dân",
};

export const STORY: Record<string, LevelStory> = {
  "1": {
    lines: [
      "1919 — \"Trăm điều phải có thần linh pháp quyền\" (Việt Nam yêu cầu ca).",
      "02/9/1945 — Tuyên ngôn Độc lập, khai sinh nước Việt Nam Dân chủ Cộng hòa.",
      "06/01/1946 — Tổng tuyển cử bầu Quốc hội đầu tiên.",
      "\"Hễ là công dân thì đều có quyền đi bầu cử.\" — Hồ Chí Minh",
      "",
      "11/1946 — Quốc hội thông qua Hiến pháp đầu tiên.",
      "",
      "",
    ],
  },
  "2": {
    lines: [
      "1976 — Nước Cộng hòa xã hội chủ nghĩa Việt Nam.",
      "Trước 1986, việc gắn dân chủ với pháp luật chưa được đặt ra cụ thể. (giáo trình)",
      "",
      "",
      "12/1986 — Đại hội VI khởi xướng Đổi mới: \"lấy dân làm gốc\".",
      "Dân chủ: bản chất, mục tiêu, động lực của sự phát triển. (giáo trình)",
      "",
      "",
    ],
  },
  "3": {
    lines: [
      "06/1991 — Cương lĩnh: Nhà nước quản lý xã hội bằng pháp luật.",
      "29/11/1991 — Lần đầu nêu khái niệm \"Nhà nước pháp quyền xã hội chủ nghĩa\".",
      "1992 — Hiến pháp: Điều 4 và Điều 12.",
      "01/1994 — \"Nhà nước pháp quyền thực sự của dân, do dân và vì dân\".",
      "",
      "01/1995 — Quan điểm Nhà nước pháp quyền được trình bày đầy đủ hơn.",
      "",
      "",
    ],
  },
  "4": {
    lines: [
      "12/2001 — Hiến định thuật ngữ \"Nhà nước pháp quyền xã hội chủ nghĩa\".",
      "2011 — Quyền lực nhà nước thống nhất, có phân công, phối hợp, kiểm soát.",
      "2013 — Hiến pháp, Điều 4: hoạt động trong khuôn khổ Hiến pháp và pháp luật.",
      "",
      "Hiến pháp 2013 — Điều 2 và Điều 8.",
      "Kiểm soát quyền lực: không có vùng cấm.",
      "2021 — Đại hội XIII · 09/11/2022 — Nghị quyết 27-NQ/TW.",
      "",
    ],
  },
  "5": {
    lines: [
      "Quyền lãnh đạo được Hiến pháp ghi nhận (Điều 4).",
      "…kèm nghĩa vụ hoạt động trong khuôn khổ Hiến pháp và pháp luật.",
      "Quyền lực được phân công, phối hợp, kiểm soát.",
      "Thủ tục hành chính gây phiền hà phải được bãi bỏ. (giáo trình)",
      "Vẫn phải tiếp tục hoàn thiện cơ chế kiểm soát quyền lực (Nghị quyết 27-NQ/TW).",
      "",
    ],
  },
};

/** Màn kết sau level 5. */
export const ENDING = {
  question: "Vai trò lãnh đạo của Đảng có mâu thuẫn với nguyên tắc pháp quyền?",
  answer: "Không mâu thuẫn",
  points: [
    "Sự lãnh đạo của Đảng được Hiến pháp ghi nhận, kèm nghĩa vụ hoạt động trong khuôn khổ Hiến pháp và pháp luật.",
    "Nguyên tắc pháp quyền giúp sự lãnh đạo không lạm quyền, không làm thay Nhà nước.",
    "Còn phải tiếp tục hoàn thiện cơ chế kiểm soát quyền lực (Nghị quyết 27-NQ/TW).",
  ],
};

/** Nhãn của một khóa; không có thì trả lại nguyên khóa. */
export function label(key: string): string {
  return LABELS[key] ?? key;
}

/** Dòng chữ của đoạn `seg` trong level (rỗng nếu không có). */
export function segmentLine(levelId: string, seg: number): string {
  return STORY[levelId]?.lines[seg] ?? "";
}
```

### ✅ Kiểm tra

```bash
npx tsc -b
```

`levelData.ts`, `story.ts` không lỗi (còn lỗi ở `renderer.ts`, `GameCanvas.tsx`… — sửa ở file 04–05).
