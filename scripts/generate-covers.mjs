import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const outDir = join(process.cwd(), 'public', 'assets', 'covers');
const width = 1200;
const height = 720;

const covers = [
  {
    name: 'memory',
    label: 'Jade Courtyard',
    svg: memoryGarden()
  },
  {
    name: 'reaction',
    label: 'Cinnabar Bridge',
    svg: reactionBridge()
  },
  {
    name: 'adventure',
    label: 'Cloud Archive',
    svg: archiveDrift()
  },
  {
    name: 'quiz',
    label: 'Moon Observatory',
    svg: quizObservatory()
  },
  {
    name: 'rhythm',
    label: 'Neon Scoreline',
    svg: rhythmScoreline()
  },
  {
    name: 'stealth',
    label: 'Shadow Lantern',
    svg: stealthLantern()
  },
  {
    name: 'shooter',
    label: 'Star Skiff',
    svg: starSkiff()
  },
  {
    name: 'gravity',
    label: 'Gravity Pagoda',
    svg: gravityPagoda()
  }
];

await mkdir(outDir, { recursive: true });

for (const cover of covers) {
  const svgPath = join(outDir, `${cover.name}.svg`);
  await writeFile(svgPath, cover.svg, 'utf8');
  console.log(`generated ${cover.name}.svg - ${cover.label}`);
}

const renderer = await findChromium();
if (!renderer) {
  console.log('png render skipped - no Chromium/Chrome/Edge executable found');
  process.exit(0);
}

const profileDir = join(process.cwd(), 'output', 'cover-render-profile');
await mkdir(profileDir, { recursive: true });
for (const cover of covers) {
  const svgPath = join(outDir, `${cover.name}.svg`);
  const pngPath = join(outDir, `${cover.name}.png`);
  await renderPng(renderer, svgPath, pngPath, profileDir);
  console.log(`rendered ${cover.name}.png - ${cover.label}`);
}

async function findChromium() {
  const candidates = [
    process.env.COVER_RENDERER,
    await latestPlaywrightBrowser('chromium-*', 'chrome-win', 'chrome.exe'),
    await latestPlaywrightBrowser('chromium_headless_shell-*', 'chrome-win', 'headless_shell.exe'),
    join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) || '';
}

async function latestPlaywrightBrowser(prefix, ...parts) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (!existsSync(base)) return '';
  const names = await readdir(base).catch(() => []);
  const match = names.filter((name) => {
    const re = new RegExp(`^${prefix.replace('*', '.*')}$`);
    return re.test(name);
  }).sort().at(-1);
  return match ? join(base, match, ...parts) : '';
}

async function renderPng(renderer, svgPath, pngPath, profileDir) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    `--user-data-dir=${resolve(profileDir)}`,
    `--window-size=${width},${height}`,
    `--screenshot=${resolve(pngPath)}`,
    pathToFileURL(resolve(svgPath)).href
  ];
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(renderer, args, { stdio: 'ignore' });
    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`Chromium exited with code ${code}`));
    });
  });
}

function sharedDefs(id, a, b, c) {
  return `
    <defs>
      <linearGradient id="${id}-bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${a}"/>
        <stop offset="48%" stop-color="${b}"/>
        <stop offset="100%" stop-color="${c}"/>
      </linearGradient>
      <radialGradient id="${id}-glow" cx="70%" cy="22%" r="74%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".34"/>
        <stop offset="38%" stop-color="#ffffff" stop-opacity=".08"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="18"/>
      </filter>
      <pattern id="${id}-grid" width="64" height="64" patternUnits="userSpaceOnUse">
        <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#fff8ea" stroke-opacity=".08" stroke-width="1"/>
      </pattern>
      <filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#020617" flood-opacity=".35"/>
      </filter>
    </defs>`;
}

