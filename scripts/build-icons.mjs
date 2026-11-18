// public/ 아이콘 PNG 생성 (iOS·안드로이드 홈 화면용). iOS가 모서리를 직접 둥글게 깎으므로 PNG는 꽉 찬 정사각형으로 만든다.
import sharp from 'sharp';
import fs from 'node:fs';

const BG = '#1B1F3B';
const mark = (scale = 1) => {
  const t = `translate(${60 - 60 * scale} ${60 - 60 * scale}) scale(${scale})`;
  return `<g transform="${t}">
    <path d="M36 90V62c0-11.6 8.4-20 19.5-20 8.2 0 14.6 4.6 17.6 11.4L86 31" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M72 30h15v15" fill="none" stroke="#7DF9FF" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
};
const square = (scale) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${BG}"/>${mark(scale)}</svg>`);

const out = [
  ['apple-touch-icon-v2.png', 180, 1],
  ['icon-v2-64.png', 64, 1],
  ['icon-v2-192.png', 192, 1],
  ['icon-v2-512.png', 512, 1],
  ['icon-v2-maskable-512.png', 512, 0.78], // 안드로이드 마스크 안전 영역
];
for (const [name, size, scale] of out) {
  await sharp(square(scale), { density: 600 }).resize(size, size).png().toFile(`public/${name}`);
}
// favicon.ico 대신 32px PNG를 ico 이름으로 둔다(브라우저는 PNG 아이콘도 읽음)
await sharp(fs.readFileSync('public/icon-v2.svg'), { density: 300 }).resize(48, 48).png().toFile('public/favicon.ico');
console.log('icons ok');
