---
title: OffscreenCanvas 与 Worker 渲染
description: "OffscreenCanvas + Worker 渲染管线：transferControlToOffscreen() 基础用法、Worker 化视频帧处理与图像滤镜实战、兼容性与注意事项。"
keywords: [Web Workers, OffscreenCanvas]
category: JavaScript
tags: [JavaScript, Web Workers, OffscreenCanvas, Canvas]
created: 2026-11-14
updated: 2026-11-14
status: 正式
---

# OffscreenCanvas 与 Worker 渲染

本篇系统讲解如何把 Canvas 渲染整条管线搬进 Worker 线程：OffscreenCanvas 核心概念、transferControlToOffscreen()、视频帧处理与图像滤镜实战。基础用法另见《[Web Workers 基础](/docs/javascript/16-Web Workers与Service Worker/01-Web Workers基础)》的 OffscreenCanvas 小节。

> 本文由 HTML5 模块《Web Workers 处理线程》专题内容整理并入本目录。


`OffscreenCanvas` 是 HTML5 Canvas 的离屏版本，可以脱离 DOM 在 Worker 线程中进行渲染操作，然后将渲染结果位图传回主线程显示。这彻底解决了 Canvas 渲染阻塞主线程的问题。

<h4>009-offscreen-canvas-worker.html</h4>

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【9】OffscreenCanvas + Worker 渲染</title>
  <!--
    来源: HTML5基础知识/15-WebWorkers处理线程.md
    知识点: OffscreenCanvas transferControlToOffscreen 在 Worker 中渲染 Canvas
  -->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px; background: #0d1117; color: #e6edf3;
      min-height: 100vh;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    .header {
      text-align: center; padding: 24px; background: linear-gradient(135deg, #238636, #2ea043);
      color: white; border-radius: 12px; margin-bottom: 24px;
    }
    .header h1 { font-size: 22px; margin-bottom: 6px; }
    .header p { opacity: 0.9; font-size: 14px; }

    .card {
      background: #161b22; border: 1px solid #30363d; border-radius: 10px;
      padding: 24px; margin-bottom: 20px;
    }
    .card-title {
      font-size: 15px; font-weight: 600; color: #3fb950;
      border-left: 3px solid #3fb950; padding-left: 10px; margin-bottom: 16px;
    }

    .info-banner {
      background: rgba(63,185,80,0.1); border: 1px solid rgba(63,185,80,0.25);
      border-radius: 6px; padding: 12px 16px; font-size: 13px; line-height: 1.6;
      color: #7ee787; margin-bottom: 16px;
    }

    .canvas-wrapper {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;
    }
    @media (max-width: 700px) { .canvas-wrapper { grid-template-columns: 1fr; } }

    .canvas-box {
      background: #0d1117; border: 2px solid #30363d; border-radius: 10px;
      padding: 12px; text-align: center;
    }
    .canvas-label {
      font-size: 12px; color: #8b949e; margin-bottom: 8px; font-weight: 600;
    }
    canvas {
      background: #000; border-radius: 6px; display: block; margin: 0 auto;
      max-width: 100%;
    }

    .controls { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .btn {
      padding: 9px 18px; border: none; border-radius: 6px; cursor: pointer;
      font-size: 13px; font-weight: 500; transition: all 0.2s;
    }
    .btn-green { background: #238636; color: white; }
    .btn-green:hover { background: #2ea043; }
    .btn-blue { background: #1f6feb; color: white; }
    .btn-blue:hover { background: #388bfd; }
    .btn-orange { background: #bd561d; color: white; }
    .btn-orange:hover { background: #d18616; }
    .btn-purple { background: #8957e5; color: white; }
    .btn-purple:hover { background: #a371f7; }
    .btn-red { background: #da3633; color: white; }
    .btn-red:hover { background: #f85149; }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .stats-bar {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
      margin-top: 16px;
    }
    .stat-item {
      background: #0d1117; border: 1px solid #21262d; border-radius: 6px;
      padding: 10px; text-align: center;
    }
    .stat-val { font-size: 18px; font-weight: 700; color: #58a6ff; }
    .stat-lbl { font-size: 10px; color: #8b949e; margin-top: 2px; }

    .log-area {
      background: #0d1117; border-radius: 6px; padding: 12px;
      font-family: monospace; font-size: 11px; max-height: 150px;
      overflow-y: auto; color: #8b949e; line-height: 1.6;
    }
    .log-entry { padding: 1px 0; }
    .log-entry.ok { color: #3fb950; }
    .log-entry.err { color: #f85149; }
    .log-entry.info { color: #58a6ff; }

    .compat-warning {
      background: rgba(255,165,2,0.1); border: 1px solid rgba(255,165,2,0.25);
      border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #ffa502;
      margin-top: 16px;
    }
    .support-badge {
      display: inline-block; padding: 2px 10px; border-radius: 10px;
      font-size: 11px; font-weight: 600; margin-left: 8px;
    }
    .badge-yes { background: rgba(63,185,80,0.2); color: #3fb950; }
    .badge-no { background: rgba(248,81,73,0.2); color: #f85149; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🖼️ OffscreenCanvas + Worker 渲染</h1>
      <p>transferControlToOffscreen — 在 Worker 线程中进行 Canvas 绘制，不阻塞主线程</p>
    </div>

    <div class="card">
      <div class="card-title">🎨 Canvas 渲染演示</div>
      <div class="info-banner">
        💡 <strong>原理：</strong>通过 <code>canvas.transferControlToOffscreen()</code> 将渲染控制权转移给 OffscreenCanvas，
        然后在 Worker 中进行绘制操作。主线程完全不参与渲染过程。<br>
        支持:
        <span class="support-badge badge-yes">Chrome 69+</span>
        <span class="support-badge badge-yes">Edge 79+</span>
        <span class="support-badge badge-no">Firefox 部分支持</span>
        <span class="support-badge badge-no">Safari 不支持</span>
      </div>

      <div class="controls">
        <button class="btn btn-green" onclick="startAnimation()">▶ 开始粒子动画</button>
        <button class="btn btn-blue" onclick="drawMandelbrot()">🌀 Mandelbrot 分形</button>
        <button class="btn btn-orange" onclick="drawWaveform()">〰️ 波形动画</button>
        <button class="btn btn-purple" onclick="drawClock()">🕐 实时时钟</button>
        <button class="btn btn-red" onclick="stopAll()">⛹ 停止全部</button>
      </div>

      <div class="canvas-wrapper">
        <div class="canvas-box">
          <div class="canvas-label">🖥️ 主线程 Canvas (对比)</div>
          <canvas id="mainCanvas" width="400" height="300"></canvas>
        </div>
        <div class="canvas-box">
          <div class="canvas-label">⚙️ Worker OffscreenCanvas</div>
          <canvas id="offscreenCanvas" width="400" height="300"></canvas>
        </div>
      </div>

      <div class="stats-bar">
        <div class="stat-item">
          <div class="stat-val" id="fpsValue">-</div>
          <div class="stat-lbl">FPS (Worker)</div>
        </div>
        <div class="stat-item">
          <div class="stat-val" id="particleCount">0</div>
          <div class="stat-lbl">粒子数量</div>
        </div>
        <div class="stat-item">
          <div class="stat-val" id="renderMode">空闲</div>
          <div class="stat-lbl">当前模式</div>
        </div>
        <div class="stat-item">
          <div class="stat-val" id="workerStatus">就绪</div>
          <div class="stat-lbl">Worker 状态</div>
        </div>
      </div>

      <div class="log-area" id="logArea">
        <div class="log-entry info">[系统] 等待用户操作... (OffscreenCanvas 需要 Chrome 69+ 或 Edge 79+)</div>
      </div>
    </div>

    <div class="compat-warning">
      ⚠️ <strong>兼容性提示：</strong>OffscreenCanvas 目前在 Chrome/Edge 中支持最好。Firefox 从 v105 开始部分支持（仅 2D context）。
      Safari 暂不支持。如果您的浏览器不支持，将回退到主线程 Canvas 绘制。
    </div>
  </div>

  <script>
    const logArea = document.getElementById('logArea');
    let offscreenWorker = null;
    let animationId = null;
    let mainAnimId = null;

    function log(msg, type = '') {
      const div = document.createElement('div');
      div.className = `log-entry ${type}`;
      div.textContent = `[${new Date().toTimeString().substring(0,8)}] ${msg}`;
      logArea.appendChild(div);
      logArea.scrollTop = logArea.scrollHeight;
    }

    function updateStats(fps, particles, mode, status) {
      if (fps !== undefined) document.getElementById('fpsValue').textContent = fps;
      if (particles !== undefined) document.getElementById('particleCount').textContent = particles;
      if (mode !== undefined) document.getElementById('renderMode').textContent = mode;
      if (status !== undefined) document.getElementById('workerStatus').textContent = status;
    }

    // ====== 检测 OffscreenCanvas 支持情况 ======
    const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined'
      && typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

    // ====== Worker 渲染代码 ======
    const renderWorkerCode = `
let ctx = null;
let animId = null;
let mode = 'idle';
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

// 粒子系统
let particles = [];

function createParticles(count) {
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * 400,
      y: Math.random() * 300,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      radius: Math.random() * 4 + 2,
      hue: Math.random() * 360
    });
  }
}

function drawParticles() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, 400, 300);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.hue = (p.hue + 1) % 360;

    if (p.x < 0 || p.x > 400) p.vx *= -1;
    if (p.y < 0 || p.y > 300) p.vy *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'hsl(' + p.hue + ', 80%, 60%)';
    ctx.fill();
  });

  // 计算 FPS
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastTime = now;
    self.postMessage({ type: 'fps', value: fps });
  }

  if (mode === 'particles') {
    animId = requestAnimationFrame(drawParticles);
  }
}

function drawMandelbrot() {
  const w = 400, h = 300;
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const maxIter = 100;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x0 = (px / w) * 3.5 - 2.5;
      const y0 = (py / h) * 2 - 1;

      let x = 0, y = 0, iter = 0;
      while (x*x + y*y <= 4 && iter < maxIter) {
        const xtemp = x*x - y*y + x0;
        y = 2*x*y + y0;
        x = xtemp;
        iter++;
      }

      const idx = (py * w + px) * 4;
      if (iter === maxIter) {
        data[idx] = data[idx+1] = data[idx+2] = 0;
      } else {
        const t = iter / maxIter;
        data[idx] = Math.floor(9 * (1-t) * t * t * t * 255);
        data[idx+1] = Math.floor(15 * (1-t) * (1-t) * t * t * 255);
        data[idx+2] = Math.floor(8.5 * (1-t) * (1-t) * (1-t) * t * 255);
      }
      data[idx+3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  self.postMessage({ type: 'done', mode: 'mandelbrot' });
}

function drawWaveform(time) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 400, 300);

  for (let ch = 0; ch < 3; ch++) {
    ctx.beginPath();
    ctx.strokeStyle = ['hsl(0,80%,60%)','hsl(120,80%,60%)','hsl(240,80%,60%)'][ch];
    ctx.lineWidth = 2;

    for (let x = 0; x < 400; x++) {
      const y = 150 + Math.sin((x + time * (1 + ch*0.5)) * 0.03 + ch * 2) * (60 + ch * 20)
                + Math.sin((x + time) * 0.01) * 30;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  if (mode === 'wave') {
    animId = requestAnimationFrame(drawWaveform);
  }
}

function drawClock() {
  const cx = 200, cy = 150, r = 110;
  const now = new Date();

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#444';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // 刻度
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * Math.PI / 180;
    const inner = i % 3 === 0 ? r - 15 : r - 8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * (r - 3), cy + Math.sin(angle) * (r - 3));
    ctx.strokeStyle = i % 3 === 0 ? '#fff' : '#666';
    ctx.lineWidth = i % 3 === 0 ? 3 : 1;
    ctx.stroke();
  }

  // 时针
  const hourAngle = ((now.getHours() % 12) * 30 + now.getMinutes() * 0.5 - 90) * Math.PI / 180;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hourAngle) * 50, cy + Math.sin(hourAngle) * 50);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // 分针
  const minAngle = (now.getMinutes() * 6 + now.getSeconds() * 0.1 - 90) * Math.PI / 180;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(minAngle) * 75, cy + Math.sin(minAngle) * 75);
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 秒针
  const secAngle = (now.getSeconds() * 6 - 90) * Math.PI / 180;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(secAngle) * 90, cy + Math.sin(secAngle) * 90);
  ctx.strokeStyle = '#f55';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 中心点
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#f55';
  ctx.fill();

  if (mode === 'clock') {
    animId = requestAnimationFrame(drawClock);
  }
}

// ====== 消息处理 ======
self.onmessage = function(e) {
  const data = e.data;

  if (data.type === 'init') {
    ctx = data.canvas.getContext('2d');
    self.postMessage({ type: 'ready' });
  }

  if (data.type === 'startParticles') {
    if (animId) cancelAnimationFrame(animId);
    mode = 'particles';
    createParticles(data.count || 100);
    lastTime = performance.now();
    frameCount = 0;
    drawParticles();
  }

  if (data.type === 'mandelbrot') {
    if (animId) cancelAnimationFrame(animId);
    mode = 'mandelbrot';
    drawMandelbrot();
  }

  if (data.type === 'wave') {
    if (animId) cancelAnimationFrame(animId);
    mode = 'wave';
    drawWaveform(performance.now());
  }

  if (data.type === 'clock') {
    if (animId) cancelAnimationFrame(animId);
    mode = 'clock';
    drawClock();
  }

  if (data.type === 'stop') {
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    mode = 'idle';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 400, 300);
    self.postMessage({ type: 'stopped' });
  }
};
`;

    // ====== 初始化 ======
    function initWorker() {
      if (!supportsOffscreenCanvas) {
        log('⚠️ 浏览器不支持 OffscreenCanvas，将使用主线程 Canvas 回退模式', 'err');
        return null;
      }

      try {
        const canvas = document.getElementById('offscreenCanvas');
        const offscreen = canvas.transferControlToOffscreen();

        const blob = new Blob([renderWorkerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));

        worker.onmessage = function(e) {
          const d = e.data;
          if (d.type === 'ready') {
            log('Worker 已初始化 OffscreenCanvas', 'ok');
          } else if (d.type === 'fps') {
            document.getElementById('fpsValue').textContent = d.value;
          } else if (d.type === 'done') {
            log(`${d.mode} 渲染完成`, 'ok');
          } else if (d.type === 'stopped') {
            log('渲染已停止', 'info');
          }
        };

        worker.onerror = function(e) {
          log(`Worker 错误: ${e.message}`, 'err');
          e.preventDefault();
        };

        // 发送 OffscreenCanvas 给 Worker
        worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
        log('OffscreenCanvas 控制权已转移给 Worker', 'ok');
        return worker;
      } catch (err) {
        log(`初始化失败: ${err.message}`, 'err');
        return null;
      }
    }

    // ====== 动画函数 ======
    function startAnimation() {
      stopAll();
      updateStats('-', 100, '粒子动画', '运行中');

      if (offscreenWorker && supportsOffscreenCanvas) {
        offscreenWorker.postMessage({ type: 'startParticles', count: 100 });
        log('▶ Worker 粒子动画启动 (100 个粒子)', 'ok');
      } else {
        // 回退到主线程
        startMainParticleAnimation();
        log('▶ 主线程回退模式: 粒子动画 (浏览器不支持 OffscreenCanvas)', 'warn');
      }
    }

    // 主线程回退的粒子动画
    function startMainParticleAnimation() {
      const canvas = document.getElementById('mainCanvas');
      const mctx = canvas.getContext('2d');
      const particles = [];

      for (let i = 0; i < 100; i++) {
        particles.push({
          x: Math.random() * 400, y: Math.random() * 300,
          vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
          r: Math.random() * 4 + 2, hue: Math.random() * 360
        });
      }

      let frames = 0, lastT = performance.now(), fps = 0;
      function animate() {
        mctx.fillStyle = 'rgba(0,0,0,0.15)';
        mctx.fillRect(0, 0, 400, 300);

        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.hue = (p.hue + 1) % 360;
          if (p.x < 0 || p.x > 400) p.vx *= -1;
          if (p.y < 0 || p.y > 300) p.vy *= -1;
          mctx.beginPath();
          mctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          mctx.fillStyle = `hsl(${p.hue},80%,60%)`;
          mctx.fill();
        });

        frames++;
        const now = performance.now();
        if (now - lastT >= 1000) { fps = frames; frames = 0; lastT = now; document.getElementById('fpsValue').textContent = fps; }
        mainAnimId = requestAnimationFrame(animate);
      }
      animate();
    }

    function drawMandelbrot() {
      stopAll();
      updateStats('-', '-', 'Mandelbrot', '运行中');

      if (offscreenWorker && supportsOffscreenCanvas) {
        offscreenWorker.postMessage({ type: 'mandelbrot' });
        log('🌀 Worker 开始渲染 Mandelbrot 分形...', 'ok');
      } else {
        log('⚠️ 当前浏览器不支持 OffscreenCanvas，无法演示此功能', 'err');
      }
    }

    function drawWaveform() {
      stopAll();
      updateStats('-', '-', '波形动画', '运行中');

      if (offscreenWorker && supportsOffscreenCanvas) {
        offscreenWorker.postMessage({ type: 'wave' });
        log('〰️ Worker 波形动画启动', 'ok');
      } else {
        log('⚠️ 当前浏览器不支持 OffscreenCanvas', 'err');
      }
    }

    function drawClock() {
      stopAll();
      updateStats('-', '-', '实时时钟', '运行中');

      if (offscreenWorker && supportsOffscreenCanvas) {
        offscreenWorker.postMessage({ type: 'clock' });
        log('🕐 Worker 时钟启动', 'ok');
      } else {
        log('⚠️ 当前浏览器不支持 OffscreenCanvas', 'err');
      }
    }

    function stopAll() {
      if (mainAnimId) { cancelAnimationFrame(mainAnimId); mainAnimId = null; }
      if (offscreenWorker && supportsOffscreenCanvas) {
        offscreenWorker.postMessage({ type: 'stop' });
      }
      // 清空主线程 canvas
      const mc = document.getElementById('mainCanvas').getContext('2d');
      mc.fillStyle = '#000'; mc.fillRect(0, 0, 400, 300);
      updateStats('-', 0, '空闲', '就绪');
      log('⛹ 所有渲染已停止', 'info');
    }

    // 页面加载时初始化 Worker
    window.addEventListener('load', function() {
      offscreenWorker = initWorker();
    });
  </script>
</body>
</html>
```

## 核心概念

传统 Canvas 渲染的痛点在于所有绘制操作（`fillRect`、`drawImage`、`getImageData` 等）都在主线程执行，当画布尺寸较大或绘制内容复杂时，会导致界面卡顿。`OffscreenCanvas` 将渲染工作转移到 Worker 中：

```
传统模式:
  主线程: UI 交互 + Canvas 绘制 → 😫 卡顿

OffscreenCanvas 模式:
  主线程: UI 交互（流畅）😊
  Worker: Canvas 绘制（独立线程）→ 位图回传 → 主线程合成显示
```

## transferControlToOffscreen() 基础用法

```html
<!-- index.html -->
<canvas id="mainCanvas" width="800" height="600"></canvas>
```

```javascript
// main.js - 主线程
const canvas = document.getElementById('mainCanvas')

// 1. 将控制权转移到 OffscreenCanvas
const offscreen = canvas.transferControlToOffscreen()

// 2. 将 OffscreenCanvas 传给 Worker
const worker = new Worker('render-worker.js', { type: 'module' })
worker.postMessage({ canvas: offscreen }, [offscreen])

// 3. 之后主线程不再操作此 canvas，所有绘制由 Worker 完成
```

```javascript
// render-worker.js - Worker 线程
self.onmessage = (e) => {
  const { canvas } = e.data
  const ctx = canvas.getContext('2d')

  // 现在可以在 Worker 中自由绘制了！
  function render(timestamp) {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制内容
    ctx.fillStyle = '#3498db'
    ctx.fillRect(100 + Math.sin(timestamp / 500) * 50, 100, 200, 200)

    ctx.strokeStyle = '#e74c3c'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(400, 300, 80 + Math.cos(timestamp / 300) * 20, 0, Math.PI * 2)
    ctx.stroke()

    // 请求下一帧
    requestAnimationFrame(render)
  }

  // 启动渲染循环
  requestAnimationFrame(render)
}
```

## 视频处理实战：Worker 化视频帧处理

以下示例展示如何在 Worker 中逐帧处理视频数据，实现实时的视频滤镜效果而不影响主线程 UI：

::: code-group

```html [video-filter.html]
<!DOCTYPE html>
<html>
<head>
  <title>OffscreenCanvas 视频滤镜</title>
  <style>
    body { display: flex; flex-direction: column; align-items: center; padding: 20px; }
    video { display: none; }
    canvas { border: 2px solid #333; max-width: 100%; }
    .controls { margin: 15px 0; display: flex; gap: 10px; }
    button { padding: 8px 16px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>视频滤镜处理器 (OffscreenCanvas + Worker)</h1>
  <div class="controls">
    <input type="file" id="videoInput" accept="video/*" />
    <select id="filterSelect">
      <option value="none">无滤镜</option>
      <option value="grayscale">灰度</option>
      <option value="sepia">复古</option>
      <option value="invert">反色</option>
      <option value="blur">模糊</option>
    </select>
    <button id="togglePlay">播放</button>
  </div>
  <video id="video" crossorigin="anonymous" loop muted></video>
  <canvas id="outputCanvas" width="800" height="450"></canvas>
  <p id="fpsDisplay">FPS: --</p>

  <script src="./video-main.js"></script>
</body>
</html>
```

```javascript [video-main.js]
const video = document.getElementById('video')
const outputCanvas = document.getElementById('outputCanvas')
const filterSelect = document.getElementById('filterSelect')
const toggleBtn = document.getElementById('togglePlay')
const fpsDisplay = document.getElementById('fpsDisplay')

// 转移 Canvas 控制权到 Worker
const offscreen = outputCanvas.transferControlToOffscreen()
const worker = new Worker('video-filter-worker.js', { type: 'module' })
worker.postMessage({ canvas: offscreen }, [offscreen])

// 接收 Worker 的 FPS 上报
worker.onmessage = (e) => {
  if (e.data.fps !== undefined) {
    fpsDisplay.textContent = `FPS: ${e.data.fps.toFixed(1)}`
  }
}

// 加载视频
document.getElementById('videoInput').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (!file) return
  video.src = URL.createObjectURL(file)
  video.load()
})

// 播放/暂停
toggleBtn.addEventListener('click', () => {
  if (video.paused) {
    video.play()
    toggleBtn.textContent = '暂停'
    worker.postMessage({ command: 'start', filter: filterSelect.value })
  } else {
    video.pause()
    toggleBtn.textContent = '播放'
    worker.postMessage({ command: 'stop' })
  }
})

// 切换滤镜
filterSelect.addEventListener('change', () => {
  worker.postMessage({ command: 'setFilter', filter: filterSelect.value })
})

// 将视频元素传给 Worker（视频本身不能 transfer，但可以传递引用信息）
// 通过定期向 Worker 发送视频当前帧的方式处理
```

```javascript [video-filter-worker.js]
let ctx = null
let canvas = null
let currentFilter = 'none'
let isRunning = false
let frameCount = 0
let lastFpsTime = performance.now()

// 滤镜算法
const filters = {
  none: (data) => data, // 原样返回

  grayscale: (data) => {
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
      data[i] = data[i + 1] = data[i + 2] = avg
    }
    return data
  },

  sepia: (data) => {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
      data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
      data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
    }
    return data
  },

  invert: (data) => {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i]
      data[i + 1] = 255 - data[i + 1]
      data[i + 2] = 255 - data[i + 2]
    }
    return data
  },

  blur: (data, width, height) => {
    // 简单盒式模糊
    const copy = new Uint8ClampedArray(data)
    const radius = 3
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        let r = 0, g = 0, b = 0, count = 0
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4
            r += copy[idx]
            g += copy[idx + 1]
            b += copy[idx + 2]
            count++
          }
        }
        const idx = (y * width + x) * 4
        data[idx] = r / count
        data[idx + 1] = g / count
        data[idx + 2] = b / count
      }
    }
    return data
  }
}

self.onmessage = (e) => {
  const { command, canvas: c, filter } = e.data

  if (command === 'init' && c) {
    canvas = c
    ctx = canvas.getContext('2d')
  }

  if (command === 'setFilter') {
    currentFilter = filter
  }

  if (command === 'stop') {
    isRunning = false
  }
}

// 注意：实际的视频帧获取需要在主线程配合完成
// 因为 Worker 不能直接读取 <video> 元素的帧数据
// 完整方案通常是：主线程 drawImage(video) 到一个隐藏 canvas，
// 然后 getImageData -> postMessage 给 Worker 处理 -> putImageData 回传
```

:::

## 图像滤镜 Worker 化实战

下面是一个更实用的完整示例——纯在 Worker 中进行图像处理的管线：

```javascript
// image-pipeline-main.js - 主线程
const canvas = document.getElementById('canvas')
const offscreen = canvas.transferControlToOffscreen()
const pipelineWorker = new Worker('image-pipeline-worker.js', { type: 'module' })

pipelineWorker.postMessage({ canvas: offscreen }, [offscreen])

// 加载图片后发送给 Worker 处理
function loadImageAndProcess(imageUrl) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    // 创建 ImageBitmap（可 transfer 到 Worker）
    createImageBitmap(img).then((bitmap) => {
      pipelineWorker.postMessage(
        {
          command: 'process',
          image: bitmap,
          pipeline: ['brightness', 'contrast', 'sharpen'],
          params: { brightness: 1.2, contrast: 1.1 }
        },
        [bitmap]
      )
    })
  }
  img.src = imageUrl
}
```

```javascript
// image-pipeline-worker.js - Worker 线程
self.onmessage = async (e) => {
  const { command, canvas, image, pipeline, params } = e.data

  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height)
  const offCtx = offscreenCanvas.getContext('2d')

  // 绘制原始图片到离屏 Canvas
  offCtx.drawImage(image, 0, 0)
  let imageData = offCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height)

  // 按流水线依次应用滤镜
  for (const step of pipeline) {
    imageData = applyFilter(step, imageData, params)
  }

  // 将结果绘制到主 canvas（通过 OffscreenCanvas 自动同步）
  ctx.putImageData(imageData, 0, 0)

  self.postMessage({ status: 'done', pipeline })
}

function applyFilter(filterName, imageData, params) {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  switch (filterName) {
    case 'brightness':
      const bFactor = params.brightness || 1
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * bFactor)
        data[i + 1] = Math.min(255, data[i + 1] * bFactor)
        data[i + 2] = Math.min(255, data[i + 2] * bFactor)
      }
      break

    case 'contrast':
      const cFactor = params.contrast || 1
      const intercept = 128 * (1 - cFactor)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] * cFactor + intercept))
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * cFactor + intercept))
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * cFactor + intercept))
      }
      break

    case 'sharpen':
      // 卷积核锐化
      const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]
      applyConvolution(data, width, height, kernel)
      break
  }

  return imageData
}

