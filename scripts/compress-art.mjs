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
