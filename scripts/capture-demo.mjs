import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';

const appUrl = process.env.DEMO_URL || 'http://127.0.0.1:4173';
const outDir = resolve(process.argv[2] || 'delivery/media');
const frameDir = join(outDir, 'frames');
const viewport = { width: 1440, height: 960 };
const screenshotMap = [
  ['01-home.png', 'Published Home'],
  ['02-login.png', 'Login'],
  ['03-create.png', 'Create Agent'],
  ['04-tasks.png', 'Generation Tasks'],
  ['05-play.png', 'Play Runtime']
];

async function main() {
await mkdir(outDir, { recursive: true });
await rm(frameDir, { recursive: true, force: true });
await mkdir(frameDir, { recursive: true });

const chrome = await findChrome();
if (!chrome) throw new Error('Chromium/Chrome/Edge executable was not found.');

const browserProfile = resolve('output', 'demo-chrome-profile');
await rm(browserProfile, { recursive: true, force: true });
await mkdir(browserProfile, { recursive: true });
const chromeProcess = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--remote-debugging-port=0',
  `--user-data-dir=${browserProfile}`,
  `--window-size=${viewport.width},${viewport.height}`,
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

try {
  const wsUrl = await waitForWebSocketUrl(chromeProcess);
  const page = await CdpPage.connect(wsUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false
  });

    const recorder = new Recorder(page, frameDir);
    await recorder.start();
    try {
      await page.navigate(`${appUrl}/#/home`);
      await page.waitForSelector('.grid');
      await page.wait(900);
      await page.screenshot(join(outDir, '01-home.png'));

      await page.click('#showLogin');
      await page.waitForSelector('#authForm');
      await page.screenshot(join(outDir, '02-login.png'));
      await page.type('input[name="email"]', 'creator@example.com');
      await page.type('input[name="password"]', 'password123');
      await page.click('#authForm button[type="submit"]');
      await page.waitForSelector('[data-nav="/create"]');
      await page.wait(600);

      await page.click('[data-nav="/create"]');
      await page.waitForSelector('#createForm');
      await page.evaluate(() => {
        const title = document.querySelector('input[name="title"]');
        const prompt = document.querySelector('textarea[name="prompt"]');
        if (title) title.value = 'Interview Demo Archive';
        if (prompt) prompt.value = 'Create an interview demo game about restoring a floating archive, with memory choices, a visible win condition, and replayable feedback.';
      });
      await page.screenshot(join(outDir, '03-create.png'));
      await page.click('#createForm button[type="submit"]');
      await page.waitForSelector('.table');
      await page.wait(5200);
      await page.screenshot(join(outDir, '04-tasks.png'));

      await page.evaluate(() => {
        const publish = [...document.querySelectorAll('[data-publish]')].at(-1);
        if (publish) publish.click();
      });
      await page.wait(1200);
      await page.evaluate(() => {
        const preview = [...document.querySelectorAll('[data-play]')].at(-1);
        if (preview) preview.click();
      });
      await page.waitForSelector('.play-frame-wrap');
      await page.wait(2600);
      await page.screenshot(join(outDir, '05-play.png'));
      await page.wait(2500);
    } finally {
      await recorder.stop();
      await page.close();
      chromeProcess.kill();
    }

    const frames = await recorder.frameCount();
    const video = await encodeVideo(frames);
    await writeFile(join(outDir, 'README.md'), mediaReadme(video, frames), 'utf8');
    console.log(`screenshots: ${screenshotMap.map(([name]) => name).join(', ')}`);
    console.log(`frames: ${frames}`);
    console.log(`video: ${video || 'not encoded'}`);
} finally {
  if (!chromeProcess.killed) chromeProcess.kill();
}
}

class Recorder {
  constructor(page, dir) {
    this.page = page;
    this.dir = dir;
    this.frame = 0;
    this.active = false;
    this.loop = null;
  }

  async start() {
    this.active = true;
    this.loop = this.captureLoop();
  }

  async stop() {
    this.active = false;
    await this.loop;
  }

  async frameCount() {
    return this.frame;
  }

  async captureLoop() {
    while (this.active) {
      const file = join(this.dir, `frame-${String(this.frame).padStart(5, '0')}.jpg`);
      try {
        await this.page.screenshot(file, { format: 'jpeg', quality: 88 });
        this.frame += 1;
      } catch (error) {
        if (this.active) console.warn(`frame capture skipped: ${error.message}`);
      }
      await this.page.wait(180);
    }
  }
}

