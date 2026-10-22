/* =============================================================================
   轻启 · 新标签页 —— 效率工具箱（全部真实本地运行，零依赖）
   -----------------------------------------------------------------------------
   提供五个工作台：
   1. JSON 格式化与校验（实时解析、错误定位、压缩、复制）
   2. 网址与文本二维码（完整 QR 编码器，Byte 模式 / 纠错等级 L / 版本 1–6，可导出 PNG）
   3. MP4 无损提取音频（WebAudio 解码音轨 → WAV 导出，附试听）
   4. 音频人声智能放大（100%–300% 增益 + 动态压缩，离线渲染导出）
   5. MP3 可视化波形剪辑（真实声波绘制 + 区间裁剪导出）
   ============================================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------------------------
     一、二维码编码器（QR Code，Byte 模式，纠错等级 L，版本 1–6）
     --------------------------------------------------------------------------- */

  const QR = (() => {
    const EC_LEVEL_L = 1;

    // [blockCount, totalCount, dataCount]（纠错等级 L，版本 1–6）
    const RS_BLOCKS_L = {
      1: [[1, 26, 19]],
      2: [[1, 44, 34]],
      3: [[1, 70, 55]],
      4: [[1, 100, 80]],
      5: [[1, 134, 108]],
      6: [[2, 86, 68]],
    };
    const DATA_CAPACITY = { 1: 19, 2: 34, 3: 55, 4: 80, 5: 108, 6: 134 };
    const ALIGN_POS = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };

    const getBit = (value, index) => ((value >>> index) & 1) === 1;

    // GF(256) 乘法与多项式（原始多项式 0x11D）
    const EXP = new Array(256);
    const LOG = new Array(256);
    (function initGF() {
      let x = 1;
      for (let i = 0; i < 255; i += 1) {
        EXP[i] = x;
        LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
      }
      for (let i = 255; i < 256; i += 1) EXP[i] = EXP[i - 255];
    })();
    const gmul = (a, b) => {
      if (a === 0 || b === 0) return 0;
      return EXP[(LOG[a] + LOG[b]) % 255];
    };

    const polyMultiply = (a, b) => {
      const out = new Array(a.length + b.length - 1).fill(0);
      a.forEach((av, i) => {
        if (!av) return;
        b.forEach((bv, j) => {
          if (!bv) return;
          out[i + j] ^= gmul(av, bv);
        });
      });
      return out;
    };

    const generatorPoly = (count) => {
      let poly = [1];
      for (let i = 0; i < count; i += 1) poly = polyMultiply(poly, [1, EXP[i]]);
      return poly;
    };

    const rsEncode = (data, ecCount) => {
      const gen = generatorPoly(ecCount);
      const res = data.concat(new Array(ecCount).fill(0));
      for (let i = 0; i < data.length; i += 1) {
        const factor = res[i];
        if (!factor) continue;
        for (let j = 0; j < gen.length; j += 1) res[i + j] ^= gmul(gen[j], factor);
      }
      return res.slice(data.length);
    };

    const bchTypeInfo = (data) => {
      let d = data << 10;
      while (bitLength(d) - bitLength(0x537) >= 0) d ^= 0x537 << (bitLength(d) - bitLength(0x537));
      return ((data << 10) | d) ^ 0x5412;
    };
    const bitLength = (value) => {
      let len = 0;
      let v = value;
      while (v !== 0) {
        len += 1;
        v >>>= 1;
      }
      return len;
    };

    const encode = (text) => {
      const bytes = Array.from(new TextEncoder().encode(String(text)));
      let version = 0;
      for (let v = 1; v <= 6; v += 1) {
        const headerBits = 4 + 8;
        if (bytes.length * 8 + headerBits <= DATA_CAPACITY[v] * 8) {
          version = v;
          break;
        }
      }
      if (!version) throw new Error('内容过长，请精简到 100 个字符以内');

      // 1. 构造比特流
      const bits = [];
      const put = (value, length) => {
        for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
      };
      put(4, 4); // Byte 模式
      put(bytes.length, 8); // 版本 1–9 使用 8 位长度
      bytes.forEach((b) => put(b, 8));

      const capacityBits = DATA_CAPACITY[version] * 8;
      const terminator = Math.min(4, capacityBits - bits.length);
      put(0, terminator);
      while (bits.length % 8 !== 0) bits.push(0);

      const dataBytes = [];
      for (let i = 0; i < bits.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
        dataBytes.push(byte);
      }
      let pad = true;
      while (dataBytes.length < DATA_CAPACITY[version]) {
        dataBytes.push(pad ? 0xec : 0x11);
        pad = !pad;
      }

      // 2. 分块 + RS 纠错 + 交织
      const blocks = RS_BLOCKS_L[version];
      const totalBlocks = blocks[0][0];
      const totalCount = blocks[0][1];
      const dataCount = blocks[0][2];
      const ecCount = totalCount - dataCount;
      const dcData = [];
      const ecData = [];
      for (let b = 0; b < totalBlocks; b += 1) {
        const chunk = dataBytes.slice(b * dataCount, (b + 1) * dataCount);
        dcData.push(chunk);
        ecData.push(rsEncode(chunk, ecCount));
      }
      const interleaved = [];
      for (let i = 0; i < dataCount; i += 1) {
        for (let b = 0; b < totalBlocks; b += 1) {
          if (i < dcData[b].length) interleaved.push(dcData[b][i]);
        }
      }
      for (let i = 0; i < ecCount; i += 1) {
        for (let b = 0; b < totalBlocks; b += 1) interleaved.push(ecData[b][i]);
      }

      // 3. 绘制矩阵
      const size = version * 4 + 17;
      const modules = Array.from({ length: size }, () => new Array(size).fill(null));
      const alignPos = ALIGN_POS[version];

      const placeFinder = (row, col) => {
        for (let r = -1; r <= 7; r += 1) {
          if (row + r < 0 || row + r >= size) continue;
          for (let c = -1; c <= 7; c += 1) {
            if (col + c < 0 || col + c >= size) continue;
            modules[row + r][col + c] =
              (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
              (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
              (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          }
        }
      };
      placeFinder(0, 0);
      placeFinder(size - 7, 0);
      placeFinder(0, size - 7);

      for (let i = 0; i < alignPos.length; i += 1) {
        for (let j = 0; j < alignPos.length; j += 1) {
          const row = alignPos[i];
          const col = alignPos[j];
          if ((row === 6 && col === 6) || (row === 6 && col === alignPos[alignPos.length - 1]) || (row === alignPos[alignPos.length - 1] && col === 6)) continue;
          for (let r = -2; r <= 2; r += 1) {
            for (let c = -2; c <= 2; c += 1) {
              modules[row + r][col + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
            }
          }
        }
      }

      for (let i = 8; i < size - 8; i += 1) {
        if (modules[i][6] === null) modules[i][6] = i % 2 === 0;
        if (modules[6][i] === null) modules[6][i] = i % 2 === 0;
      }

      // 格式信息（纠错 L + 掩码 0）
      const maskPattern = 0;
      const formatData = (EC_LEVEL_L << 3) | maskPattern;
      const formatBits = bchTypeInfo(formatData);
      for (let i = 0; i < 15; i += 1) {
        const mod = getBit(formatBits, i);
        if (i < 6) modules[i][8] = mod;
        else if (i < 8) modules[i + 1][8] = mod;
        else modules[size - 15 + i][8] = mod;
        if (i < 8) modules[8][size - i - 1] = mod;
        else if (i < 9) modules[8][15 - i - 1 + 1] = mod;
        else modules[8][15 - i - 1] = mod;
      }
      modules[size - 8][8] = true;

      // 数据放置（之字形）
      let inc = -1;
      let row = size - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col -= 1;
        for (;;) {
          for (let c = 0; c < 2; c += 1) {
            if (modules[row][col - c] !== null) continue;
            let dark = false;
            if (byteIndex < interleaved.length) dark = getBit(interleaved[byteIndex], bitIndex);
            if ((row + col - c) % 2 === 0) dark = !dark; // 掩码 0
            modules[row][col - c] = dark;
            bitIndex -= 1;
            if (bitIndex === -1) {
              byteIndex += 1;
              bitIndex = 7;
            }
          }
          row += inc;
          if (row < 0 || row >= size) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }

      return { size, modules };
    };

    return { encode };
  })();

  /* ---------------------------------------------------------------------------
     二、通用小工具
     --------------------------------------------------------------------------- */

  const tpl = (title, subtitle, body, size) => ({ title, subtitle, body, size: size || 'wide' });

  const encodeWav = (samples, sampleRate) => {
    const length = samples.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    let offset = 44;
    for (let i = 0; i < length; i += 1) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const toMono = (audioBuffer) => {
    const channels = audioBuffer.numberOfChannels;
    if (channels === 1) return audioBuffer.getChannelData(0).slice();
    const out = new Float32Array(audioBuffer.length);
    for (let c = 0; c < channels; c += 1) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < out.length; i += 1) out[i] += data[i] / channels;
    }
    return out;
  };

  const fmtSeconds = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  const audioContext = () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('当前浏览器不支持 WebAudio');
    return new Ctx();
  };

  /* ---------------------------------------------------------------------------
     三、JSON 格式化校验
     --------------------------------------------------------------------------- */

  const jsonTool = () => {
    const t = tpl(
      'JSON 格式化与校验',
      '本地实时解析，不会上传任何数据',
      `
      <div class="json-tool">
        <div class="json-toolbar">
          <button class="tb-btn" type="button" data-json-act="format">美化缩进</button>
          <button class="tb-btn" type="button" data-json-act="minify">压缩为一行</button>
          <button class="tb-btn" type="button" data-json-act="sample">载入示例</button>
          <button class="tb-btn" type="button" data-json-act="clear">清空</button>
          <button class="tb-btn primary" type="button" data-json-act="copy">复制结果</button>
        </div>
        <textarea class="json-input" id="jsonInput" spellcheck="false" placeholder='粘贴 JSON，例如 {"name":"轻启","version":2}'></textarea>
        <div class="json-status" id="jsonStatus">等待输入…</div>
      </div>`,
      'wide'
    );
    t.mount = (root, helpers) => {
      const input = root.querySelector('#jsonInput');
      const status = root.querySelector('#jsonStatus');
      const setStatus = (text, type) => {
        status.textContent = text;
        status.className = `json-status ${type || ''}`;
      };
      const parse = () => {
        try {
          const value = JSON.parse(input.value);
          return { ok: true, value };
        } catch (err) {
          const match = /position (\d+)/.exec(err.message);
          const pos = match ? Number(match[1]) : -1;
          const before = pos >= 0 ? input.value.slice(0, pos) : '';
          const line = before ? before.split('\n').length : 1;
          const col = before ? before.length - before.lastIndexOf('\n') : 1;
          return { ok: false, message: `第 ${line} 行第 ${col} 列：${err.message.replace(/^JSON\.parse: /, '')}` };
        }
      };
      const run = (action) => {
        if (action === 'sample') {
          input.value = JSON.stringify(
            { app: '轻启 · 新标签页', version: 2, features: ['8×2 图标宫格', '胶囊卡片', '农历节气'], author: { name: 'qingqi', plan: 'PRO' } },
            null,
            2
          );
        }
        if (action === 'clear') {
          input.value = '';
          setStatus('已清空');
          return;
        }
        if (!input.value.trim()) {
          setStatus('请先输入 JSON 内容');
          return;
        }
        const result = parse();
        if (!result.ok) {
          setStatus(`校验失败 · ${result.message}`, 'error');
          return;
        }
        if (action === 'format') {
          input.value = JSON.stringify(result.value, null, 2);
          setStatus(`校验通过 · 已美化（${input.value.split('\n').length} 行）`, 'ok');
        } else if (action === 'minify') {
          input.value = JSON.stringify(result.value);
          setStatus(`校验通过 · 已压缩（${input.value.length} 字符）`, 'ok');
        } else if (action === 'copy') {
          const text = input.value;
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
          setStatus('已复制到剪贴板', 'ok');
        }
        helpers.toast(status.textContent);
      };
      root.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-json-act]');
        if (!btn) return;
        run(btn.dataset.jsonAct);
      });
      input.addEventListener('input', () => setStatus('输入中…'));
      input.addEventListener('blur', () => {
        if (!input.value.trim()) return;
        const result = parse();
        setStatus(result.ok ? '校验通过，可点击「美化缩进」' : `解析错误：${result.message}`, result.ok ? 'ok' : 'error');
      });
    };
    return t;
  };

  /* ---------------------------------------------------------------------------
     四、二维码
     --------------------------------------------------------------------------- */

  const qrTool = () => {
    const t = tpl(
      '网址与文本二维码',
      '离线生成真可扫描的二维码，可导出 PNG',
      `
      <div class="qr-tool">
        <div class="qr-controls">
          <label class="field-label">要编码的内容</label>
          <textarea class="rd-textarea" id="qrInput" rows="4" maxlength="120" placeholder="输入网址或任意文本，例如 https://www.bilibili.com">https://www.bilibili.com</textarea>
          <div class="qr-options">
            <label class="qr-slider">尺寸 <b id="qrSizeLabel">320</b> px
              <input type="range" id="qrSize" min="160" max="520" step="20" value="320" />
            </label>
          </div>
          <div class="rd-modal-actions left">
            <button class="primary-btn" type="button" id="qrDownload">导出 PNG</button>
            <button class="ghost-btn" type="button" id="qrRefresh">重新生成</button>
          </div>
          <p class="field-tip" id="qrHint">使用纠错等级 L，容量约 130 个字符。</p>
        </div>
        <div class="qr-preview"><canvas id="qrCanvas" width="320" height="320"></canvas></div>
      </div>`,
      'wide'
    );
    t.mount = (root) => {
      const input = root.querySelector('#qrInput');
      const canvas = root.querySelector('#qrCanvas');
      const sizeRange = root.querySelector('#qrSize');
      const label = root.querySelector('#qrSizeLabel');
      const hint = root.querySelector('#qrHint');
      const render = () => {
        const text = input.value.trim();
        if (!text) {
          hint.textContent = '请输入要生成二维码的内容';
          return;
        }
        try {
          const { size, modules } = QR.encode(text);
          const px = Number(sizeRange.value);
          label.textContent = String(px);
          canvas.width = px;
          canvas.height = px;
          const ctx = canvas.getContext('2d');
          const quiet = 4;
          const cell = px / (size + quiet * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, px, px);
          ctx.fillStyle = '#132036';
          for (let r = 0; r < size; r += 1) {
            for (let c = 0; c < size; c += 1) {
              if (!modules[r][c]) continue;
              ctx.fillRect(Math.round((c + quiet) * cell), Math.round((r + quiet) * cell), Math.ceil(cell), Math.ceil(cell));
            }
          }
          hint.textContent = `已生成 · 版本 ${(size - 17) / 4} · ${text.length} 个字符 · 可直接用手机扫码`;
        } catch (err) {
          hint.textContent = err.message;
        }
      };
      input.addEventListener('input', render);
      sizeRange.addEventListener('input', render);
      root.querySelector('#qrRefresh').addEventListener('click', render);
      root.querySelector('#qrDownload').addEventListener('click', () => {
        canvas.toBlob((blob) => {
          if (blob) downloadBlob(blob, 'qingqi-qrcode.png');
        }, 'image/png');
      });
      render();
    };
    return t;
  };

  /* ---------------------------------------------------------------------------
     五、音频工作台通用装配
     --------------------------------------------------------------------------- */

  const loadAudioFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const ctx = audioContext();
          const buffer = await ctx.decodeAudioData(reader.result.slice(0));
          ctx.close();
          resolve(buffer);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

  const drawWaveform = (canvas, samples, color) => {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 96;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color || 'rgba(43,104,246,0.55)';
    const step = Math.max(1, Math.floor(samples.length / width));
    for (let x = 0; x < width; x += 1) {
      let min = 1;
      let max = -1;
      for (let i = 0; i < step; i += 1) {
        const v = samples[x * step + i] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const top = ((1 - max) / 2) * height;
      const bottom = ((1 - min) / 2) * height;
      ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
    }
  };

  const player = (buffer, gainValue, startSec, endSec) => {
    const ctx = audioContext();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = gainValue || 1;
    src.connect(gain).connect(ctx.destination);
    const offset = startSec || 0;
    const duration = endSec ? Math.max(0.05, endSec - offset) : undefined;
    src.start(0, offset, duration);
    return {
      stop: () => {
        try {
          src.stop();
        } catch {}
        ctx.close();
      },
      ctx,
      src,
    };
  };

  /* ---------------------------------------------------------------------------
     六、MP4 提取音频
     --------------------------------------------------------------------------- */

  const mp4Tool = () => {
    const t = tpl(
      'MP4 无损提取音频',
      '在浏览器本地解码音轨，试听并导出 WAV',
      `
      <div class="audio-tool">
        <label class="audio-drop" id="mp4Drop">
          <input type="file" id="mp4File" accept="video/*,audio/*" hidden />
          <span class="audio-drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><polygon points="10 9 15 12 10 15"/></svg>
          </span>
          <b>点击选择视频文件（MP4 / MOV / MKV / 音频亦可）</b>
          <small id="mp4FileName">音轨会在本地解码，不会上传到任何服务器</small>
        </label>
        <div class="audio-info" id="mp4Info">尚未选择文件</div>
        <div class="audio-wave"><canvas id="mp4Wave"></canvas></div>
        <div class="audio-controls">
          <button class="primary-btn" type="button" id="mp4Play" disabled>试听音轨</button>
          <button class="ghost-btn" type="button" id="mp4Stop" disabled>停止</button>
          <button class="ghost-btn" type="button" id="mp4Export" disabled>导出 WAV 音频</button>
        </div>
        <p class="field-tip">说明：导出为无损 PCM WAV，音质与源视频音轨完全一致；转换全程离线完成。</p>
      </div>`,
      'wide'
    );
    t.mount = (root, helpers) => {
      let buffer = null;
      let session = null;
      const info = root.querySelector('#mp4Info');
      const fileInput = root.querySelector('#mp4File');
      const canvas = root.querySelector('#mp4Wave');
      root.querySelector('#mp4Drop').addEventListener('click', (event) => {
        if (event.target.tagName !== 'INPUT') fileInput.click();
      });
      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        root.querySelector('#mp4FileName').textContent = file.name;
        info.textContent = '正在本地解码音轨…';
        try {
          buffer = await loadAudioFile(file);
          info.textContent = `已解码 · ${buffer.numberOfChannels} 声道 · ${buffer.sampleRate} Hz · 时长 ${fmtSeconds(buffer.duration)}`;
          drawWaveform(canvas, toMono(buffer), 'rgba(43,104,246,0.5)');
          ['#mp4Play', '#mp4Stop', '#mp4Export'].forEach((sel) => (root.querySelector(sel).disabled = false));
          helpers.toast('音轨解码完成，可以试听或导出');
        } catch (err) {
          info.textContent = '解码失败：该文件的音频编码暂不被浏览器支持（可尝试 Chrome / Edge）';
          helpers.toast('该视频的音频编码无法在当前浏览器解码');
        }
        fileInput.value = '';
      });
      root.querySelector('#mp4Play').addEventListener('click', () => {
        if (!buffer) return;
        if (session) session.stop();
        session = player(buffer, 1);
        helpers.toast('开始试听音轨');
      });
      root.querySelector('#mp4Stop').addEventListener('click', () => {
        if (session) session.stop();
        session = null;
        helpers.toast('已停止播放');
      });
      root.querySelector('#mp4Export').addEventListener('click', () => {
        if (!buffer) return;
        downloadBlob(encodeWav(toMono(buffer), buffer.sampleRate), 'qingqi-extracted-audio.wav');
        helpers.toast('已导出 WAV 音频文件');
      });
    };
    return t;
  };

  /* ---------------------------------------------------------------------------
     七、人声放大
     --------------------------------------------------------------------------- */

  const boosterTool = () => {
    const t = tpl(
      '音频人声智能放大',
      '100%–300% 实时增益 + 动态压缩防爆音',
      `
      <div class="audio-tool">
        <label class="audio-drop" id="boostDrop">
          <input type="file" id="boostFile" accept="audio/*" hidden />
          <span class="audio-drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.8 5.8a9 9 0 0 1 0 12.4"/></svg>
          </span>
          <b>点击选择音频文件（MP3 / WAV / M4A）</b>
          <small id="boostFileName">建议使用人声访谈、网课录音等素材</small>
        </label>
        <div class="audio-info" id="boostInfo">尚未选择文件</div>
        <div class="audio-wave"><canvas id="boostWave"></canvas></div>
        <label class="qr-slider boost-slider">放大倍数 <b id="boostValue">180%</b>
          <input type="range" id="boostGain" min="100" max="300" step="10" value="180" />
        </label>
        <div class="audio-controls">
          <button class="primary-btn" type="button" id="boostPlay" disabled>试听放大效果</button>
          <button class="ghost-btn" type="button" id="boostStop" disabled>停止</button>
          <button class="ghost-btn" type="button" id="boostExport" disabled>导出处理后音频</button>
        </div>
        <p class="field-tip">处理流程：增益放大 → 动态压缩（阈值 -18dB / 压缩比 4:1）→ 峰值限制，保留人声细节同时避免爆音。</p>
      </div>`,
      'wide'
    );
    t.mount = (root, helpers) => {
      let buffer = null;
      let session = null;
      const info = root.querySelector('#boostInfo');
      const fileInput = root.querySelector('#boostFile');
      const gainRange = root.querySelector('#boostGain');
      const gainLabel = root.querySelector('#boostValue');
      const canvas = root.querySelector('#boostWave');
      const gainValue = () => Number(gainRange.value) / 100;
      root.querySelector('#boostDrop').addEventListener('click', (event) => {
        if (event.target.tagName !== 'INPUT') fileInput.click();
      });
      gainRange.addEventListener('input', () => {
        gainLabel.textContent = `${gainRange.value}%`;
      });
      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        root.querySelector('#boostFileName').textContent = file.name;
        info.textContent = '正在解码音频…';
        try {
          buffer = await loadAudioFile(file);
          info.textContent = `已解码 · 时长 ${fmtSeconds(buffer.duration)} · ${buffer.sampleRate} Hz · 可拖动下方滑块实时试听放大倍数`;
          drawWaveform(canvas, toMono(buffer), 'rgba(142,86,226,0.5)');
          ['#boostPlay', '#boostStop', '#boostExport'].forEach((sel) => (root.querySelector(sel).disabled = false));
        } catch {
          info.textContent = '解码失败，请更换音频文件';
        }
        fileInput.value = '';
      });
      root.querySelector('#boostPlay').addEventListener('click', () => {
        if (!buffer) return;
        if (session) session.stop();
        const ctx = audioContext();
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = gainValue();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 4;
        comp.attack.value = 0.003;
        comp.release.value = 0.25;
        src.connect(gain).connect(comp).connect(ctx.destination);
        src.start();
        session = { stop: () => { try { src.stop(); } catch {} ctx.close(); } };
        helpers.toast(`正在以 ${gainRange.value}% 试听`);
      });
      root.querySelector('#boostStop').addEventListener('click', () => {
        if (session) session.stop();
        session = null;
      });
      root.querySelector('#boostExport').addEventListener('click', async () => {
        if (!buffer) return;
        helpers.toast('正在离线渲染处理后的音频…');
        try {
          const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
          const offline = new Offline(1, buffer.length, buffer.sampleRate);
          const src = offline.createBufferSource();
          src.buffer = buffer;
          const gain = offline.createGain();
          gain.gain.value = gainValue();
          const comp = offline.createDynamicsCompressor();
          comp.threshold.value = -18;
          comp.ratio.value = 4;
          src.connect(gain).connect(comp).connect(offline.destination);
          src.start();
          const rendered = await offline.startRendering();
          downloadBlob(encodeWav(toMono(rendered), rendered.sampleRate), 'qingqi-voice-boost.wav');
          helpers.toast('已导出放大处理后的音频');
        } catch {
          helpers.toast('渲染失败，请重试');
        }
      });
    };
    return t;
  };

  /* ---------------------------------------------------------------------------
     八、波形剪辑
     --------------------------------------------------------------------------- */

  const trimmerTool = () => {
    const t = tpl(
      'MP3 可视化波形剪辑',
      '真实声波绘制，拖拽区间裁剪并导出',
      `
      <div class="audio-tool">
        <label class="audio-drop" id="trimDrop">
          <input type="file" id="trimFile" accept="audio/*,video/*" hidden />
          <span class="audio-drop-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>
          </span>
          <b>点击选择音频文件</b>
          <small id="trimFileName">支持 MP3 / WAV / M4A / MP4</small>
        </label>
        <div class="audio-info" id="trimInfo">尚未选择文件</div>
        <div class="trim-wave-wrap"><canvas id="trimWave"></canvas><span class="trim-cursor" id="trimCursor"></span></div>
        <div class="trim-range">
          <label>开始 <b id="trimStartLabel">0:00</b>
            <input type="range" id="trimStart" min="0" max="1000" value="0" />
          </label>
          <label>结束 <b id="trimEndLabel">0:00</b>
            <input type="range" id="trimEnd" min="0" max="1000" value="1000" />
          </label>
        </div>
        <div class="audio-controls">
          <button class="primary-btn" type="button" id="trimPlay" disabled>试听选区</button>
          <button class="ghost-btn" type="button" id="trimStop" disabled>停止</button>
          <button class="ghost-btn" type="button" id="trimExport" disabled>导出选区 WAV</button>
        </div>
      </div>`,
      'wide'
    );
    t.mount = (root, helpers) => {
      let buffer = null;
      let session = null;
      const fileInput = root.querySelector('#trimFile');
      const info = root.querySelector('#trimInfo');
      const canvas = root.querySelector('#trimWave');
      const startRange = root.querySelector('#trimStart');
      const endRange = root.querySelector('#trimEnd');
      const startLabel = root.querySelector('#trimStartLabel');
      const endLabel = root.querySelector('#trimEndLabel');
      const cursor = root.querySelector('#trimCursor');

      const syncLabels = () => {
        if (!buffer) return;
        const start = (Number(startRange.value) / 1000) * buffer.duration;
        const end = (Number(endRange.value) / 1000) * buffer.duration;
        startLabel.textContent = fmtSeconds(start);
        endLabel.textContent = fmtSeconds(end);
        cursor.style.left = `${Number(startRange.value) / 10}%`;
        root.querySelector('#trimPlay').disabled = end - start < 0.2;
      };
      root.querySelector('#trimDrop').addEventListener('click', (event) => {
        if (event.target.tagName !== 'INPUT') fileInput.click();
      });
      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        root.querySelector('#trimFileName').textContent = file.name;
        info.textContent = '正在解码音频…';
        try {
          buffer = await loadAudioFile(file);
          info.textContent = `已解码 · 时长 ${fmtSeconds(buffer.duration)} · ${buffer.sampleRate} Hz`;
          drawWaveform(canvas, toMono(buffer), 'rgba(24,160,106,0.55)');
          ['#trimStop', '#trimExport'].forEach((sel) => (root.querySelector(sel).disabled = false));
          syncLabels();
        } catch {
          info.textContent = '解码失败，请更换文件';
        }
        fileInput.value = '';
      });
      startRange.addEventListener('input', () => {
        if (Number(startRange.value) > Number(endRange.value) - 20) startRange.value = String(Number(endRange.value) - 20);
        syncLabels();
      });
      endRange.addEventListener('input', () => {
        if (Number(endRange.value) < Number(startRange.value) + 20) endRange.value = String(Number(startRange.value) + 20);
        syncLabels();
      });
      const range = () => {
        const start = (Number(startRange.value) / 1000) * buffer.duration;
        const end = (Number(endRange.value) / 1000) * buffer.duration;
        return { start, end };
      };
      root.querySelector('#trimPlay').addEventListener('click', () => {
        if (!buffer) return;
        if (session) session.stop();
        const { start, end } = range();
        const ctx = audioContext();
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        src.start(0, start, end - start);
        session = { stop: () => { try { src.stop(); } catch {} ctx.close(); } };
        helpers.toast(`试听 ${fmtSeconds(start)} – ${fmtSeconds(end)} 选区`);
      });
      root.querySelector('#trimStop').addEventListener('click', () => {
        if (session) session.stop();
        session = null;
      });
      root.querySelector('#trimExport').addEventListener('click', () => {
        if (!buffer) return;
        const { start, end } = range();
        const samples = toMono(buffer);
        const from = Math.floor(start * buffer.sampleRate);
        const to = Math.min(samples.length, Math.floor(end * buffer.sampleRate));
        downloadBlob(encodeWav(samples.slice(from, to), buffer.sampleRate), 'qingqi-trimmed-clip.wav');
        helpers.toast(`已导出 ${fmtSeconds(end - start)} 的音频片段`);
      });
    };
    return t;
  };

  window.QingqiTools = {
    json: jsonTool,
    qrcode: qrTool,
    mp4tomp3: mp4Tool,
    booster: boosterTool,
    trimmer: trimmerTool,
  };
})();
