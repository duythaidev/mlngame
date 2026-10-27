# 03 · Ảnh minh họa: nén ≤ 150 KB, ghi nguồn ảnh thật (repo `mlngame`)

Ảnh hiện ~360–630 KB/ảnh (≈ 15 MB). Script nén cạnh dài về ≤ 768 px, giữ định dạng. Đã thử trên bản sao: **15 MB → 4,6 MB**, mọi ảnh ≤ 150 KB, chạy lần 2 bỏ qua cả 40 file.

## Bước 1 — Cài `sharp`

```bash
npm i -D sharp@0.34
```

## Bước 2 — Script

**Tạo mới** `scripts/compress-art.mjs`:

````js
// scripts/compress-art.mjs
// Nén ảnh minh họa trong public/art xuống ≤ 150 KB (spec A1): cạnh dài ≤ 768 px, giữ định dạng (.webp / .jpg).
// Chạy lại nhiều lần không sao: ảnh đã ≤ 150 KB và ≤ 768 px thì bỏ qua.
// Dùng:  npm run art            (thư mục khác: ART_DIR=đường/dẫn npm run art)
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

sharp.cache(false); // Windows: không giữ file mở, để ghi đè được

const DIR = process.env.ART_DIR ?? "public/art";
const LIMIT = 150 * 1024;
const MAX_SIDE = 768;

for (const name of readdirSync(DIR)) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext !== "webp" && ext !== "jpg" && ext !== "jpeg") continue;
  const file = join(DIR, name);
  const before = statSync(file).size;
  const input = readFileSync(file); // đọc vào bộ nhớ trước rồi mới ghi đè
  const meta = await sharp(input).metadata();
  if (before <= LIMIT && Math.max(meta.width ?? 0, meta.height ?? 0) <= MAX_SIDE) {
    console.log(`bỏ qua  ${name}  ${Math.round(before / 1024)} KB`);
    continue;
  }
  let q = 78;
  let out;
  for (;;) {
    const img = sharp(input).resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
    out = await (ext === "webp" ? img.webp({ quality: q }) : img.jpeg({ quality: q, mozjpeg: true })).toBuffer();
    if (out.length <= LIMIT || q <= 48) break;
    q -= 6;
  }
  writeFileSync(file, out);
  console.log(`nén     ${name}  ${Math.round(before / 1024)} KB → ${Math.round(out.length / 1024)} KB  (q ${q})`);
}
````

Thêm lệnh vào `package.json`, mục `"scripts"` — TÌM:

```json
    "test": "vitest run"
```

THAY bằng:

```json
    "test": "vitest run",
    "art": "node scripts/compress-art.mjs"
```

## Bước 3 — Chạy

```bash
npm run art
```

Mỗi dòng in `nén  tên  xxx KB → yyy KB` với yyy ≤ 150. Chạy lại lần nữa: mọi dòng là `bỏ qua`.

## Bước 4 — Ghi nguồn ảnh thật

**Tạo mới** `public/art/NGUON-ANH.md` rồi điền URL / tác giả (ảnh lấy trên mạng cần ghi nguồn khi thuyết trình):

```markdown
# Nguồn ảnh thật (.jpg) trong public/art

| File | Phần | Nguồn (URL) | Tác giả / giấy phép | Ghi chú |
|------|------|-------------|---------------------|---------|
| l1p2.jpg | L1 · 02/9/1945 Tuyên ngôn Độc lập | | | |
| l1p5.jpg | L1 · 11/1946 Hiến pháp đầu tiên | | | |
| l2p2.jpg | L2 · Trước 1986 | | | |
| l2p4.jpg | L2 · 12/1986 Đổi mới | | | |
| l3p2.jpg | L3 · 29/11/1991 | | | |
| l4p3.jpg | L4 · 2013 Điều 4 | | | |
| l4p4.jpg | L4 · Không có vùng cấm | | | |
| l5p3.jpg | L5 · Bãi bỏ thủ tục phiền hà | | | |
```

Các file `.webp` cùng tên **giữ lại** (không xóa) — code chỉ dùng `.jpg`; đổi ý thì bỏ khóa khỏi `REAL_PHOTOS` trong `story.ts`.

✅ **Kiểm tra**

```bash
node -e "for(const f of require('fs').readdirSync('public/art'))if(/\.(webp|jpg)$/.test(f)){const s=require('fs').statSync('public/art/'+f).size;if(s>153600)console.log('QUÁ',f,s)}"
```

Không in gì = đạt.
