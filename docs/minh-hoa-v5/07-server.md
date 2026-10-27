# 07 · Đồng bộ server (repo `mln-server`)

Server dùng chung `level.ts` + `levelData.ts` với web. Danh sách copy hiện **thiếu** `levelData.ts` và `objects.ts` → thêm vào.

**Thay toàn bộ** `scripts/sync-shared.mjs`:

````js
// scripts/sync-shared.mjs
// Copy code game dùng chung từ repo web (mlngame) sang src/shared/. Nguồn duy nhất là mlngame — KHÔNG sửa tay bản copy.
// Dùng:  npm run sync-shared            (mặc định ../mlngame)
//        MLNGAME_DIR=/đường/dẫn npm run sync-shared
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const source = resolve(process.env.MLNGAME_DIR ?? join(root, "..", "mlngame"));

export const SHARED_FILES = [
  "game/engine.ts",
  "game/level.ts",
  "game/levelData.ts",
  "game/objects.ts",
  "game/protocol.ts",
  "lib/constants.ts",
  "net/codec.ts",
  "net/stateSender.ts",
];
export const HEADER = "// AUTO-COPIED from mlngame/src — do not edit; run `npm run sync-shared`\n";

// chỉ chạy khi gọi trực tiếp (không chạy khi test import HEADER / SHARED_FILES)
if (process.argv[1]?.endsWith("sync-shared.mjs")) {
  for (const f of SHARED_FILES) {
    const from = join(source, "src", f);
    const to = join(root, "src", "shared", f);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, HEADER + readFileSync(from, "utf8"));
    console.log(`copied ${f}`);
  }
}
````

Chạy (ở thư mục `mln-server`, repo `mlngame` nằm cạnh):

```bash
npm run sync-shared
npx tsc --noEmit
npx vitest run
npm run build
```

✅ **Kiểm tra**

In 8 dòng `copied …` (có `game/levelData.ts`, `game/objects.ts`); `tsc` sạch; **48/48 test xanh**; `dist/main.mjs` ~101 KB. Triển khai như `mlngame/docs/level-phap-quyen/07-server.md`.