function coverShell(id, palette, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${id}">
    ${sharedDefs(id, ...palette)}
    <rect width="${width}" height="${height}" fill="url(#${id}-bg)"/>
    <rect width="${width}" height="${height}" fill="url(#${id}-grid)"/>
    <rect width="${width}" height="${height}" fill="url(#${id}-glow)"/>
    <circle cx="1000" cy="130" r="210" fill="#fff8ea" opacity=".08" filter="url(#${id}-soft)"/>
    <circle cx="188" cy="610" r="190" fill="#000000" opacity=".16" filter="url(#${id}-soft)"/>
    ${body}
    <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#fff8ea" stroke-opacity=".14" stroke-width="2"/>
  </svg>`;
}

function memoryGarden() {
  const cards = [
    [176, 210, '#d76145', 'M12 48h80v84H12z'],
    [332, 152, '#76c8ad', 'M52 20l58 58-58 58-58-58z'],
    [488, 230, '#b8d890', 'M18 22h108v108H18z'],
    [644, 170, '#d8b86c', 'M70 18l56 104H14z']
  ].map(([x, y, color, path], i) => `
    <g transform="translate(${x} ${y}) rotate(${[-8, 7, -3, 9][i]})" filter="url(#memory-shadow)">
      <rect width="150" height="188" rx="22" fill="#fff7ed" opacity=".96"/>
      <rect x="14" y="14" width="122" height="160" rx="16" fill="#0f172a" opacity=".88"/>
      <path d="${path}" transform="translate(18 26)" fill="${color}" opacity=".9"/>
      <path d="M28 142h94" stroke="#fff8ea" stroke-opacity=".65" stroke-width="8" stroke-linecap="round"/>
    </g>`).join('');

  return coverShell('memory', ['#07110f', '#2f5f4f', '#d8b86c'], `
    <path d="M92 552 C250 456 410 620 580 520 C748 420 848 470 1042 344" fill="none" stroke="#d9f99d" stroke-opacity=".58" stroke-width="5"/>
    <path d="M0 612 C160 542 272 626 438 570 C592 518 754 588 916 518 C1052 460 1118 444 1200 462 L1200 720 L0 720 Z" fill="#052e2b" opacity=".72"/>
    <g opacity=".7">
      <path d="M154 646c28-82 74-122 138-142" stroke="#99f6e4" stroke-width="4" fill="none"/>
      <path d="M246 640c-6-84 26-148 96-194" stroke="#fde68a" stroke-width="4" fill="none"/>
      <path d="M884 646c18-98 74-168 168-214" stroke="#fda4af" stroke-width="4" fill="none"/>
    </g>
    ${cards}
    <g transform="translate(818 284)" filter="url(#memory-shadow)">
      <rect x="0" y="0" width="216" height="176" rx="38" fill="#111827" opacity=".96"/>
      <rect x="30" y="38" width="58" height="44" rx="22" fill="#5eead4"/>
      <rect x="128" y="38" width="58" height="44" rx="22" fill="#fef08a"/>
      <path d="M66 118c28 22 58 22 86 0" stroke="#fda4af" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M108 -34v34" stroke="#e0f2fe" stroke-width="10" stroke-linecap="round"/>
      <circle cx="108" cy="-46" r="16" fill="#d76145"/>
    </g>
    <g transform="translate(76 76)">
      <text y="0" font-family="Inter, Segoe UI, sans-serif" font-size="28" font-weight="800" fill="#fff8ea" opacity=".92">MEMORY</text>
      <text y="42" font-family="Inter, Segoe UI, sans-serif" font-size="48" font-weight="900" fill="#fff8ea">Jade Courtyard</text>
    </g>`);
}

function reactionBridge() {
  const rings = [0, 1, 2, 3].map((i) => `
    <circle cx="828" cy="330" r="${90 + i * 52}" fill="none" stroke="${['#76c8ad', '#d76145', '#d8b86c', '#ffffff'][i]}" stroke-opacity="${.86 - i * .14}" stroke-width="${16 - i * 2}" stroke-dasharray="${i % 2 ? '64 28' : '110 34'}"/>`).join('');

  return coverShell('reaction', ['#1a1110', '#7b2f24', '#d8b86c'], `
    <path d="M120 534 L338 208 L642 482 L918 126 L1080 534 Z" fill="#020617" opacity=".42"/>
    <g transform="translate(134 426)" filter="url(#reaction-shadow)">
      <path d="M0 116h930c42 0 72 30 72 72H-72c0-42 30-72 72-72Z" fill="#0f172a" opacity=".94"/>
      <rect x="68" y="0" width="796" height="166" rx="34" fill="#18233d"/>
      <rect x="102" y="32" width="188" height="74" rx="14" fill="#0ea5e9" opacity=".42"/>
      <rect x="334" y="32" width="218" height="74" rx="14" fill="#d76145" opacity=".38"/>
      <rect x="596" y="32" width="226" height="74" rx="14" fill="#76c8ad" opacity=".38"/>
      <path d="M122 68h126M364 68h154M628 68h154" stroke="#fff8ea" stroke-opacity=".62" stroke-width="9" stroke-linecap="round"/>
      <circle cx="220" cy="134" r="18" fill="#fff0c8"/>
      <circle cx="466" cy="134" r="18" fill="#93c5fd"/>
      <circle cx="724" cy="134" r="18" fill="#fecaca"/>
    </g>
    <g filter="url(#reaction-shadow)">
      ${rings}
      <circle cx="828" cy="330" r="72" fill="#fff0c8"/>
      <circle cx="828" cy="330" r="42" fill="#dc2626"/>
      <path d="M828 330 L896 192" stroke="#fff8ea" stroke-width="12" stroke-linecap="round"/>
    </g>
    <g opacity=".78">
      <path d="M206 184c126 42 250 40 374-6" stroke="#76c8ad" stroke-width="5" fill="none"/>
      <path d="M214 240c126 42 250 40 374-6" stroke="#fff0c8" stroke-width="5" fill="none"/>
      <path d="M214 296c126 42 250 40 374-6" stroke="#d76145" stroke-width="5" fill="none"/>
    </g>
    <g transform="translate(76 76)">
      <text y="0" font-family="Inter, Segoe UI, sans-serif" font-size="28" font-weight="800" fill="#fff8ea" opacity=".92">REACTION</text>
      <text y="42" font-family="Inter, Segoe UI, sans-serif" font-size="48" font-weight="900" fill="#fff8ea">Cinnabar Bridge</text>
    </g>`);
}

function archiveDrift() {
  const shelves = [0, 1, 2].map((i) => `
    <g transform="translate(${238 + i * 196} ${186 + i * 30}) rotate(${[-5, 4, -2][i]})" filter="url(#adventure-shadow)">
      <rect width="156" height="214" rx="18" fill="#f8fafc" opacity=".94"/>
      <rect x="22" y="22" width="28" height="150" rx="6" fill="#d76145"/>
      <rect x="58" y="40" width="28" height="132" rx="6" fill="#14b8a6"/>
      <rect x="94" y="28" width="28" height="144" rx="6" fill="#6366f1"/>
      <path d="M24 184h108" stroke="#111827" stroke-opacity=".72" stroke-width="8" stroke-linecap="round"/>
    </g>`).join('');

  return coverShell('adventure', ['#07110f', '#365948', '#b8894f'], `
    <path d="M114 566 C228 458 390 452 514 514 C670 592 758 438 916 466 C1032 486 1096 564 1200 526 L1200 720 L0 720 L0 628 C42 614 78 598 114 566Z" fill="#021414" opacity=".58"/>
    <g opacity=".76">
      <path d="M96 278h972" stroke="#fff8ea" stroke-opacity=".14" stroke-width="2"/>
      <path d="M180 154h780" stroke="#fff8ea" stroke-opacity=".12" stroke-width="2"/>
      <path d="M270 92v508M520 72v512M780 86v500M1018 156v390" stroke="#fff8ea" stroke-opacity=".1" stroke-width="2"/>
    </g>
    ${shelves}
    <g transform="translate(728 232)" filter="url(#adventure-shadow)">
      <path d="M0 84 C74 10 168 -22 270 12 C230 132 146 198 26 206 Z" fill="#fff0c8" opacity=".96"/>
      <path d="M52 96c58-50 122-66 194-48" stroke="#0f172a" stroke-opacity=".48" stroke-width="10" fill="none"/>
      <path d="M86 136c36-28 80-38 132-28" stroke="#0f172a" stroke-opacity=".32" stroke-width="8" fill="none"/>
    </g>
    <g opacity=".85">
      <circle cx="162" cy="486" r="9" fill="#fef08a"/>
      <circle cx="1008" cy="248" r="11" fill="#76c8ad"/>
      <circle cx="1038" cy="430" r="8" fill="#d76145"/>
      <circle cx="676" cy="130" r="7" fill="#fde68a"/>
    </g>
    <g transform="translate(76 76)">
      <text y="0" font-family="Inter, Segoe UI, sans-serif" font-size="28" font-weight="800" fill="#fff8ea" opacity=".92">ADVENTURE</text>
      <text y="42" font-family="Inter, Segoe UI, sans-serif" font-size="48" font-weight="900" fill="#fff8ea">Cloud Archive</text>
    </g>`);
}

function quizObservatory() {
  const nodes = [
    [244, 264, 34, '#d76145'], [364, 386, 24, '#76c8ad'], [516, 238, 30, '#b8d890'],
    [664, 354, 26, '#d8b86c'], [820, 220, 38, '#76c8ad'], [944, 376, 28, '#d76145']
  ];
  const nodeSvg = nodes.map(([x, y, r, color]) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="${color}" filter="url(#quiz-shadow)"/>
    <circle cx="${x}" cy="${y}" r="${Math.max(6, r - 14)}" fill="#fff8ea" opacity=".42"/>`).join('');
  const links = nodes.slice(0, -1).map((node, i) => `
    <path d="M${node[0]} ${node[1]} C${node[0] + 90} ${node[1] - 80}, ${nodes[i + 1][0] - 90} ${nodes[i + 1][1] + 80}, ${nodes[i + 1][0]} ${nodes[i + 1][1]}" stroke="#fff8ea" stroke-opacity=".42" stroke-width="5" fill="none"/>`).join('');

  return coverShell('quiz', ['#0b1714', '#24352c', '#8f3a2b'], `
    <g transform="translate(140 116)">
      <ellipse cx="460" cy="262" rx="420" ry="214" fill="#020617" opacity=".32"/>
      <ellipse cx="460" cy="262" rx="404" ry="198" fill="none" stroke="#fff8ea" stroke-opacity=".24" stroke-width="4"/>
      <ellipse cx="460" cy="262" rx="310" ry="128" fill="none" stroke="#fff8ea" stroke-opacity=".18" stroke-width="3"/>
    </g>
    ${links}
    ${nodeSvg}
    <g transform="translate(476 422)" filter="url(#quiz-shadow)">
      <rect width="248" height="120" rx="24" fill="#f8fafc" opacity=".96"/>
      <text x="124" y="82" text-anchor="middle" font-family="Inter, Segoe UI, sans-serif" font-size="78" font-weight="900" fill="#111827">?</text>
      <path d="M36 28h74M138 28h74M42 96h164" stroke="#111827" stroke-opacity=".32" stroke-width="8" stroke-linecap="round"/>
    </g>
    <g opacity=".85">
      <path d="M106 530h102M980 170h116M880 554h160" stroke="#fff0c8" stroke-width="7" stroke-linecap="round"/>
      <path d="M132 564h62M1008 204h62M908 588h92" stroke="#76c8ad" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g transform="translate(76 76)">
      <text y="0" font-family="Inter, Segoe UI, sans-serif" font-size="28" font-weight="800" fill="#fff8ea" opacity=".92">QUIZ</text>
      <text y="42" font-family="Inter, Segoe UI, sans-serif" font-size="48" font-weight="900" fill="#fff8ea">Moon Observatory</text>
    </g>`);
}

