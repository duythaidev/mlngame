// src/lib/avatar.ts
const MAX_LEN = 7500; // < 8000 theo rules

/** Cắt vuông giữa, thu về size×size, trả về data-URL nhỏ gọn. */
export async function fileToAvatar(file: File, size = 32): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Hãy chọn một file ảnh");

  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const sx = (bmp.width - side) / 2;
  const sy = (bmp.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, side, side, 0, 0, size, size);
  bmp.close();

  const url = canvas.toDataURL("image/webp", 0.8); // Safari tự rơi về PNG
  if (url.length > MAX_LEN) throw new Error("Ảnh sau khi thu nhỏ vẫn quá nặng, chọn ảnh khác");
  return url;
}
