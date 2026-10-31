// 把 COCA_with_translation.txt 解析成紧凑的 dict.js（window.DICT = { word: [[词性, 释义], ...] }）
// 用法：node build-dict.js
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'COCA_with_translation.txt');
const out = path.join(__dirname, 'dict.js');

const raw = fs.readFileSync(src, 'utf8');

// 每个词块用一行 em-dash（—）分隔；块内首行是单词，其余是「词性. 释义」行
const blocks = raw.split(/\r?\n—+\r?\n/);

// 清洗释义：去掉「(X)人名 / (X)地名」这类姓名、地名来源噪音
function clean(meanings) {
  const segs = meanings.split('；').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!segs.length) return null;
  // 若首段是「人名/地名」来源，整行都是姓名/地名噪音，丢弃
  if (/人名|地名/.test(segs[0])) return null;
  const cleaned = segs.filter(s => !/人名|地名/.test(s));
  return cleaned.length ? cleaned.join('；') : null;
}

const dict = {};
let dropped = 0;

function addEntry(word, pos, mean) {
  if (!dict[word]) dict[word] = [];
  const existing = dict[word].find(e => e[0] === pos);
  if (existing) {
    // 同一词性合并义项，按分号切段去重
    const merged = new Set();
    (existing[1] + '；' + mean).split('；').map(s => s.trim()).filter(Boolean).forEach(s => merged.add(s));
    existing[1] = [...merged].join('；');
  } else {
    dict[word].push([pos, mean]);
  }
}

for (const block of blocks) {
  const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) continue;
  const word = lines[0].toLowerCase();
  if (!/^[a-z]/.test(word)) continue;

  for (const line of lines.slice(1)) {
    const m = line.match(/^([a-z]+\.)\s*(.*)$/i);
    if (!m) continue;
    const cleaned = clean(m[2]);
    if (cleaned) addEntry(word, m[1], cleaned);
    else dropped++;
  }
}

const js = 'window.DICT=' + JSON.stringify(dict) + ';';
fs.writeFileSync(out, js, 'utf8');

const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`✅ 不同词条数：${Object.keys(dict).length}；丢弃的姓名/地名噪音段：${dropped}`);
console.log(`📦 dict.js 大小：${kb} KB`);

// 抽样校验（重点看多词性合并效果）
for (const w of ['work', 'record', 'address', 'light', 'change', 'right', 'abandon']) {
  console.log(w, '→', JSON.stringify(dict[w]).slice(0, 180));
}