function applyConvolution(data, width, height, kernel) {
  const copy = new Uint8ClampedArray(data)
  const kSize = 3
  const half = Math.floor(kSize / 2)

  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let r = 0, g = 0, b = 0
      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const px = x + kx - half
          const py = y + ky - half
          const idx = (py * width + px) * 4
          const ki = ky * kSize + kx
          r += copy[idx] * kernel[ki]
          g += copy[idx + 1] * kernel[ki]
          b += copy[idx + 2] * kernel[ki]
        }
      }
      const idx = (y * width + x) * 4
      data[idx] = Math.max(0, Math.min(255, r))
      data[idx + 1] = Math.max(0, Math.min(255, g))
      data[idx + 2] = Math.max(0, Math.min(255, b))
    }
  }
}
```

## OffscreenCanvas 兼容性与注意事项

| 浏览器 | OffscreenCanvas | transferControlToOffscreen |
| ------ | ---------------- | -------------------------- |
| Chrome 69+ | ✅ | ✅ |
| Firefox 105+ | ✅ | ✅ |
| Safari 16.4+ | ✅ | ✅ |
| Edge 79+ | ✅ | ✅ |

::: warning 重要限制
1. **`transferControlToOffscreen()` 只能调用一次**：一旦转移控制权，主线程不能再对该 `<canvas>` 元素调用 `getContext()` 等方法
2. **部分 Canvas API 在 OffscreenCanvas 中不可用**：如 `isPointInPath()`、`measureText()` 等涉及布局计算的 API
3. **`toDataURL()` / `toBlob()` 不可用**：如需导出图片，应在 Worker 中使用 `convertToBlob()` 替代
4. **WebGL 上下文同样支持**：`offscreen.getContext('webgl2')` 可以在 Worker 中使用 WebGL 渲染
:::
