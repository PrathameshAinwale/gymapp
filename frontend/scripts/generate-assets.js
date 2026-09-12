import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(frontendDir, 'public');
const resDir = path.resolve(frontendDir, 'android', 'app', 'src', 'main', 'res');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

// Helper to render HTML with specific size to PNG
function renderPng(htmlContent, outputPath, width, height) {
  const tmpHtml = path.resolve(__dirname, `_temp_${Date.now()}_${width}x${height}.html`);
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${width}px; height: ${height}px; background: transparent; overflow: hidden; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

  fs.writeFileSync(tmpHtml, fullHtml, 'utf8');

  try {
    const cmd = `"${edgePath}" --headless=new --screenshot="${outputPath}" --window-size=${width},${height} --default-background-color=00000000 --hide-scrollbars "file://${tmpHtml.replace(/\\/g, '/')}"`;
    execSync(cmd, { stdio: 'ignore' });
    console.log(`✓ Generated: ${outputPath} (${width}x${height})`);
  } catch (err) {
    console.error(`Failed generating ${outputPath}:`, err.message);
  } finally {
    if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  }
}

// Read SVG source
const fullSvg = fs.readFileSync(path.resolve(publicDir, 'pulsefit-logo.svg'), 'utf8');
const iconSvg = fs.readFileSync(path.resolve(publicDir, 'pulsefit-icon.svg'), 'utf8');

// HTML for Icon
const iconHtml = (padding = '0') => `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#050811; padding:${padding};">
    ${iconSvg.replace('width="100%" height="100%"', 'style="width:100%; height:100%;"')}
  </div>
`;

// HTML for Launcher Icon (with nice dark circular/squircle frame)
const launcherHtml = `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#050811; border-radius:22%;">
    ${iconSvg.replace('width="100%" height="100%"', 'style="width:82%; height:82%;"')}
  </div>
`;

const roundLauncherHtml = `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#050811; border-radius:50%;">
    ${iconSvg.replace('width="100%" height="100%"', 'style="width:80%; height:80%;"')}
  </div>
`;

// HTML for Splash Screen
const splashHtml = (orientation = 'port') => `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#050811; position:relative;">
    <div style="width:${orientation === 'port' ? '82%' : '45%'}; max-width:480px;">
      ${fullSvg.replace('width="100%" height="100%"', 'style="width:100%; height:auto;"')}
    </div>
  </div>
`;

console.log('--- Generating App Assets ---');

// 1. Public PNG Icons
renderPng(launcherHtml, path.resolve(publicDir, 'pulsefit-icon-512.png'), 512, 512);
renderPng(launcherHtml, path.resolve(publicDir, 'pulsefit-icon-192.png'), 192, 192);
renderPng(splashHtml('port'), path.resolve(publicDir, 'pulsefit-hero.png'), 800, 800);

// 2. Android Mipmap Icons
const mipmaps = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

if (fs.existsSync(resDir)) {
  for (const m of mipmaps) {
    const targetDir = path.resolve(resDir, m.dir);
    if (fs.existsSync(targetDir)) {
      renderPng(launcherHtml, path.resolve(targetDir, 'ic_launcher.png'), m.size, m.size);
      renderPng(roundLauncherHtml, path.resolve(targetDir, 'ic_launcher_round.png'), m.size, m.size);
      renderPng(iconHtml('10%'), path.resolve(targetDir, 'ic_launcher_foreground.png'), m.size, m.size);
    }
  }

  // 3. Android Splash Screens
  const splashes = [
    { dir: 'drawable', w: 480, h: 800, type: 'port' },
    { dir: 'drawable-port-hdpi', w: 480, h: 800, type: 'port' },
    { dir: 'drawable-port-mdpi', w: 320, h: 480, type: 'port' },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280, type: 'port' },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600, type: 'port' },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920, type: 'port' },
    { dir: 'drawable-land-hdpi', w: 800, h: 480, type: 'land' },
    { dir: 'drawable-land-mdpi', w: 480, h: 320, type: 'land' },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720, type: 'land' },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960, type: 'land' },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280, type: 'land' },
  ];

  for (const s of splashes) {
    const targetDir = path.resolve(resDir, s.dir);
    if (fs.existsSync(targetDir)) {
      renderPng(splashHtml(s.type), path.resolve(targetDir, 'splash.png'), s.w, s.h);
    }
  }
}

console.log('✓ Asset generation complete!');
