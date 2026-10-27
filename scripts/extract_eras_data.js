import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve('../docs/b_kh_i_ui_h_a_minh_h_a_mln131_nh_n_c_ph_p_quy_n.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const match = html.match(/const ERAS_DATA = (\{[\s\S]*?\n\s*\});/);
if (!match) {
  console.error('Không tìm thấy ERAS_DATA');
  process.exit(1);
}

const rawJs = match[1];

const tsContent = `// src/components/illustrations/erasData.ts
// Dữ liệu 5 Thời kỳ (Level 1-5) & 25 chặng tư liệu (l1p1 -> l5p5)

export interface EraStep {
  step: number;
  code: string;
  year: string;
  title: string;
  quote: string;
  source: string;
  img: string;
  sceneType: 'scroll' | 'flag' | 'podium' | 'ballot' | 'constitution' | 'gears' | 'scale' | 'arch' | 'birds' | 'sun';
}

export interface EraData {
  id: number;
  shortRange: string;
  sealYears: string;
  chapterTag: string;
  stampCode: string;
  ribbonTitle: string;
  portalYear: string;
  portalSlogan: string;
  eraImg: string;
  stampIcon: string;
  steps: EraStep[];
}

export const ERAS_DATA: Record<number, EraData> = ${rawJs};
`;

const outPath = path.resolve('src/components/illustrations/erasData.ts');
fs.writeFileSync(outPath, tsContent, 'utf8');
console.log('Đã tạo src/components/illustrations/erasData.ts thành công!');
