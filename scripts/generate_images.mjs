// scripts/generate_images.mjs
import fs from 'fs';
import path from 'path';

const BASE_STYLE = `Vietnamese revolutionary propaganda poster style mixed with woodblock linocut print, bold thick black outlines, flat color shapes, limited palette of {PALETTE}, visible paper grain texture and slight ink misregistration, strong dramatic diagonal composition, centered clear subject, simple readable silhouettes, square composition`;

const EXCLUSION = `no text, no letters, no numbers, no captions, no watermark, no logo, no signature, no realistic human faces, no close-up portraits, no photorealism, no 3d render, no gore`;

const PALETTES = {
  1: 'sepia brown, aged parchment cream, brick red, muted gold',
  2: 'steel grey-blue, rusty brick orange, stamp yellow, with warm pink-orange sunrise accents',
  3: 'jade green, ivory white, vermilion red, granite grey',
  4: 'deep navy blue, imperial gold, vermilion red, marble white',
  5: 'radiant gold, flag red, sunset orange, deep crimson, cream',
};

export function buildPrompt(level, subject) {
  const palette = PALETTES[level] || PALETTES[1];
  const style = BASE_STYLE.replace('{PALETTE}', palette);
  return `${style}, ${subject}, ${EXCLUSION}`;
}

export async function getCdpSession() {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = list.find((p) => p.url && p.url.includes('8766'));
  if (!page) throw new Error('Không tìm thấy tab Chrome mở http://127.0.0.1:8766/');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  let id = 1;
  function send(method, params) {
    return new Promise((resolve, reject) => {
      const curId = id++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === curId) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  return { ws, send };
}

export async function generateImage(send, filename, prompt) {
  console.log(`[Puter AI] Bắt đầu sinh ${filename}...`);
  console.log(`[Prompt] ${prompt.slice(0, 100)}...`);

  // Mã JS thực thi trực tiếp trên tab Chrome của Puter
  const code = `
    (async () => {
      try {
        const img = await puter.ai.txt2img(${JSON.stringify(prompt)});
        if (!img || !img.src) throw new Error('Không nhận được src từ puter.ai.txt2img');
        
        // Đợi ảnh nạp xong để vẽ canvas
        await new Promise((res, rej) => {
          if (img.complete && img.naturalWidth) return res();
          img.onload = res;
          img.onerror = rej;
        });

        // Chuyển sang WebP nén chất lượng cao
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1024;
        canvas.height = img.naturalHeight || 1024;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const webpDataUrl = canvas.toDataURL('image/webp', 0.88);

        // Lưu PNG vào server 8766 out/ theo chuẩn
        try {
          const blob = await (await fetch(img.src)).blob();
          await fetch('/save?name=' + encodeURIComponent(${JSON.stringify(filename)} + '.png'), {
            method: 'POST',
            body: blob
          });
        } catch (saveErr) {
          console.warn('Lưu vào server 8766 lỗi:', saveErr);
        }

        return { ok: true, webpBase64: webpDataUrl.split(',')[1] };
      } catch (err) {
        return { ok: false, error: err.message || String(err) };
      }
    })()
  `;

  const evalRes = await send('Runtime.evaluate', {
    expression: code,
    awaitPromise: true,
    returnByValue: true,
    timeout: 120000,
  });

  if (evalRes.exceptionDetails) {
    throw new Error('Exception: ' + JSON.stringify(evalRes.exceptionDetails));
  }

  const val = evalRes.result?.value;
  if (!val || !val.ok) {
    throw new Error('Lỗi sinh ảnh: ' + (val?.error || 'Không rõ nguyên nhân'));
  }

  // Ghi file .webp vào mlngame/public/art/<filename>.webp
  const outDir = path.resolve('public/art');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const webpPath = path.join(outDir, `${filename}.webp`);
  const buffer = Buffer.from(val.webpBase64, 'base64');
  fs.writeFileSync(webpPath, buffer);
  const sizeKb = Math.round(buffer.length / 1024);

  console.log(`=> ✅ Đã lưu ${webpPath} (${sizeKb} KB)`);
  return { webpPath, sizeKb };
}
