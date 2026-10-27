// scripts/run_gen_all.mjs
import fs from 'fs';
import path from 'path';
import { getCdpSession, generateImage, buildPrompt } from './generate_images.mjs';

const ALL_ITEMS = [
  // Level 1
  { name: 'l1p1', level: 1, subject: 'a rolled handwritten manuscript scroll and a quill pen beside an oil lamp on an old wooden desk, parchment with abstract ink lines, a window showing distant rooftops at night, warm lamp glow' },
  { name: 'l1p2', level: 1, subject: 'a vast plaza seen from behind a crowd of silhouettes, a forest of red flags with yellow five-pointed stars, a tall flagpole at center, a simple speaker tribune in the distance, sunrise rays' },
  { name: 'l1p3', level: 1, subject: 'a line of villagers in simple clothes queueing seen from behind at a bamboo and thatch polling station, a wooden table with a ballot box and a red flag, morning mist' },
  { name: 'l1p4', level: 1, subject: 'close view of a wooden ballot box with a narrow slot, a single hand (no face) dropping a folded paper ballot with a red check mark into it, beams of light from above' },
  { name: 'l1p5', level: 1, subject: 'a thick closed book with a red cover and a gold five-pointed star embossed in the center, standing on a small wooden stand, radiating soft golden rays, dark vignette corners' },

  // Level 2
  { name: 'l2p1', level: 2, subject: 'a stylized S-shaped country silhouette in red with a gold five-pointed star, glowing as one connected piece, held aloft by many small silhouettes of hands below, grey-blue sky' },
  { name: 'l2p2', level: 2, subject: 'a thin ration coupon book and sheets of ration stamps in the foreground, behind them a long queue of silhouettes with bicycles in front of a plain state shop, grey-blue tone' },
  { name: 'l2p3', level: 2, subject: 'a silent factory with tall cold chimneys and no smoke, rusty stopped gears piled in the foreground, a lone bicycle, heavy grey sky' },
  { name: 'l2p4', level: 2, subject: 'a large assembly hall seen from the back rows, rows of seats with silhouettes, a tall red banner on stage, golden dawn light streaming through tall windows, warm orange-pink glow' },
  { name: 'l2p5', level: 2, subject: 'golden rice fields in the foreground with farmers in conical hats as silhouettes, a factory with smoking chimneys behind, sunrise in pink-orange, a red flag on a pole between them' },

  // Level 3
  { name: 'l3p1', level: 3, subject: 'a stack of official documents bound with a red ribbon, a fountain pen and a desk lamp, jade-green wall behind, soft light' },
  { name: 'l3p2', level: 3, subject: 'a simple speaker podium with two microphones on a stage, a white-columned building facade behind it, spotlight, rows of empty seats in the foreground' },
  { name: 'l3p3', level: 3, subject: 'a golden balance scale of justice in front of a thick law book, white marble columns, jade-green background, bright even light' },
  { name: 'l3p4', level: 3, subject: 'a carved stone archway with three bas-relief panels side by side: a crowd of people, a ballot box, and an open helping hand; Dong Son bronze drum pattern border' },
  { name: 'l3p5', level: 3, subject: 'a white-columned national assembly style building with wide steps, flags on both sides, morning light, a few silhouettes walking up the steps' },

  // Level 4
  { name: 'l4p1', level: 4, subject: 'pages of a law book being turned, a gold ribbon bookmark and a round red stamp pressed on the corner, navy blue background with gold highlights' },
  { name: 'l4p2', level: 4, subject: 'three stone pillars in a row on a marble base joined by interlocking gears at the top, each pillar carrying an emblem: an open law book, a gear, a judge gavel; golden light between them' },
  { name: 'l4p3', level: 4, subject: 'an open constitution book with one page lit by a narrow golden spotlight and a thin gold ruler line across the page, the rest of the page abstract blurred lines' },
  { name: 'l4p4', level: 4, subject: 'a big red approval stamp pressed down on a pile of files, ink splash and flying paper sheets, only a hand holding the stamp, dramatic angle' },
  { name: 'l4p5', level: 4, subject: 'a formal resolution document with a round red seal laid on a table, a glass skyline of modern buildings behind it, navy blue evening light' },

  // Level 5
  { name: 'l5p1', level: 5, subject: 'an open constitution book with the top paragraph lit by a golden spotlight, a red ribbon bookmark, warm deep red background' },
  { name: 'l5p2', level: 5, subject: 'a large ornate golden frame enclosing a red flag with a yellow five-pointed star, standing on a marble floor, soft reflections, calm light' },
  { name: 'l5p3', level: 5, subject: 'a mountain of paperwork whose sheets turn into white paper birds flying upward and away into bright sky, a single round red stamp shape without letters in the center of the pile' },
  { name: 'l5p4', level: 5, subject: 'a winding road of golden light running toward a distant sunrise over a modern city, small signposts along the road, silhouettes walking on it' },
  { name: 'l5p5', level: 5, subject: 'a huge radiant golden gate opening with brilliant light, red flags on both sides, silhouettes of a crowd in front, soft fireworks in the sky' },

  // Extras
  { name: 'hero', level: 1, subject: 'five small framed scenes arranged along a winding rope path leading upward to a golden gate, tiny silhouettes tied together by a rope climbing the path, warm cream background' },
  { name: 'poster', level: 5, subject: 'a radiant golden sunburst background with subtle Dong Son bronze drum pattern in the center, red flag corners, empty space in the middle for text' }
];

