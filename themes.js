// キャラごとの背景テーマ。すべて文字セルで描くAA。draw は毎フレーム呼ばれ、cmd はそのキャラ専用コマンドになる。
(function () {
  const RED = '#ff5a52';
  const hash = i => { const x = Math.sin(i * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); };
  const hash2 = (x, y) => hash(x * 57.3 + y * 311.7);
  const yen = n => '¥' + Math.round(n).toLocaleString('ja-JP');
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function grid(g, W, H, bg){
    const small = W <= 760, size = small ? 11 : 13, ch = small ? 13 : 15;
    g.font = `${size}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
    g.textBaseline = 'top';
    const cw = Math.ceil(g.measureText('M').width);
    let last = '';
    const put = (x, y, c, col) => {
      if (col !== last) { g.fillStyle = col; last = col; }
      g.fillText(c, x * cw, y * ch);
    };
    // 背景を塗ってから文字を置くことで、AAの部品を下の絵より手前に出す
    const stamp = (x, y, lines, col) => lines.forEach((line, r) => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === ' ') continue;
        g.fillStyle = bg; last = bg; g.fillRect((x + i) * cw, (y + r) * ch, cw, ch);
        put(x + i, y + r, line[i], col);
      }
    });
    return { cols: Math.ceil(W / cw), rows: Math.ceil(H / ch), put, stamp, small, cw, ch };
  }

  // 早瀬ユウカ: 数字に強い → + と . の場が波打ち、グラフと大きな数値が動く
  const DIGITS = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111' };
  const RAMP = ' ..:-=+*#';
  const plot = {
    cmd: 'calc',
    help: 'calc 式    計算する（例: calc 12*34）',
    tip: 'クリックで波紋',
    ripples: [],
    draw(g, W, H, T, { accent, bg, mouse }){
      const { cols, rows, put, stamp, small, cw, ch } = grid(g, W, H, bg);
      const mx = mouse.x / cw, my = mouse.y / ch, cx = cols * .45 + (mx - cols * .45) * mouse.w, cy = rows * .5 + (my - rows * .5) * mouse.w;
      this.grid = { cw, ch };
      this.ripples = this.ripples.filter(r => T - r.t < 2.5);
      for (let y = 3; y < rows; y++) for (let x = 0; x < cols; x += 2) {
        const dist = Math.hypot(x - cx, (y - cy) * 2);
        let v = (Math.sin(dist * .17 - T * 1.5) + Math.sin(x * .07 + y * .19 + T * .6)) / 2;
        for (const r of this.ripples) if (Math.abs(Math.hypot(x - r.x, (y - r.y) * 2) - (T - r.t) * 30) < 2.5) v = 1;
        const level = Math.floor((v + 1) / 2 * RAMP.length);
        if (x % 8 === 0 && y % 4 === 0) { put(x, y, '+', v > .35 ? accent : 'rgba(232,230,225,.34)'); continue; }
        const c = RAMP[Math.min(level, RAMP.length - 1)];
        if (c !== ' ') put(x, y, c, v > .62 ? accent : `rgba(232,230,225,${.07 + (v + 1) * .1})`);
      }
      // 棒グラフと折れ線
      const base = rows - 3, bars = small ? 24 : 54, barW = Math.floor(cols / bars);
      for (let i = 0; i < bars; i++) {
        const lift = mouse.w * Math.max(0, 8 - Math.abs(i * barW - mx) / 3);
        const h = Math.round((Math.sin(i * .35 + T * .9) * .5 + .5) * (hash(i) * .6 + .4) * 11 + lift) + 1;
        for (let k = 0; k < h; k++) for (let b = 0; b < barW - 1; b++) put(i * barW + b, base - k, k === h - 1 ? '#' : '+', k === h - 1 ? accent : 'rgba(232,230,225,.4)');
      }
      for (let x = 0; x < cols; x++) {
        const y = Math.round(rows * .28 + Math.sin(x * .09 + T * .8) * 3.5 + Math.sin(x * .23 - T * .5) * 1.5);
        put(x, y, 'o', RED);
      }
      if (mouse.on) {
        const px = Math.round(mx), py = Math.round(my);
        for (let x = 0; x < cols; x += 2) put(x, py, '-', accent);
        for (let y = 3; y < rows; y++) put(px, y, '|', accent);
        stamp(px + 2, py - 2, ['x:' + String(px).padStart(3, '0') + ' y:' + String(py).padStart(3, '0'), yen(px * py * 1234)], '#e8e6e1');
      }
      // ドットマトリクスの数値
      const value = String(104729880 + Math.floor(T * 86137)), shown = small ? value.slice(-6) : value;
      [...shown].forEach((d, n) => {
        for (let b = 0; b < 15; b++) {
          if (DIGITS[d][b] === '1') stamp(2 + n * 10 + (b % 3) * 3, 4 + Math.floor(b / 3), ['+#+'], '#e8e6e1');
        }
      });
    },
    click(mouse, T){ if (this.grid) this.ripples.push({ x: mouse.x / this.grid.cw, y: mouse.y / this.grid.ch, t: T }); },
    run(arg){
      if (!/^[\d+\-*/().\s]+$/.test(arg)) return '式が読めません。例: <span class="key">calc 12*34</span>';
      try {
        const v = Function(`"use strict"; return (${arg})`)();
        if (!Number.isFinite(v)) return 'その計算は予算に通りません。';
        return `<span class="key">=</span> ${v.toLocaleString('ja-JP')}\n\n<span class="dim">検算済み。端数も見逃しません。</span>`;
      } catch (e) { return '式が読めません。例: <span class="key">calc 12*34</span>'; }
    },
  };

  // レーベル: 本 → 流れる本棚と、羽ばたく本
  const PHRASES = ['頁をめくる音だけが響いていた。', '栞はいつも同じ場所に挟まれている。', 'その名前は余白に書かれていた。', 'あなたはまだ気づいていない。', '古い書架の奥に一冊だけ残っている。', '物語の結末はもう決まっている。', 'ずっとあなたを探していた。', '次の章で、また会いましょう。'];
  const FILL = ['||', '==', '::', '##', '%%', '//'];
  const SPINE_COLS = ['rgba(150,140,220,.5)', 'rgba(232,230,225,.32)', 'rgba(110,120,170,.55)', 'rgba(190,170,130,.42)', 'rgba(232,230,225,.2)'];
  const WINGS = [
    [' ________ ________ ', '|~~~~~~~~V~~~~~~~~|', '|~~~~~~~~|~~~~~~~~|', '|________|________|'],
    ['  _______ _______  ', ' /~~~~~~~V~~~~~~~\\ ', '/~~~~~~~~|~~~~~~~~\\', '`--------\'--------\''],
    ['\\~~~~~~~   ~~~~~~~/', ' \\~~~~~~\\ /~~~~~~/ ', '  \\~~~~~~V~~~~~~/  ', '   `-----\'-----\'   '],
  ];
  const shelfBooks = s => {
    const list = [];
    let total = 0;
    for (let i = 0; total < 260; i++) {
      const w = 3 + Math.floor(hash(s * 91 + i) * 3), h = 3 + Math.floor(hash(s * 17 + i * 3) * 3);
      list.push({ i, at: total, w, h, fill: FILL[Math.floor(hash(i + s) * FILL.length)], col: SPINE_COLS[Math.floor(hash(i * 7 + s) * SPINE_COLS.length)] });
      total += w + 2;
    }
    return { list, total };
  };
  const shelves = Array.from({ length: 12 }, (_, s) => shelfBooks(s));
  const book = {
    cmd: 'find',
    help: 'find 言葉  本の中を検索する',
    tip: 'クリックで本を読む',
    draw(g, W, H, T, { accent, bg, mouse }){
      const { cols, rows, put, stamp, cw, ch } = grid(g, W, H, bg);
      const mx = mouse.x / cw, my = mouse.y / ch;
      const hop = Math.floor(T / 1.8), litShelf = hop % Math.ceil((rows - 4) / 7);
      for (let s = 0, y = 3; y < rows; s++, y += 7) {
        const shelf = shelves[s % shelves.length], dir = s % 2 ? 1 : -1, shift = Math.floor(T * 2.4) * dir;
        const lit = shelf.list[hash(hop) * shelf.list.length | 0];
        for (let n = 0; n < 2; n++) shelf.list.forEach(b => {
          const x = ((b.at + shift) % shelf.total + shelf.total) % shelf.total - (n ? shelf.total : 0);
          if (x > cols || x + b.w + 2 < 0) return;
          const near = mouse.on ? Math.hypot(x + b.w / 2 + 1 - mx, (y + 3 - my) * 2) : 99;
          const on = (s === litShelf && b === lit) || near < 5, top = y + 5 - b.h - (near < 5 ? 1 : 0);
          const col = on ? accent : near < 22 ? `rgba(232,230,225,${(.8 - near * .025).toFixed(2)})` : b.col;
          for (let c = 1; c <= b.w; c++) put(x + c, top, '_', col);
          for (let r = 1; r <= b.h; r++) {
            put(x, top + r, '|', col); put(x + b.w + 1, top + r, '|', col);
            const pattern = r === 2 ? '='.repeat(b.w) : (on ? '#'.repeat(b.w) : b.fill.repeat(b.w).slice(0, b.w));
            for (let c = 0; c < b.w; c++) put(x + 1 + c, top + r, pattern[c], col);
          }
        });
        for (let x = 0; x < cols; x++) put(x, y + 6, x % 9 === 0 ? '+' : '=', 'rgba(232,230,225,.26)');
      }
      for (let i = 0; i < 3; i++) {
        const span = cols + 40, x = Math.round(((hash(i + 5) * span + T * (2.5 + i * 1.4)) % span) - 20);
        const y = Math.round(rows * (.2 + i * .27) + Math.sin(T * .8 + i * 2) * 3);
        const wing = [0, 1, 2, 1][Math.floor(T * 4 + i) % 4];
        stamp(x, y, WINGS[wing], i === 1 ? accent : 'rgba(232,230,225,.72)');
      }
    },
    click(){ return `<span class="dim">$ read book</span>\n\n${PHRASES[Math.floor(Math.random() * PHRASES.length)]}`; },
    run(arg){
      if (!arg) return '<span class="dim">何を探しますか？</span>';
      const hits = PHRASES.filter(s => s.includes(arg));
      if (!hits.length) return `pattern not found: ${esc(arg)}\n\n<span class="dim">探し続ければ、きっと見つかります。</span>`;
      return `<span class="key">${hits.length}</span> 件見つかりました\n\n${hits.slice(0, 3).map(s => esc(s)).join('\n')}`;
    },
  };

  // 猫耳メイド: 風の吹く草原、葉と花、歩く猫
  const HEADS = [[' _ ', '(@)'], ['\\V/'], ['.*.', '*@*', "'*'"], ['(o)'], ['\\|/', '-O-']];
  const COLORS = ['#ff9db5', '#ffd166', '#f4f1de', '#ff7f6a', '#c9a7ff'];
  const LEAVES = ['~', '{', '(', ',', '`'];
  const CLOUD = ['    .--.    ', ' .-(    ).  ', '(___.__)__) '];
  const CAT = [[' /\\_/\\  ', '( o.o )~', ' (   )  ', ' /   \\  '], [' /\\_/\\  ', '( -.- )~', ' (   )  ', '  \\ /   ']];
  const flowers = Array.from({ length: 150 }, (_, i) => ({ x: hash(i + 1), d: hash(i * 3 + 2), kind: Math.floor(hash(i * 5) * HEADS.length), col: COLORS[Math.floor(hash(i * 7) * COLORS.length)], seed: hash(i * 9) * 6 }));
  const planted = [];
  const meadow = {
    cmd: 'plant',
    help: 'plant     草原に花を植える',
    tip: 'クリックで花を植える',
    draw(g, W, H, T, { accent, bg, mouse }){
      const { cols, rows, put, stamp, small, cw, ch } = grid(g, W, H, bg);
      const mx = mouse.x / cw, my = mouse.y / ch;
      const reach = (x, y) => mouse.on ? Math.hypot(x - mx, (y - my) * 2) : 99;
      const horizon = x => Math.round(rows * .36 + Math.sin(x * .05) * 2 + Math.sin(x * .013 + 1) * 3);
      for (let y = 3; y < rows * .4; y++) for (let x = 0; x < cols; x++) if (hash2(x, y) > .988) put(x, y, Math.sin(T + x) > .4 ? '+' : '.', 'rgba(232,230,225,.4)');
      [0, 1, 2].forEach(i => {
        const span = cols + 24, x = Math.round((hash(i + 40) * span + T * (1 + i * .5)) % span) - 12;
        stamp(x, 4 + i * 3, CLOUD, 'rgba(232,230,225,.46)');
      });
      this.place = (x, y) => { const top = horizon(x), d = (y - top) / (rows - top - 2); return d > 0 && d < 1 ? d : null; };
      this.cols = cols; this.cw = cw; this.ch = ch;
      for (let x = 0; x < cols; x++) {
        const top = horizon(x);
        for (let y = top; y < rows; y++) {
          const d = (y - top) / Math.max(1, rows - top), wind = Math.sin(x * .12 - T * 1.6 + y * .35), far = reach(x, y);
          if (hash2(x, y) > .34 + d * .55 || far < 3.5) continue;
          const c = far < 12 ? (x > mx ? '/' : '\\') : d < .2 ? '.,'[x & 1] : d < .55 ? ",;'\""[(x + y) & 3] : wind > .35 ? '/' : wind < -.35 ? '\\' : '|';
          const green = 70 + Math.floor(hash2(y, x) * 70 + d * 60);
          put(x, y, c, `rgb(${Math.floor(green * .45)},${green},${Math.floor(green * .4)})`);
        }
      }
      const all = flowers.concat(planted).slice().sort((a, b) => a.d - b.d);
      all.forEach(f => {
        const x0 = Math.round(f.x * cols), top = horizon(x0), y = Math.round(top + f.d * (rows - top - 2));
        const sway = Math.round(Math.sin(T * 1.4 + f.seed + x0 * .1) * (.4 + f.d)) + (reach(x0, y) < 12 ? (x0 > mx ? 2 : -2) : 0);
        if (f.d < .25) return put(x0 + sway, y, '*', f.col);
        const head = HEADS[f.kind], stem = 1 + Math.round(f.d * 3);
        for (let s = 1; s <= stem; s++) put(x0 + 1 + (s === 1 ? sway : 0), y + s, s === 2 ? '{' : '|', 'rgb(90,170,80)');
        stamp(x0 + sway, y + 1 - head.length, head, f.col);
      });
      for (let i = 0; i < 26; i++) {
        const span = cols + 20, x = Math.round((hash(i + 70) * span + T * (3 + hash(i) * 5)) % span) - 10;
        const y = Math.round(rows * (.15 + hash(i + 90) * .7) + Math.sin(T * 1.2 + i) * 2);
        put(x, y, LEAVES[(i + Math.floor(T * 3)) % LEAVES.length], i % 3 ? 'rgb(140,200,100)' : '#ff9db5');
      }
      const fly = [cols * .5 + Math.sin(T * .5) * cols * .3, rows * .5 + Math.sin(T * 1.3) * 5].map(Math.round);
      if (mouse.on) { fly[0] = Math.round(mx + Math.sin(T * 2) * 4); fly[1] = Math.round(my - 3 + Math.sin(T * 3)); }
      put(fly[0], fly[1], Math.floor(T * 6) % 2 ? '}{' : '><', '#ffd166');
      const walk = Math.round((T * 4) % (cols + 16)) - 8;
      stamp(walk, small ? Math.round(rows * .58) : rows - 7, CAT[Math.floor(T * 3) % 2], accent);
    },
    bloom(x, d){ planted.push({ x, d, kind: Math.floor(Math.random() * HEADS.length), col: COLORS[Math.floor(Math.random() * COLORS.length)], seed: Math.random() * 6 }); },
    click(mouse){
      if (!this.place) return;
      const x = mouse.x / this.cw, d = this.place(x, mouse.y / this.ch);
      if (d !== null) this.bloom(x / this.cols, Math.max(.26, d));
    },
    run(){
      this.bloom(Math.random(), .3 + Math.random() * .6);
      return `<span class="key">*</span> 花を植えました（${planted.length}本目）\n\n<span class="dim">風にゆれています。</span>`;
    },
  };

  window.THEMES = { plot, book, meadow };
})();
