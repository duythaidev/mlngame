// src/game/parts.test.ts
// Bản 5: mỗi level đúng 5 phần; chữ đúng giới hạn; ảnh đúng tên file.
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getLevel, LEVEL_IDS, partAt, TRAINING_IDS } from "./level";
import { PARTS, partImage } from "./story";

describe("5 phần mỗi level", () => {
  for (const id of LEVEL_IDS) {
    it(`level ${id}: partOf phủ mọi đoạn, tăng dần 0 → 4`, () => {
      const L = getLevel(id);
      expect(L.partCount).toBe(5);
      expect(L.partOf).toHaveLength(L.segCount);
      expect(L.partOf[0]).toBe(0);
      expect(L.partOf[L.segCount - 1]).toBe(4);
      L.partOf.forEach((p, i) => i > 0 && expect(p - L.partOf[i - 1]).toBeGreaterThanOrEqual(0));
      L.partOf.forEach((p, i) => i > 0 && expect(p - L.partOf[i - 1]).toBeLessThanOrEqual(1));
    });

    it(`level ${id}: cột mốc cuối thuộc phần 5, xuất phát thuộc phần 1`, () => {
      const L = getLevel(id);
      expect(partAt(L, 0)).toBe(0);
      expect(partAt(L, L.checkpoints.length - 1)).toBe(4);
      expect(partAt(L, 999)).toBe(0); // cp lạ → phần 1, không lỗi
    });

    it(`level ${id}: chữ 5 phần đúng giới hạn, có ảnh`, () => {
      const parts = PARTS[id];
      expect(parts).toHaveLength(5);
      parts.forEach((p, i) => {
        expect(p.year.length).toBeLessThanOrEqual(10);
        expect(p.phrase.split(/\s+/).filter((w) => w !== "·").length).toBeLessThanOrEqual(6);
        expect(p.line.length).toBeLessThanOrEqual(120);
        expect(p.source.length).toBeGreaterThan(5); // mọi phần phải có nguồn cụ thể
        expect(p.source).not.toMatch(/^giáo trình$/i);
        expect(existsSync(`public${partImage(id, i)}`)).toBe(true);
      });
    });
  }

  it("level luyện tập: 1 phần, không có chữ phần", () => {
    for (const id of TRAINING_IDS) {
      expect(getLevel(id).partCount).toBe(1);
      expect(PARTS[id]).toBeUndefined();
    }
  });

  it("ảnh thật .jpg được ưu tiên", () => {
    expect(partImage("1", 1)).toBe("/art/l1p2.jpg");
    expect(partImage("1", 0)).toBe("/art/l1p1.webp");
  });
});
