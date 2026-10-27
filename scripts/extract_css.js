import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve('../docs/b_kh_i_ui_h_a_minh_h_a_mln131_nh_n_c_ph_p_quy_n.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) {
  console.error('Không tìm thấy thẻ <style>');
  process.exit(1);
}

const css = styleMatch[1].trim();
const outDir = path.resolve('src/components/illustrations');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'illustrations.css'), css, 'utf8');
console.log('Đã trích xuất illustrations.css thành công! Kích thước:', css.length, 'bytes');
