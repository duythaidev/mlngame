import fs from 'fs';

const content = fs.readFileSync('../docs/b_kh_i_ui_h_a_minh_h_a_mln131_nh_n_c_ph_p_quy_n.html', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);

lines.forEach((l, i) => {
  if (l.includes('KHỐI') || l.includes('class="ui-block') || l.includes('id="block') || l.includes('class="block-stage')) {
    console.log(`${i + 1}: ${l.trim().slice(0, 100)}`);
  }
});
