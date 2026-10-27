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

    def crumble(s, x0, x1, y=12, stand=None, back=None, look=None):
        """Sàn sụp. stand = giây đứng trước khi rung, back = giây biến mất rồi hiện lại (mặc định 0.8 / 3),
        look = "theme" để vẽ theo thời kỳ (tem phiếu / đá) thay vì gạch nâu mặc định."""
        spec = {"t": "crumble"}
        if stand is not None:
            spec["stand"] = stand
        if back is not None:
            spec["back"] = back
        if look is not None:
            spec["look"] = look
        s.area(spec, x0, x1, y, y)

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
