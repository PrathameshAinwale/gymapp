import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const newImagePath = 'C:\\Users\\Arch Enterprises 1\\.gemini\\antigravity-ide\\brain\\ba25e5a5-c169-4b80-9549-e360862b60fe\\.user_uploaded\\media_1789188668648.png';
const frontendDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(frontendDir, 'public');
const assetsDir = path.resolve(frontendDir, 'src', 'assets');
const resDir = path.resolve(frontendDir, 'android', 'app', 'src', 'main', 'res');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// 1. Direct copy to assets and public
fs.copyFileSync(newImagePath, path.resolve(publicDir, 'pulsefit-logo.png'));
fs.copyFileSync(newImagePath, path.resolve(publicDir, 'pulsefit-icon.png'));
fs.copyFileSync(newImagePath, path.resolve(assetsDir, 'pulsefit-logo.png'));
fs.copyFileSync(newImagePath, path.resolve(assetsDir, 'pulsefit-icon.png'));
console.log('✓ Copied new image to public & assets');

const imgBase64 = 'data:image/png;base64,' + fs.readFileSync(newImagePath).toString('base64');

// Helper to render HTML to PNG via Edge headless
function renderFromHtml(htmlContent, outputPath, width, height) {
  const tmpHtml = path.resolve(__dirname, `_render_${Date.now()}_${width}x${height}.html`);
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:${width}px; height:${height}px; background:#000000; overflow:hidden; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`;

  fs.writeFileSync(tmpHtml, fullHtml, 'utf8');
  try {
    const cmd = `"${edgePath}" --headless=new --screenshot="${outputPath}" --window-size=${width},${height} --default-background-color=00000000 --hide-scrollbars "file://${tmpHtml.replace(/\\/g, '/')}"`;
    execSync(cmd, { stdio: 'ignore' });
    console.log(`✓ Generated: ${path.basename(outputPath)} (${width}x${height})`);
  } catch (e) {
    console.error(`Error rendering ${outputPath}:`, e.message);
  } finally {
    if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  }
}

// Full icon html
const iconHtml = `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#000000;">
    <img src="${imgBase64}" style="width:100%; height:100%; object-fit:contain;" />
  </div>
`;

// Round icon html
const roundIconHtml = `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#000000; border-radius:50%; overflow:hidden;">
    <img src="${imgBase64}" style="width:100%; height:100%; object-fit:contain;" />
  </div>
`;

// Foreground icon html
const fgIconHtml = `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:transparent;">
    <img src="${imgBase64}" style="width:75%; height:75%; object-fit:contain;" />
  </div>
`;

// Splash screen html
const splashHtml = (isLand = false) => `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#000000;">
    <img src="${imgBase64}" style="${isLand ? 'height:70%; width:auto;' : 'width:70%; max-width:400px; height:auto;'} object-fit:contain;" />
  </div>
`;

// 2. High-res PWA icons
renderFromHtml(iconHtml, path.resolve(publicDir, 'pulsefit-icon-512.png'), 512, 512);
renderFromHtml(iconHtml, path.resolve(publicDir, 'pulsefit-icon-192.png'), 192, 192);

// 3. Android Mipmap App Icons
const mipmaps = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 }
];

for (const m of mipmaps) {
  const targetDir = path.resolve(resDir, m.dir);
  if (fs.existsSync(targetDir)) {
    renderFromHtml(iconHtml, path.resolve(targetDir, 'ic_launcher.png'), m.size, m.size);
    renderFromHtml(roundIconHtml, path.resolve(targetDir, 'ic_launcher_round.png'), m.size, m.size);
    renderFromHtml(fgIconHtml, path.resolve(targetDir, 'ic_launcher_foreground.png'), m.size, m.size);
  }
}

// 4. Android Splash Screens
const splashes = [
  { dir: 'drawable', w: 480, h: 800, land: false },
  { dir: 'drawable-port-hdpi', w: 480, h: 800, land: false },
  { dir: 'drawable-port-mdpi', w: 320, h: 480, land: false },
  { dir: 'drawable-port-xhdpi', w: 720, h: 1280, land: false },
  { dir: 'drawable-port-xxhdpi', w: 960, h: 1600, land: false },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920, land: false },
  { dir: 'drawable-land-hdpi', w: 800, h: 480, land: true },
  { dir: 'drawable-land-mdpi', w: 480, h: 320, land: true },
  { dir: 'drawable-land-xhdpi', w: 1280, h: 720, land: true },
  { dir: 'drawable-land-xxhdpi', w: 1600, h: 960, land: true },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280, land: true },
];

for (const s of splashes) {
  const targetDir = path.resolve(resDir, s.dir);
  if (fs.existsSync(targetDir)) {
    renderFromHtml(splashHtml(s.land), path.resolve(targetDir, 'splash.png'), s.w, s.h);
  }
}

console.log('✓ All assets generated with the new logo icon!');