function rhythmScoreline() {
  const notes = [0, 1, 2, 3, 4].map((i) => `
    <g transform="translate(${208 + i * 168} ${204 + (i % 2) * 86})" filter="url(#rhythm-shadow)">
      <circle cx="0" cy="0" r="${28 + i % 2 * 8}" fill="${i % 2 ? '#f472b6' : '#f2c879'}"/>
      <rect x="24" y="-102" width="12" height="108" rx="6" fill="#fff8ea" opacity=".78"/>
      <path d="M34 -96c48 8 78 26 96 54" stroke="#8bd3ff" stroke-width="10" stroke-linecap="round" fill="none"/>
    </g>`).join('');

  return coverShell('rhythm', ['#140d25', '#3b246d', '#f2c879'], `
    <path d="M92 520 C260 404 442 616 598 462 C762 300 914 408 1084 238" fill="none" stroke="#f2c879" stroke-opacity=".58" stroke-width="9" stroke-linecap="round" stroke-dasharray="42 26"/>
    <path d="M120 572h944" stroke="#fff8ea" stroke-opacity=".18" stroke-width="7" stroke-linecap="round"/>
    <path d="M120 612h944" stroke="#8bd3ff" stroke-opacity=".18" stroke-width="7" stroke-linecap="round"/>
    ${notes}
    <g transform="translate(472 414)" filter="url(#rhythm-shadow)">
      <rect x="0" y="74" width="340" height="40" rx="20" fill="#0f1026"/>
      <rect x="34" y="0" width="46" height="82" rx="18" fill="#f2c879"/>
      <path d="M80 38c72-70 178-72 242-6" stroke="#f472b6" stroke-width="14" stroke-linecap="round" fill="none"/>
      <path d="M112 28l52 52M232 24l-42 62" stroke="#fff8ea" stroke-opacity=".78" stroke-width="10" stroke-linecap="round"/>
      <circle cx="318" cy="28" r="22" fill="#8bd3ff"/>
    </g>
    <g opacity=".72">
      <path d="M126 318h112M886 144h164M936 604h102" stroke="#fff8ea" stroke-width="6" stroke-linecap="round"/>
      <path d="M156 348h72M916 174h94M964 634h62" stroke="#f472b6" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g transform="translate(76 76)">
      <text y="0" font-family="Inter, Segoe UI, sans-serif" font-size="28" font-weight="800" fill="#fff8ea" opacity=".92">RHYTHM</text>
      <text y="42" font-family="Inter, Segoe UI, sans-serif" font-size="48" font-weight="900" fill="#fff8ea">Neon Scoreline</text>
    </g>`);
}

