import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userUploadedPath = 'C:\\Users\\Arch Enterprises 1\\.gemini\\antigravity-ide\\brain\\ba25e5a5-c169-4b80-9549-e360862b60fe\\.user_uploaded\\media_1789187439344.jpg';
const frontendDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(frontendDir, 'public');
const assetsDir = path.resolve(frontendDir, 'src', 'assets');
const resDir = path.resolve(frontendDir, 'android', 'app', 'src', 'main', 'res');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// 1. Copy exact original file
fs.copyFileSync(userUploadedPath, path.resolve(publicDir, 'pulsefit-logo.png'));
fs.copyFileSync(userUploadedPath, path.resolve(assetsDir, 'pulsefit-logo.png'));
console.log('✓ Copied exact original logo to public & assets');

// Helper to render HTML to PNG via Edge headless
function renderFromHtml(htmlContent, outputPath, width, height) {
  const tmpHtml = path.resolve(__dirname, `_render_${Date.now()}_${width}x${height}.html`);
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:${width}px; height:${height}px; background:#050811; overflow:hidden; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`;

  fs.writeFileSync(tmpHtml, fullHtml, 'utf8');
  try {
    const cmd = `"${edgePath}" --headless=new --screenshot="${outputPath}" --window-size=${width},${height} --default-background-color=00000000 --hide-scrollbars "file://${tmpHtml.replace(/\\/g, '/')}"`;
    execSync(cmd, { stdio: 'ignore' });
    console.log(`✓ Created: ${path.basename(outputPath)} (${width}x${height})`);
  } catch (e) {
    console.error(`Error rendering ${outputPath}:`, e.message);
  } finally {
    if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  }
}

const originalDataUri = 'data:image/jpeg;base64,' + fs.readFileSync(userUploadedPath).toString('base64');

// HTML to crop top "P" icon from original image
const croppedIconHtml = (radius = '20%') => `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#050811; border-radius:${radius}; overflow:hidden;">
    <img src="${originalDataUri}" style="width:130%; height:130%; object-fit:cover; object-position:center 20%;" />
  </div>
`;

// HTML for Full Square App Icon (Centered whole image)
const fullSquareIconHtml = `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#050811; overflow:hidden;">
    <img src="${originalDataUri}" style="width:100%; height:100%; object-fit:contain;" />
  </div>
`;

// HTML for Round Icon
const roundIconHtml = `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#050811; border-radius:50%; overflow:hidden;">
    <img src="${originalDataUri}" style="width:100%; height:100%; object-fit:contain; transform:scale(1.05);" />
  </div>
`;

// HTML for Splash
const splashHtml = (isLand = false) => `
  <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#050811; overflow:hidden;">
    <img src="${originalDataUri}" style="${isLand ? 'height:85%; width:auto;' : 'width:85%; height:auto;'} object-fit:contain;" />
  </div>
`;

// 2. Generate cropped icon PNG & full square icon PNG
renderFromHtml(croppedIconHtml('0%'), path.resolve(publicDir, 'pulsefit-icon.png'), 512, 512);
renderFromHtml(croppedIconHtml('0%'), path.resolve(assetsDir, 'pulsefit-icon.png'), 512, 512);

// 3. Android Mipmap App Icons (Exact original image as launcher)
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
    renderFromHtml(fullSquareIconHtml, path.resolve(targetDir, 'ic_launcher.png'), m.size, m.size);
    renderFromHtml(roundIconHtml, path.resolve(targetDir, 'ic_launcher_round.png'), m.size, m.size);
    renderFromHtml(croppedIconHtml('0%'), path.resolve(targetDir, 'ic_launcher_foreground.png'), m.size, m.size);
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

console.log('✓ All application and mobile icons generated successfully from the uploaded image!');
