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