function stealthLantern() {
  const cones = [224, 520, 830].map((x, i) => `
    <g opacity="${i === 1 ? '.42' : '.34'}">
      <path d="M${x} 126 L${x - 130} 590 L${x + 170} 590 Z" fill="${i === 1 ? '#d8b86c' : '#76c8ad'}"/>
      <circle cx="${x}" cy="126" r="22" fill="#fff8ea"/>
    </g>`).join('');

  return coverShell('stealth', ['#05070b', '#1d2930', '#76c8ad'], `
    ${cones}
    <path d="M0 594 C150 548 300 626 460 570 C626 512 784 610 948 534 C1062 480 1138 492 1200 514 L1200 720 L0 720 Z" fill="#020617" opacity=".78"/>
    <g transform="translate(164 456)" filter="url(#stealth-shadow)">
      <rect x="0" y="74" width="940" height="50" rx="25" fill="#0b1118"/>
      <path d="M80 54h180M362 34h168M646 58h210" stroke="#76c8ad" stroke-opacity=".5" stroke-width="12" stroke-linecap="round"/>
      <g transform="translate(418 10)">
        <path d="M0 82c38-58 94-86 168-82c-6 78-50 132-132 164Z" fill="#0f172a"/>
        <circle cx="78" cy="48" r="17" fill="#c4b5fd"/>
        <path d="M48 104c54-16 98-14 132 6" stroke="#fff8ea" stroke-opacity=".62" stroke-width="9" stroke-linecap="round"/>
      </g>
    </g>
    <g filter="url(#stealth-shadow)">
      <rect x="880" y="300" width="96" height="150" rx="18" fill="#18231d"/>
      <circle cx="928" cy="334" r="18" fill="#f43f5e"/>
      <path d="M912 380h32M900 414h56" stroke="#fff8ea" stroke-opacity=".44" stroke-width="8" stroke-linecap="round"/>
    </g>
    <g transform="translate(76 76)">
      <text y="0" font-family="Inter, Segoe UI, sans-serif" font-size="28" font-weight="800" fill="#fff8ea" opacity=".92">STEALTH</text>
      <text y="42" font-family="Inter, Segoe UI, sans-serif" font-size="48" font-weight="900" fill="#fff8ea">Shadow Lantern</text>
    </g>`);
}

