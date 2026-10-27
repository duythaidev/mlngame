// scripts/run_gen_eras.mjs
import { getCdpSession, generateImage, buildPrompt } from './generate_images.mjs';

const ERAS = [
  {
    name: 'era1',
    level: 1,
    subject: 'a quiet Vietnamese village at dawn, bamboo hedges and a tiled communal-house roof on rolling hills, a tall flagpole with a red flag with a yellow five-pointed star, a loudspeaker on a pole, tiny silhouettes of villagers walking toward a village gate, warm sepia light'
  },
  {
    name: 'era2',
    level: 2,
    subject: 'a split scene: left half a grey silent factory with cold chimneys, rusty gears and a queue of silhouettes with bicycles; right half the same factory glowing in orange-pink sunrise with smoking chimneys, rice field in front; a diagonal beam of dawn light divides the two halves'
  },
  {
    name: 'era3',
    level: 3,
    subject: 'a grand white-columned assembly building with wide steps, a golden balance scale of justice standing in front, thick law book on a podium, morning sunlight, a few silhouettes climbing the steps'
  },
  {
    name: 'era4',
    level: 4,
    subject: 'a modern city skyline of glass towers at dusk, three huge stone pillars standing in a row in the foreground each carrying a different emblem (an open law book, an interlocking gear, a judge gavel), a large open constitution book glowing at their base'
  },
  {
    name: 'era5',
    level: 5,
    subject: 'a wide golden panorama in a gradient sunset: four small vignettes in a row (village flag, factory sunrise, white-columned building, glass city) joined by a winding golden road that leads to a huge radiant golden gate, red flags on both sides, silhouettes walking forward'
  }
];

async function main() {
  const { ws, send } = await getCdpSession();
  console.log('Đã kết nối Chrome CDP thành công!');

  try {
    for (const era of ERAS) {
      const prompt = buildPrompt(era.level, era.subject);
      console.log(`\n========================================`);
      console.log(`Bắt đầu sinh bìa thời kỳ: ${era.name} (Level ${era.level})`);
      await generateImage(send, era.name, prompt);
      // Giãn cách 3 giây giữa các ảnh để tránh rate limit
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log('\n🎉 Hoàn thành sinh 5 bìa thời kỳ!');
  } finally {
    ws.close();
  }
}

main().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