class CdpPage {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    this.socket.addEventListener('message', (event) => this.onMessage(event.data));
  }

  static async connect(browserWsUrl) {
    const base = browserWsUrl.replace(/^ws:/, 'http:').replace(/\/devtools\/browser\/.*/, '');
    const tabs = await fetchJson(`${base}/json`);
    let tab = tabs.find((item) => item.type === 'page') || tabs[0];
    if (!tab) tab = await fetchJson(`${base}/json/new?about:blank`, { method: 'PUT' });
    const socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolvePromise, rejectPromise) => {
      socket.addEventListener('open', resolvePromise, { once: true });
      socket.addEventListener('error', rejectPromise, { once: true });
    });
    return new CdpPage(socket);
  }

  onMessage(data) {
    const message = JSON.parse(data);
    if (message.id && this.pending.has(message.id)) {
      const { resolve: resolvePromise, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolvePromise(message.result || {});
      return;
    }
    if (message.method && this.events.has(message.method)) {
      for (const handler of this.events.get(message.method)) handler(message.params || {});
    }
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 10000);
    });
  }

  once(eventName) {
    return new Promise((resolvePromise) => {
      const handler = (params) => {
        this.events.set(eventName, (this.events.get(eventName) || []).filter((item) => item !== handler));
        resolvePromise(params);
      };
      this.events.set(eventName, [...(this.events.get(eventName) || []), handler]);
    });
  }

  async navigate(url) {
    const loaded = this.once('Page.loadEventFired');
    await this.send('Page.navigate', { url });
    await loaded;
  }

  async wait(ms) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
  }

  async evaluate(expressionOrFn, ...args) {
    const expression = typeof expressionOrFn === 'function'
      ? `(${expressionOrFn})(...${JSON.stringify(args)})`
      : expressionOrFn;
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed.');
    return result.result?.value;
  }

  async waitForSelector(selector, timeout = 12000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const exists = await this.evaluate((sel) => Boolean(document.querySelector(sel)), selector);
      if (exists) return;
      await this.wait(120);
    }
    throw new Error(`Timed out waiting for selector ${selector}`);
  }

  async type(selector, value) {
    await this.evaluate((sel, next) => {
      const input = document.querySelector(sel);
      if (!input) throw new Error(`Missing input ${sel}`);
      input.focus();
      input.value = next;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, value);
  }

  async click(selector) {
    await this.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Missing clickable ${sel}`);
      el.click();
    }, selector);
    await this.wait(350);
  }

  async screenshot(path, options = {}) {
    const params = options.format === 'jpeg'
      ? { format: 'jpeg', quality: options.quality || 88, fromSurface: true }
      : { format: 'png', fromSurface: true };
    const result = await this.send('Page.captureScreenshot', params);
    await writeFile(path, Buffer.from(result.data, 'base64'));
  }

  async close() {
    this.socket.close();
  }
}

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    await latestPlaywrightBrowser('chromium-*', 'chrome-win64', 'chrome.exe'),
    await latestPlaywrightBrowser('chromium-*', 'chrome-win', 'chrome.exe'),
    join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) || '';
}

async function findFfmpeg() {
  const candidates = [
    process.env.FFMPEG_PATH,
    join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'ffmpeg-1011', 'ffmpeg-win64.exe'),
    'ffmpeg'
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate === 'ffmpeg') return candidate;
    if (existsSync(candidate)) return candidate;
  }
  return '';
}

async function latestPlaywrightBrowser(prefix, ...parts) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (!existsSync(base)) return '';
  const names = await readdir(base).catch(() => []);
  const re = new RegExp(`^${prefix.replace('*', '.*')}$`);
  const match = names.filter((name) => re.test(name)).sort().at(-1);
  return match ? join(base, match, ...parts) : '';
}

async function waitForWebSocketUrl(child) {
  let buffer = '';
  return await new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for Chrome DevTools URL.')), 15000);
    child.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolvePromise(match[1]);
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited before DevTools URL was ready (${code}).`));
    });
  });
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  return await res.json();
}

async function encodeVideo(frameCount) {
  const ffmpeg = await findFfmpeg();
  if (!ffmpeg || frameCount < 2) return '';
  const webmPath = join(outDir, 'demo-walkthrough.webm');
  const args = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', '6',
    '-i', 'pipe:0',
    '-c:v', 'libvpx',
    '-b:v', '1800k',
    '-f', 'webm',
    webmPath
  ];
  const ok = await pipeFrames(ffmpeg, args, frameCount);
  return ok && existsSync(webmPath) ? webmPath : '';
}

async function pipeFrames(command, args, frameCount) {
  return await new Promise((resolvePromise) => {
    const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'ignore'] });
    child.on('error', () => resolvePromise(false));
    child.on('exit', (code) => resolvePromise(code === 0));
    child.stdin.on('error', () => {});
    (async () => {
      try {
        for (let index = 0; index < frameCount; index += 1) {
          const file = join(frameDir, `frame-${String(index).padStart(5, '0')}.jpg`);
          if (!child.stdin.writable) break;
          child.stdin.write(await readFile(file));
        }
        if (child.stdin.writable) child.stdin.end();
      } catch {
        child.stdin.destroy();
      }
    })();
  });
}

function mediaReadme(video, frames) {
  return `# Demo Media

Generated by \`node scripts/capture-demo.mjs\`.

- Screenshots: ${screenshotMap.map(([name, title]) => `${name} (${title})`).join(', ')}
- Video: ${video ? 'demo-walkthrough.webm' : 'video encoding was not available'}
- Frame count: ${frames}
- Demo account: creator@example.com / password123
- Demo URL: ${appUrl}
`;
}

await main();