function starSkiff() {
  const bullets = [0, 1, 2, 3, 4, 5].map((i) => `
    <g transform="translate(${244 + i * 132} ${166 + (i % 3) * 98}) rotate(${i % 2 ? -12 : 16})" filter="url(#shooter-shadow)">
      <path d="M0 0h86" stroke="${i % 2 ? '#facc15' : '#67e8f9'}" stroke-width="12" stroke-linecap="round"/>
      <circle cx="94" cy="0" r="17" fill="${i % 2 ? '#f97364' : '#67e8f9'}"/>
    </g>`).join('');

  return coverShell('shooter', ['#081325', '#285a8f', '#f97364'], `
    <path d="M80 584 C240 492 382 616 538 518 C728 400 856 492 1056 310" fill="none" stroke="#67e8f9" stroke-opacity=".44" stroke-width="5"/>
    <g opacity=".62">
      <circle cx="160" cy="164" r="5" fill="#fff8ea"/><circle cx="390" cy="94" r="4" fill="#fff8ea"/><circle cx="1028" cy="136" r="6" fill="#fff8ea"/><circle cx="948" cy="520" r="4" fill="#fff8ea"/>
    </g>
    ${bullets}
    <g transform="translate(332 356)" filter="url(#shooter-shadow)">
      <path d="M0 90 C124 2 286 -16 426 48 C332 164 166 212 10 162 Z" fill="#f8fafc" opacity=".96"/>
      <path d="M112 94 C194 44 274 38 352 72" stroke="#081325" stroke-opacity=".45" stroke-width="14" stroke-linecap="round" fill="none"/>
      <path d="M424 52l118-42l-48 108Z" fill="#f97364"/>
      <circle cx="176" cy="82" r="28" fill="#67e8f9"/>
      <path d="M-70 126c42-28 82-40 122-34" stroke="#facc15" stroke-width="14" stroke-linecap="round" fill="none"/>
    </g>
    <g filter="url(#shooter-shadow)">
      <rect x="914" y="396" width="118" height="118" rx="34" fill="#0f172a"/>
      <circle cx="973" cy="455" r="34" fill="#facc15"/>
      <path d="M946 455h54M973 428v54" stroke="#081325" stroke-width="9" stroke-linecap="round"/>
    </g>
    <g transform="translate(76 76)">
      <text y="0" font-family="Inter, Segoe UI, sans-serif" font-size="28" font-weight="800" fill="#fff8ea" opacity=".92">SHOOTER</text>
      <text y="42" font-family="Inter, Segoe UI, sans-serif" font-size="48" font-weight="900" fill="#fff8ea">Star Skiff</text>
    </g>`);
}