async function main() {
  const targetArg = process.argv[2] || 'all'; // '1', '2', '3', '4', '5', 'extras', 'all'
  
  let queue = ALL_ITEMS;
  if (targetArg === 'extras') {
    queue = ALL_ITEMS.filter(it => it.name === 'hero' || it.name === 'poster');
  } else if (['1', '2', '3', '4', '5'].includes(targetArg)) {
    queue = ALL_ITEMS.filter(it => it.name.startsWith(`l${targetArg}p`));
  }

  // Lọc các ảnh chưa sinh (hoặc force nếu có cờ --force)
  const force = process.argv.includes('--force');
  const pending = queue.filter(it => {
    const webpPath = path.resolve(`public/art/${it.name}.webp`);
    if (!force && fs.existsSync(webpPath) && fs.statSync(webpPath).size > 1000) {
      console.log(`[Bỏ qua] ${it.name}.webp đã tồn tại.`);
      return false;
    }
    return true;
  });

  if (pending.length === 0) {
    console.log('Tất cả các ảnh yêu cầu đã tồn tại trong public/art/! Không cần sinh thêm.');
    return;
  }

  console.log(`Số lượng ảnh cần sinh: ${pending.length} ảnh`);
  const { ws, send } = await getCdpSession();
  console.log('Đã kết nối Chrome CDP thành công!');

  try {
    for (let i = 0; i < pending.length; i++) {
      const it = pending[i];
      const prompt = buildPrompt(it.level, it.subject);
      console.log(`\n----------------------------------------`);
      console.log(`[${i + 1}/${pending.length}] Đang sinh ${it.name} (Level ${it.level})...`);
      
      let attempts = 0;
      let success = false;
      while (!success && attempts < 3) {
        attempts++;
        try {
          await generateImage(send, it.name, prompt);
          success = true;
        } catch (err) {
          console.error(`⚠️ Lần thử ${attempts} thất bại cho ${it.name}:`, err.message);
          if (attempts < 3) {
            console.log('Chờ 5 giây thử lại...');
            await new Promise(r => setTimeout(r, 5000));
          } else {
            console.error(`❌ Bỏ qua ${it.name} sau 3 lần thất bại.`);
          }
        }
      }

      // Nghỉ 3.5s giữa các lần sinh để đảm bảo an toàn quota Puter
      await new Promise(r => setTimeout(r, 3500));
    }
    console.log('\n🎉 Hoàn thành phiên sinh ảnh!');
  } finally {
    ws.close();
  }
}

main().catch(err => {
  console.error('Lỗi script run_gen_all:', err);
  process.exit(1);
});