function gravityPagoda() {
  const platforms = [
    [154, 512, 260, 22, -7], [448, 396, 220, 22, 6], [722, 274, 250, 22, -5], [836, 574, 230, 22, 7]
  ].map(([x, y, w, h, r], i) => `
    <g transform="translate(${x} ${y}) rotate(${r})" filter="url(#gravity-shadow)">
      <rect width="${w}" height="${h}" rx="11" fill="${i % 2 ? '#d8b4fe' : '#b8d890'}"/>
      <rect x="12" y="7" width="${w - 24}" height="4" rx="2" fill="#18130f" opacity=".42"/>
    </g>`).join('');

  return coverShell('gravity', ['#18130f', '#4a3a76', '#b8d890'], `
    <g opacity=".28">
      <path d="M190 114v482M526 82v546M858 116v474" stroke="#fff8ea" stroke-width="3" stroke-dasharray="16 18"/>
      <path d="M170 138l20-28l20 28M506 604l20 28l20-28M838 138l20-28l20 28" stroke="#fff8ea" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
    ${platforms}
    <g transform="translate(498 206)" filter="url(#gravity-shadow)">
      <path d="M0 132 L150 0 L300 132 L248 132 L248 258 L52 258 L52 132 Z" fill="#0f172a" opacity=".92"/>
      <path d="M78 124h144M98 166h104M118 208h64" stroke="#fff8ea" stroke-opacity=".34" stroke-width="10" stroke-linecap="round"/>
      <circle cx="150" cy="88" r="30" fill="#b8d890"/>
    </g>
    <g transform="translate(316 438) rotate(-18)" filter="url(#gravity-shadow)">
      <rect width="54" height="70" rx="18" fill="#f2c879"/>
      <circle cx="38" cy="22" r="7" fill="#18130f"/>
      <path d="M-78 38c34-38 78-58 132-60" stroke="#fff8ea" stroke-opacity=".58" stroke-width="9" stroke-linecap="round" fill="none"/>
    </g>
    <g filter="url(#gravity-shadow)">
      <rect x="930" y="168" width="78" height="166" rx="30" fill="#b8d890"/>
      <circle cx="969" cy="210" r="18" fill="#18130f"/>
      <path d="M950 270h38" stroke="#18130f" stroke-opacity=".44" stroke-width="9" stroke-linecap="round"/>
    </g>
    <g transform="translate(76 76)">
      <text y="0" font-family="Inter, Segoe UI, sans-serif" font-size="28" font-weight="800" fill="#fff8ea" opacity=".92">GRAVITY</text>
      <text y="42" font-family="Inter, Segoe UI, sans-serif" font-size="48" font-weight="900" fill="#fff8ea">Gravity Pagoda</text>
    </g>`);
}
