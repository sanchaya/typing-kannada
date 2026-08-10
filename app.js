/* ============================================================
   ಕೀಲಿಕನ್ನಡ — Kannada typing tutor
   Data-driven, multi-layout. A registry (data/layouts.json) lists
   every layout; each layout's full config (keymap state machine OR
   jquery.IME rule set, historic sequences, examples, findings) lives
   in data/layouts/<id>.json. This app is a thin, generic shell:
   - type "keymap"  → a faithful re-implementation of the KPRao/KGP/Nudi
     macOS .keylayout action/terminator state machine.
   - type "ime"     → a faithful port of Wikimedia jQuery.IME's
     transliterate() (patterns / patterns_x / context window / noop
     passthrough) for the InScript / Enhanced InScript / ITRANS-style
     transliteration rule sets.
   ============================================================ */

(async function(){
"use strict";

/* ---------------- bootstrap: registry + selected layout ---------------- */
async function fetchJson(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error('HTTP ' + r.status + ' → ' + url);
  return r.json();
}

let REGISTRY;
let LAYOUT;
let SEL = 'kgp';
/* digit-mode switch: off = layout's native digits (೦-೯), on = Western ASCII digits (0-9).
   Maps CODE_MAP index → ASCII digit (Digit1=18 … Digit0=29, Digit6/5 swapped by CODE_MAP). */
const DIGIT_ASCII = { 18:'1',19:'2',20:'3',21:'4',22:'6',23:'5',25:'9',26:'7',28:'8',29:'0' };
let westDigits = false;
try{
  REGISTRY = await fetchJson('data/layouts.json');
  try{
    const stored = localStorage.getItem('typingKannadaLayout');
    if(stored && REGISTRY.layouts.some(l=>l.id === stored)) SEL = stored;
    westDigits = localStorage.getItem('typingKannadaDigits') === '1';
  }catch(e){ /* localStorage unavailable */ }
  LAYOUT = await loadLayout(SEL);
}catch(err){
  document.body.innerHTML = '<p style="font-family:sans-serif;padding:40px;">Could not load the layout registry (<code>data/layouts.json</code>). If you opened this file directly (file://), run a local static server instead — e.g. <code>python3 -m http.server</code> — then visit http://localhost:8080. On GitHub Pages this loads automatically.</p>';
  throw err;
}

async function loadLayout(id){
  const l = await fetchJson('data/layouts/' + id + '.json');
  l.maxKeyLength = l.maxKeyLength || 1;
  l.contextLength = l.contextLength || 0;
  const reg = REGISTRY.layouts.find(r=>r.id === id);
  if(reg && l.type === undefined) l.type = reg.type;
  return l;
}

/* JS KeyboardEvent.code -> macOS ANSI virtual keycode used in the .keylayout file */
const CODE_MAP = {
  KeyA:0, KeyS:1, KeyD:2, KeyF:3, KeyH:4, KeyG:5, KeyZ:6, KeyX:7, KeyC:8, KeyV:9,
  KeyB:11, KeyQ:12, KeyW:13, KeyE:14, KeyR:15, KeyY:16, KeyT:17,
  Digit1:18, Digit2:19, Digit3:20, Digit4:21, Digit6:22, Digit5:23, Equal:24,
  Digit9:25, Digit7:26, Minus:27, Digit8:28, Digit0:29,
  BracketRight:30, KeyO:31, KeyU:32, BracketLeft:33, KeyI:34, KeyP:35,
  Enter:36, KeyL:37, KeyJ:38, Quote:39, KeyK:40, Semicolon:41, Backslash:42,
  Comma:43, Slash:44, KeyN:45, KeyM:46, Period:47, Tab:48, Space:49,
  Backquote:50, Backspace:51
};

/* Rows of the rendered US-ANSI keyboard (physical keycodes) */
const ROWS = [
  [18,19,20,21,23,22,26,28,25,29,27,24],
  [12,13,14,15,17,16,32,34,31,35,33,30,42],
  [0,1,2,3,5,4,38,40,37,41,39],
  [6,7,8,9,11,45,46,43,47,44],
];
const QWERTY_LABEL = {
  18:'1',19:'2',20:'3',21:'4',23:'5',22:'6',26:'7',28:'8',25:'9',29:'0',27:'-',24:'=',
  12:'Q',13:'W',14:'E',15:'R',17:'T',16:'Y',32:'U',34:'I',31:'O',35:'P',33:'[',30:']',42:'\\',
  0:'A',1:'S',2:'D',3:'F',5:'G',4:'H',38:'J',40:'K',37:'L',41:';',39:"'",
  6:'Z',7:'X',8:'C',9:'V',11:'B',45:'N',46:'M',43:',',47:'.',44:'/'
};
/* what shift produces on each US-ANSI code -> the actual character an IME
   would receive (so we don't depend on OS key composition) */
const US_SHIFT = {
  18:'!',19:'@',20:'#',21:'$',23:'%',22:'^',26:'&',28:'*',25:'(',29:')',27:'_',
  24:'+',33:'{',30:'}',42:'|',41:':',39:'"',43:'<',47:'>',44:'?',50:'~'
};

function charFromCode(code, shift){
  if(code === 49) return ' '; /* Space renders on every layout */
  const base = QWERTY_LABEL[code];
  if(base === undefined) return undefined;
  if(!shift) return base.toLowerCase();
  return US_SHIFT[code] || base.toUpperCase();
}

/* Every assigned codepoint in the Kannada block (U+0C80–U+0CFF), the master
   reference list. Reachability per layout is computed dynamically by
   buildCoverage() — the app never hardcodes which letters a layout types. */
const UNICODE_COVERAGE = [
  { cp:'U+0C80', ch:'ಀ', name:'Spacing candrabindu' },
  { cp:'U+0C81', ch:'ಁ', name:'Candrabindu' },
  { cp:'U+0C82', ch:'ಂ', name:'Anusvara' },
  { cp:'U+0C83', ch:'ಃ', name:'Visarga' },
  { cp:'U+0C84', ch:'಄', name:'Siddham' },
  { cp:'U+0C85', ch:'ಅ', name:'A' },
  { cp:'U+0C86', ch:'ಆ', name:'AA' },
  { cp:'U+0C87', ch:'ಇ', name:'I' },
  { cp:'U+0C88', ch:'ಈ', name:'II' },
  { cp:'U+0C89', ch:'ಉ', name:'U' },
  { cp:'U+0C8A', ch:'ಊ', name:'UU' },
  { cp:'U+0C8B', ch:'ಋ', name:'Vocalic R' },
  { cp:'U+0C8C', ch:'ಌ', name:'Vocalic L' },
  { cp:'U+0C8E', ch:'ಎ', name:'E' },
  { cp:'U+0C8F', ch:'ಏ', name:'EE' },
  { cp:'U+0C90', ch:'ಐ', name:'AI' },
  { cp:'U+0C92', ch:'ಒ', name:'O' },
  { cp:'U+0C93', ch:'ಓ', name:'OO' },
  { cp:'U+0C94', ch:'ಔ', name:'AU' },
  { cp:'U+0C95', ch:'ಕ', name:'Ka' },
  { cp:'U+0C96', ch:'ಖ', name:'Kha' },
  { cp:'U+0C97', ch:'ಗ', name:'Ga' },
  { cp:'U+0C98', ch:'ಘ', name:'Gha' },
  { cp:'U+0C99', ch:'ಙ', name:'Nga' },
  { cp:'U+0C9A', ch:'ಚ', name:'Ca' },
  { cp:'U+0C9B', ch:'ಛ', name:'Cha' },
  { cp:'U+0C9C', ch:'ಜ', name:'Ja' },
  { cp:'U+0C9D', ch:'ಝ', name:'Jha' },
  { cp:'U+0C9E', ch:'ಞ', name:'Nya' },
  { cp:'U+0C9F', ch:'ಟ', name:'Tta' },
  { cp:'U+0CA0', ch:'ಠ', name:'Ttha' },
  { cp:'U+0CA1', ch:'ಡ', name:'Dda' },
  { cp:'U+0CA2', ch:'ಢ', name:'Ddha' },
  { cp:'U+0CA3', ch:'ಣ', name:'Nna' },
  { cp:'U+0CA4', ch:'ತ', name:'Ta' },
  { cp:'U+0CA5', ch:'ಥ', name:'Tha' },
  { cp:'U+0CA6', ch:'ದ', name:'Da' },
  { cp:'U+0CA7', ch:'ಧ', name:'Dha' },
  { cp:'U+0CA8', ch:'ನ', name:'Na' },
  { cp:'U+0CAA', ch:'ಪ', name:'Pa' },
  { cp:'U+0CAB', ch:'ಫ', name:'Pha' },
  { cp:'U+0CAC', ch:'ಬ', name:'Ba' },
  { cp:'U+0CAD', ch:'ಭ', name:'Bha' },
  { cp:'U+0CAE', ch:'ಮ', name:'Ma' },
  { cp:'U+0CAF', ch:'ಯ', name:'Ya' },
  { cp:'U+0CB0', ch:'ರ', name:'Ra' },
  { cp:'U+0CB1', ch:'ಱ', name:'Rra' },
  { cp:'U+0CB2', ch:'ಲ', name:'La' },
  { cp:'U+0CB3', ch:'ಳ', name:'Lla' },
  { cp:'U+0CB5', ch:'ವ', name:'Va' },
  { cp:'U+0CB6', ch:'ಶ', name:'Sha' },
  { cp:'U+0CB7', ch:'ಷ', name:'Ssa' },
  { cp:'U+0CB8', ch:'ಸ', name:'Sa' },
  { cp:'U+0CB9', ch:'ಹ', name:'Ha' },
  { cp:'U+0CBC', ch:'಼', name:'Nukta' },
  { cp:'U+0CBD', ch:'ಽ', name:'Avagraha' },
  { cp:'U+0CBE', ch:'ಾ', name:'Sign AA' },
  { cp:'U+0CBF', ch:'ಿ', name:'Sign I' },
  { cp:'U+0CC0', ch:'ೀ', name:'Sign II' },
  { cp:'U+0CC1', ch:'ು', name:'Sign U' },
  { cp:'U+0CC2', ch:'ೂ', name:'Sign UU' },
  { cp:'U+0CC3', ch:'ೃ', name:'Sign ṛ' },
  { cp:'U+0CC4', ch:'ೄ', name:'Sign ṝ' },
  { cp:'U+0CC6', ch:'ೆ', name:'Sign E' },
  { cp:'U+0CC7', ch:'ೇ', name:'Sign EE' },
  { cp:'U+0CC8', ch:'ೈ', name:'Sign AI' },
  { cp:'U+0CCA', ch:'ೊ', name:'Sign O' },
  { cp:'U+0CCB', ch:'ೋ', name:'Sign OO' },
  { cp:'U+0CCC', ch:'ೌ', name:'Sign AU' },
  { cp:'U+0CCD', ch:'್', name:'Virama' },
  { cp:'U+0CD5', ch:'ೕ', name:'Length mark' },
  { cp:'U+0CD6', ch:'ೖ', name:'AI length mark' },
  { cp:'U+0CDD', ch:'ೝ', name:'Nakaara pollu' },
  { cp:'U+0CDE', ch:'ೞ', name:'Fa' },
  { cp:'U+0CE0', ch:'ೠ', name:'Vocalic RR' },
  { cp:'U+0CE1', ch:'ೡ', name:'Vocalic LL' },
  { cp:'U+0CE2', ch:'ೢ', name:'Sign ḷ' },
  { cp:'U+0CE3', ch:'ೣ', name:'Sign ḻ' },
  { cp:'U+0CE6', ch:'೦', name:'0' },
  { cp:'U+0CE7', ch:'೧', name:'1' },
  { cp:'U+0CE8', ch:'೨', name:'2' },
  { cp:'U+0CE9', ch:'೩', name:'3' },
  { cp:'U+0CEA', ch:'೪', name:'4' },
  { cp:'U+0CEB', ch:'೫', name:'5' },
  { cp:'U+0CEC', ch:'೬', name:'6' },
  { cp:'U+0CED', ch:'೭', name:'7' },
  { cp:'U+0CEE', ch:'೮', name:'8' },
  { cp:'U+0CEF', ch:'೯', name:'9' },
  { cp:'U+0CF1', ch:'ೱ', name:'Jihvamuliya' },
  { cp:'U+0CF2', ch:'ೲ', name:'Upadhmaniya' },
  { cp:'U+0CF3', ch:'ೳ', name:'Combining anusvara' }
];
const KANNADA_RE = /[\u0C80-\u0CFF]/;

function controlLabel(v){
  switch(v){
    case '\t': return 'Tab';
    case '\r': return '⏎';
    case ' ':  return '␣';
    case '\b': return '⌫';
    case '\x1b': return 'Esc';
    default: return v;
  }
}

function escapeHtml(s){
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

/* ---------------- Engines ----------------
   One unified engine object per surface; type switches behaviour. */

function keymapEngine(lay){
  return {
    type:'keymap',
    layout: () => lay,
    state:'none', seq:null,
    reset(){ this.state='none'; this.seq=null; },
    pressLayout(code, shift){
      const km = shift ? lay.keymap1 : lay.keymap0;
      const entry = km && km[code];
      if(!entry) return '';
      let out = '';
      if(entry.type === 'output'){
        if(this.state !== 'none'){ out += lay.terminators[this.state] || ''; this.state='none'; }
        out += entry.value;
        return out;
      }
      const table = lay.actions[entry.value];
      if(!table) return '';
      let when = table[this.state];
      if(!when){
        if(this.state !== 'none'){ out += lay.terminators[this.state] || ''; this.state='none'; }
        when = table['none'];
      }
      if(when){
        if('output' in when){ out += when.output; this.state='none'; }
        else if('next' in when){ this.state = when.next; }
      }
      return out;
    },
    press(code, shift){
      if(this.seq !== null){
        const seq = lay.historicSeq;
        const hit = seq && seq[code * 2 + (shift ? 1 : 0)];
        this.seq = null;
        if(hit) return hit;
        return (lay.historicPrefixChar !== undefined ? lay.historicPrefixChar : '\u0060') + this.pressLayout(code, shift);
      }
      if(lay.historicPrefixCode === code && !shift && lay.historicSeq){
        this.seq = (lay.historicPrefixChar !== undefined ? lay.historicPrefixChar : '\u0060');
        return '';
      }
      return this.pressLayout(code, shift);
    },
    backspace(){
      if(this.seq !== null){ this.seq=null; return true; }
      if(this.state !== 'none'){ this.state='none'; return true; }
      return false;
    },
    pendingPreview(){
      if(this.seq !== null) return this.seq;
      return this.state === 'none' ? '' : (lay.terminators[this.state] || '');
    },
    flush(){
      if(this.seq !== null){ const out=this.seq; this.seq=null; return out; }
      if(this.state !== 'none'){ const out = lay.terminators[this.state] || ''; this.state='none'; return out; }
      return '';
    }
  };
}

/* faithful port of jquery.ime transliterate() + keypress flow */
function imeTransliterate(layout, input, context, altGr, shift){
  const patterns = altGr ? (layout.patterns_x || [])
    : ((shift && (layout.patterns_shift || []).length)
        ? layout.patterns_shift.concat(layout.patterns || [])
        : (layout.patterns || []));
  for(const rule of patterns){
    const re = new RegExp(rule[0] + '$');
    if(re.test(input)){
      if(rule.length === 3){
        if(new RegExp(rule[1] + '$').test(context)){
          return { noop:false, output: input.replace(re, rule[rule.length-1]) };
        }
      }else{
        return { noop:false, output: input.replace(re, rule[rule.length-1]) };
      }
    }
  }
  return { noop:true, output: input };
}

function imeEngine(lay){
  return {
    type:'ime',
    layout: () => lay,
    ctx:'',
    reset(){ this.ctx = ''; },
    /* buffer = current composed text; ch = the character this keypress
       produced on a US-ANSI keyboard; returns the new buffer. */
    processChar(buffer, ch, altGr, shift){
      const input = buffer.slice(-lay.maxKeyLength);
      const candidate = input + ch;
      const res = imeTransliterate(lay, candidate, this.ctx, altGr, shift);
      this.ctx = (this.ctx + ch).slice(-lay.contextLength);
      if(res.noop) return buffer + ch;
      return buffer.slice(0, buffer.length - input.length) + res.output;
    },
    backspace(){ return false; },
    pendingPreview(){ return ''; },
    flush(){ return ''; }
  };
}

function createEngine(){
  const lay = LAYOUT;
  return lay.type === 'ime' ? imeEngine(lay) : keymapEngine(lay);
}

/* ---------------- Per-layout coverage metadata ----------------
   layer of each Kannada char: 'base' | 'backquote' | 'altgr' | 'shift' | null,
   plus a short human stroke ('`+r', '⌥+H', '+', …) where one exists. */
function strokeLabel(input){
  return ('' + input).replace(/\\(.)/g, '$1');
}

function buildCoverage(){
  const map = new Map();       // char -> {layer, stroke}
  const add = (ch, layer, stroke) => {
    if(ch === undefined || !KANNADA_RE.test(ch)) return;
    if(KANNADA_RE.test(ch)){
      const prev = map.get(ch);
      if(prev && prev.layer === 'base') return;   // base wins
      map.set(ch, { layer, stroke });
    }
  };

  if(LAYOUT.type === 'keymap'){
    for(const row of [LAYOUT.keymap0, LAYOUT.keymap1]){
      for(const entry of Object.values(row || {})){
        if(entry && entry.type === 'output') Array.from(entry.value).forEach(c=> add(c, 'base', ''));
      }
    }
    for(const key in (LAYOUT.actions||{})){
      const table = LAYOUT.actions[key];
      for(const state in table){
        const br = table[state];
        if(br && br.output !== undefined) Array.from(br.output).forEach(c=> add(c, 'base', ''));
      }
    }
    for(const term of Object.values(LAYOUT.terminators||{})){ if(term) Array.from(term).forEach(c=> add(c, 'base', '')); }
    // historic dead-key layer (backquote ` + key)
    const seq = LAYOUT.historicSeq;
    if(seq){
      for(const key in seq){
        const code = Math.floor(+key / 2);
        const shift = (+key) % 2 === 1;
        const label = (QWERTY_LABEL[code] || code) + (code !== undefined ? '' : '');
        const stroke = (LAYOUT.historicPrefixChar || '\u0060') + (shift ? label.toUpperCase() : label.toLowerCase());
        add(seq[key], 'backquote', stroke);
      }
    }
    return map;
  }

  // ime: greedy literal-rule detection for dedicated keys
  const rules = [
    { list: LAYOUT.patterns || [], layer:'base', prefix:'' },
    { list: LAYOUT.patterns_x || [], layer:'altgr', prefix:'⌥+' },
    { list: LAYOUT.patterns_shift || [], layer:'shift', prefix:'⇧+' }
  ];
  for(const grp of rules){
    for(const rule of grp.list){
      const rep = rule[rule.length - 1];
      if(typeof rep !== 'string' || rep.indexOf('$') !== -1) continue; // composition rule, not a dedicated key
      if(rule.length === 3 && rule[1]) continue; // context-gated → not a plain dedicated key
      Array.from(rep).forEach(ch => add(ch, grp.layer, (grp.prefix + strokeLabel(rule[0]))));
    }
  }
  return map;
}

let COVERAGE = buildCoverage();
function refreshCoverage(){ COVERAGE = buildCoverage(); }

/* ---------------- Keyboard rendering ---------------- */
function getDisplayChar(cellEntry){
  if(!cellEntry) return '';
  if(cellEntry.type === 'output') return controlLabel(cellEntry.value);
  const table = LAYOUT.actions[cellEntry.value];
  const none = table && table.none;
  if(!none) return '';
  if('output' in none) return controlLabel(none.output);
  if('next' in none) return LAYOUT.terminators[none.next] || none.next;
  return '';
}

function imeKeyChar(input){
  for(const rule of (LAYOUT.patterns || [])){
    const rep = rule[rule.length - 1];
    if(typeof rep !== 'string' || rep.indexOf('$') !== -1) continue;
    const plain = rule[0].replace(/\\(.)/g, '$1');
    if(plain.length === 1 && plain === input) return controlLabel(rep.length === 1 ? rep : rep);
  }
  return '';
}

const SPECIAL_LABELS = { 48:'⇥ Tab', 49:'␣ space', 36:'↩ return', 51:'⌫ backspace' };

function buildKeyEl(code, wide, isSpace){
  const el = document.createElement('div');
  el.className = 'key' + (wide ? ' wide' : '') + (isSpace ? ' space' : '');
  el.dataset.code = code;
  const digitOverride = westDigits && DIGIT_ASCII[code] !== undefined;
  let base = '', shifted = '';
  if(LAYOUT.type === 'keymap'){
    base = digitOverride ? DIGIT_ASCII[code] : getDisplayChar(LAYOUT.keymap0[String(code)]);
    shifted = digitOverride ? (US_SHIFT[code] || DIGIT_ASCII[code]) : getDisplayChar(LAYOUT.keymap1[String(code)]);
  }else if(digitOverride){
    base = DIGIT_ASCII[code];
    shifted = US_SHIFT[code] || DIGIT_ASCII[code];
  }else{
    base = imeKeyChar(charFromCode(code, false) || '');
    shifted = imeKeyChar(charFromCode(code, true) || '');
  }
  if(!base && SPECIAL_LABELS[code]) base = SPECIAL_LABELS[code];
  el.innerHTML = `
    <div class="top">${shifted}</div>
    <div class="main">${base}</div>
    <div class="qwerty">${QWERTY_LABEL[code] || ''}</div>
  `;
  return el;
}

function renderReferenceRow(){
  const refs = Array.from(COVERAGE.entries()).filter(([,m])=> m.layer !== 'base');
  if(!refs.length) return null;
  const hasBackquote = refs.some(([,m])=> m.layer === 'backquote');
  const hasAlt = refs.some(([,m])=> m.layer === 'altgr');
  let label;
  if(refs.every(([,m])=> m.layer === 'backquote')) label = `ಐತಿಹಾಸಿಕ · <b>${refs.length}</b> — type <kbd>\`</kbd> then the key:`;
  else if(refs.every(([,m])=> m.layer === 'altgr')) label = `ಐತಿಹಾಸಿಕ · <b>${refs.length}</b> — hold <kbd>⌥</kbd> and press the key:`;
  else label = `ವಿಶೇಷ & ಐತಿಹಾಸಿಕ · <b>${refs.length}</b> — type as shown:`;
  const row = document.createElement('div');
  row.className = 'kbd-ref-row';
  row.innerHTML = `<span class="kbd-ref-label">${label}</span>` +
    refs.map(([ch, m])=>{
      const u = UNICODE_COVERAGE.find(x=>x.ch === ch);
      const glyph = (ch === '\u200c' || ch === '\u200d') ? (ch === '\u200d' ? 'ZWJ' : 'ZWNJ') : ch;
      return `<span class="kbd-ref" title="U+${((u&&u.cp)||'??').slice(2)} ${u ? 'KANNADA ' + u.name : ''} — ${m.stroke || 'no stroke'}"><b class="ref-glyph">${glyph}</b>` +
        (m.stroke ? `<span class="ref-stroke"><kbd>${escapeHtml(m.stroke)}</kbd></span>` : '') +
        `</span>`;
    }).join('');
  return row;
}

function renderKeyboard(container){
  container.innerHTML = '';
  ROWS.forEach(row=>{
    const rowEl = document.createElement('div');
    rowEl.className = 'kbd-row';
    row.forEach(code=> rowEl.appendChild(buildKeyEl(code)));
    container.appendChild(rowEl);
  });
  const bottomRow = document.createElement('div');
  bottomRow.className = 'kbd-row';
  bottomRow.appendChild(buildKeyEl(48, true));     // Tab
  bottomRow.appendChild(buildKeyEl(49, false, true)); // Space
  bottomRow.appendChild(buildKeyEl(36, true));     // Return
  bottomRow.appendChild(buildKeyEl(51, true));     // Backspace
  container.appendChild(bottomRow);
  const refRow = renderReferenceRow();
  if(refRow) container.appendChild(refRow);
}

function flashKey(container, code, shift){
  const el = container.querySelector(`.key[data-code="${code}"]`);
  if(!el) return;
  el.classList.add('pressed');
  if(shift) el.classList.add('shifted');
  setTimeout(()=>{ el.classList.remove('pressed'); el.classList.remove('shifted'); }, 140);
}
function flashAll(code, shift){
  document.querySelectorAll('.keyboard').forEach(k=> flashKey(k, code, shift));
}

/* ---------------- Grapheme-aware backspace ---------------- */
const segmenter = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter('kn', {granularity:'grapheme'}) : null;
function popGrapheme(str){
  if(!str) return str;
  if(segmenter){
    const parts = Array.from(segmenter.segment(str)).map(s=>s.segment);
    parts.pop();
    return parts.join('');
  }
  const arr = Array.from(str);
  arr.pop();
  return arr.join('');
}

/* ---------------- Typing surface wiring ---------------- */
function attachTypingSurface(el, kbContainer, opts){
  opts = opts || {};
  let engine = createEngine();
  let buffer = '';

  function render(){
    const preview = engine.pendingPreview();
    if(buffer === '' && preview === ''){
      el.innerHTML = opts.placeholder ? `<span class="placeholder">${opts.placeholder}</span>` : '';
    } else {
      el.innerHTML = escapeHtml(buffer) +
        (preview ? `<span class="pending">${escapeHtml(preview)}</span>` : '') +
        `<span class="cursor-blink">&nbsp;</span>`;
    }
    if(opts.onChange) opts.onChange(buffer, engine);
  }

  el.addEventListener('click', ()=> el.focus());

  function handleKey(e){
    if(e.ctrlKey || e.metaKey) return;
    if(e.key === 'Tab' || e.key === 'Escape') return; // let browser handle focus/escape

    if(e.code === 'Backspace'){
      e.preventDefault();
      const cancelledPending = engine.backspace();
      if(!cancelledPending) buffer = popGrapheme(buffer);
      flashAll(51, false);
      render();
      return;
    }

    const code = CODE_MAP[e.code];
    if(code === undefined) return; // arrows etc. – let browser handle
    e.preventDefault();

    if(westDigits && DIGIT_ASCII[code] !== undefined){
      buffer += engine.flush() + DIGIT_ASCII[code];
      flashAll(code, e.shiftKey);
      render();
      return;
    }

    if(engine.type === 'ime'){
      const ch = charFromCode(code, e.shiftKey);
      if(ch !== undefined) buffer = engine.processChar(buffer, ch, e.altKey, e.shiftKey);
      flashAll(code, e.shiftKey);
    }else{
      const shift = e.shiftKey;
      const emitted = engine.press(code, shift);
      if(emitted) buffer += emitted.replace(/\r/g, '\n');
      flashAll(code, shift);
    }
    render();
  }

  el.addEventListener('keydown', handleKey);

  render();
  return {
    getText: ()=> buffer,
    setText: (t)=> { buffer = t; engine.reset(); render(); },
    setEngine(){ engine = createEngine(); engine.reset(); buffer=''; render(); },
    reset(){ buffer = ''; engine.reset(); render(); },
    focusEl: el,
    engineRef: ()=> engine,
    handleKey
  };
}

/* ============================================================
   Layout switching
   ============================================================ */
function setLayout(id){
  SEL = id;
  loadLayout(id).then(l=>{
    LAYOUT = l;
    refreshCoverage();
    try{ localStorage.setItem('typingKannadaLayout', id); }catch(e){}
    syncLayoutUI();
  });
}

function syncLayoutUI(){
  try{
    // selector label
    const el = document.getElementById('layoutSelect');
    if(el) el.value = SEL;
    // description line
    const reg = REGISTRY.layouts.find(l=>l.id === SEL);
    const desc = document.getElementById('layoutDesc');
    if(desc) desc.textContent = (reg && reg.description) || '';
    // keyboard + surfaces
    renderKeyboard(kbLayout);
    renderKeyboard(kbPractice);
    layoutSurface.setEngine();
    practiceSurface.setEngine();
    freeSurface.setEngine();
    resetShiftToggle();
    renderComplex();
    renderUnicode();
    renderReview();
  }catch(err){ console.error('syncLayoutUI error:', err); }
}

function setWestDigits(on){
  westDigits = !!on;
  try{ localStorage.setItem('typingKannadaDigits', westDigits ? '1' : '0'); }catch(e){}
  const btn = document.getElementById('digitToggle');
  if(btn){
    btn.classList.toggle('on', westDigits);
    btn.setAttribute('aria-checked', westDigits ? 'true' : 'false');
  }
  renderKeyboard(kbLayout);
  renderKeyboard(kbPractice);
}

/* ============================================================
   Tabs
   ============================================================ */
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

/* ============================================================
   Layout tab
   ============================================================ */
const kbLayout = document.getElementById('kbLayout');
renderKeyboard(kbLayout);

const layoutSurface = attachTypingSurface(document.getElementById('surfaceLayout'), kbLayout, {
  placeholder: 'Start typing — the board below mirrors your physical keyboard live →'
});

/* Respond to the system keyboard directly on the Layout tab, without needing
   to click into the surface first. Only active while the Layout panel is open
   and the user is not already typing into a surface/input. */
document.addEventListener('keydown', (e)=>{
  const layout = document.getElementById('panel-layout');
  if(!layout || !layout.classList.contains('active')) return;
  const t = e.target;
  if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if(t && t.classList && t.classList.contains('type-surface')) return; // focused surface handles its own
  layoutSurface.handleKey(e);
});

let shiftToggled = false;
document.getElementById('shiftToggle').addEventListener('click', function(){
  shiftToggled = !shiftToggled;
  this.classList.toggle('on', shiftToggled);
  [kbLayout, kbPractice].forEach(kb=>{
    kb.querySelectorAll('.key').forEach(k=>{
      k.classList.toggle('shifted', shiftToggled);
      const main = k.querySelector('.main');
      const top = k.querySelector('.top');
      if(shiftToggled && main && top){
        const tmp = main.textContent; main.textContent = top.textContent; top.textContent = tmp;
      }
    });
  });
});
function resetShiftToggle(){
  if(!shiftToggled) return;
  shiftToggled = false;
  const btn = document.getElementById('shiftToggle');
  btn.classList.remove('on');
  [kbLayout, kbPractice].forEach(kb=>{
    kb.querySelectorAll('.key').forEach(k=>{
      k.classList.remove('shifted');
      const main = k.querySelector('.main');
      const top = k.querySelector('.top');
      if(main && top){
        const tmp = main.textContent; main.textContent = top.textContent; top.textContent = tmp;
      }
    });
  });
}

/* Layout picker */
function buildPicker(){
  const sel = document.getElementById('layoutSelect');
  if(!sel || !REGISTRY) return;
  sel.innerHTML = '';
  REGISTRY.layouts.forEach(l=>{
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = l.name;
    sel.appendChild(opt);
  });
  sel.value = SEL;
  sel.addEventListener('change', ()=> setLayout(sel.value));
}

/* ============================================================
   Practice tab — typing tutor
   ============================================================ */
const LEVELS = [
  {
    id:'vowels', label:'ಸ್ವರಗಳು', enLabel:'Vowels',
    items: [
      {t:'ಅ', tr:'a'}, {t:'ಆ', tr:'ā'}, {t:'ಇ', tr:'i'}, {t:'ಈ', tr:'ī'},
      {t:'ಉ', tr:'u'}, {t:'ಊ', tr:'ū'}, {t:'ಋ', tr:'ṛ'},
      {t:'ಎ', tr:'e'}, {t:'ಏ', tr:'ē'}, {t:'ಐ', tr:'ai'},
      {t:'ಒ', tr:'o'}, {t:'ಓ', tr:'ō'}, {t:'ಔ', tr:'au'},
      {t:'ಅಂ', tr:'aṁ'}, {t:'ಅಃ', tr:'aḥ'}
    ]
  },
  {
    id:'consonants', label:'ವ್ಯಂಜನಗಳು', enLabel:'Consonants',
    items: ['ಕ','ಖ','ಗ','ಘ','ಙ','ಚ','ಛ','ಜ','ಝ','ಞ','ಟ','ಠ','ಡ','ಢ','ಣ',
      'ತ','ಥ','ದ','ಧ','ನ','ಪ','ಫ','ಬ','ಭ','ಮ','ಯ','ರ','ಲ','ವ','ಶ','ಷ','ಸ','ಹ','ಳ']
      .map(t=>({t, tr:''}))
  },
  {
    id:'combos', label:'ಒತ್ತಕ್ಷರ', enLabel:'Vowel signs',
    items: ['ಕ','ಕಾ','ಕಿ','ಕೀ','ಕು','ಕೂ','ಕೆ','ಕೇ','ಕೈ','ಕೊ','ಕೋ','ಕೌ','ಕ್'].map(t=>({t, tr:''}))
      .concat(['ಮ','ಮಾ','ಮಿ','ಮೀ','ಮು','ಮೂ','ಮೆ','ಮೇ','ಮೈ','ಮೊ','ಮೋ','ಮೌ','ಮ್'].map(t=>({t, tr:''})))
  },
  {
    id:'words', label:'ಪದಗಳು', enLabel:'Words',
    items: [
      {t:'ಮನೆ', tr:'house'}, {t:'ನೀರು', tr:'water'}, {t:'ಪುಸ್ತಕ', tr:'book'},
      {t:'ಹೂವು', tr:'flower'}, {t:'ಸೂರ್ಯ', tr:'sun'}, {t:'ಚಂದ್ರ', tr:'moon'},
      {t:'ಮಳೆ', tr:'rain'}, {t:'ಕನ್ನಡ', tr:'Kannada'}, {t:'ಶಾಲೆ', tr:'school'},
      {t:'ನಮಸ್ಕಾರ', tr:'greetings'}
    ]
  },
  {
    id:'clusters', label:'ಒತ್ತಕ್ಷರ', enLabel:'Clusters & ligatures',
    items: [
      {t:'ಕ್ಷಣ', tr:'moment'}, {t:'ಜ್ಞಾನ', tr:'knowledge'}, {t:'ಕ್ರಮ', tr:'method'},
      {t:'ಕೃಷಿ', tr:'agriculture'}, {t:'ಸ್ಪರ್ಧೆ', tr:'competition'}, {t:'ಕರ್ನಾಟಕ', tr:'Karnataka'}
    ]
  },
  {
    id:'sentences', label:'ವಾಕ್ಯಗಳು', enLabel:'Sentences',
    items: [
      {t:'ನನ್ನ ಹೆಸರು ರಾಮ.', tr:'My name is Rama.'},
      {t:'ಕನ್ನಡ ಒಂದು ಸುಂದರ ಭಾಷೆ.', tr:'Kannada is a beautiful language.'},
      {t:'ಇಂದು ಶುಭ ದಿನ.', tr:'Today is a good day.'},
      {t:'ನಾನು ಪುಸ್ತಕ ಓದುತ್ತೇನೆ.', tr:'I read a book.'}
    ]
  }
];

let curLevel = 0;
let curItem = 0;
let sessionStart = null;
let totalTypedChars = 0;
let correctChars = 0;
let attemptedKeystrokes = 0;
let streak = 0;

const levelTabsEl = document.getElementById('levelTabs');
LEVELS.forEach((lvl, idx)=>{
  const chip = document.createElement('button');
  chip.className = 'level-chip' + (idx===0 ? ' active' : '');
  chip.innerHTML = `${lvl.label} <span style="opacity:.6">· ${lvl.enLabel}</span>`;
  chip.addEventListener('click', ()=> loadLevel(idx));
  levelTabsEl.appendChild(chip);
});

const targetWordEl = document.getElementById('targetWord');
const targetTranslitEl = document.getElementById('targetTranslit');
const statWpm = document.getElementById('statWpm');
const statAcc = document.getElementById('statAcc');
const statDone = document.getElementById('statDone');
const statStreak = document.getElementById('statStreak');
const levelProgress = document.getElementById('levelProgress');

const kbPractice = document.getElementById('kbPractice');
renderKeyboard(kbPractice);

const practiceSurface = attachTypingSurface(document.getElementById('surfacePractice'), kbPractice, {
  placeholder: 'Click here and type the akshara/word shown above →',
  onChange: onPracticeChange
});

function loadLevel(idx){
  curLevel = idx; curItem = 0;
  document.querySelectorAll('.level-chip').forEach((c,i)=>c.classList.toggle('active', i===idx));
  sessionStart = null; totalTypedChars = 0; correctChars = 0; attemptedKeystrokes = 0; streak = 0;
  updateStats();
  showItem();
}

function showItem(){
  const level = LEVELS[curLevel];
  const item = level.items[curItem];
  targetWordEl.innerHTML = Array.from(item.t).map(()=>'').join('');
  renderTargetPlain(item.t);
  targetTranslitEl.textContent = item.tr || '';
  levelProgress.style.width = (curItem / level.items.length * 100) + '%';
  statDone.textContent = `${curItem}/${level.items.length}`;
  practiceSurface.setText('');
}

function renderTargetPlain(target){
  targetWordEl.innerHTML = Array.from(target).map(ch=>`<span class="todo">${ch}</span>`).join('');
}

function renderTargetDiff(target, typed){
  const t = Array.from(target);
  const y = Array.from(typed);
  targetWordEl.innerHTML = t.map((ch,i)=>{
    if(i >= y.length) return `<span class="todo">${ch}</span>`;
    return y[i] === ch ? `<span class="correct">${ch}</span>` : `<span class="wrong">${ch}</span>`;
  }).join('');
}

function onPracticeChange(buffer, engine){
  const level = LEVELS[curLevel];
  const item = level.items[curItem];
  const preview = (engine && engine.pendingPreview) ? engine.pendingPreview() : '';
  const typed = buffer + preview;
  if(sessionStart === null && typed.length > 0) sessionStart = Date.now();
  renderTargetDiff(item.t, typed);

  if(typed.length > 0){
    attemptedKeystrokes++;
    const y = Array.from(typed);
    const t = Array.from(item.t);
    const lastIdx = y.length - 1;
    if(lastIdx < t.length && y[lastIdx] === t[lastIdx]) correctChars++;
  }

  if(typed === item.t){
    totalTypedChars += Array.from(item.t).length;
    streak++;
    updateStats();
    setTimeout(()=> advance(), 420);
  } else {
    updateStats();
  }
}

function advance(){
  const level = LEVELS[curLevel];
  if(curItem < level.items.length - 1){
    curItem++;
    showItem();
  } else {
    targetWordEl.innerHTML = `<span class="correct">✓ ${level.label} ಮುಗಿಯಿತು!</span>`;
    targetTranslitEl.textContent = 'Level complete — pick the next level above.';
    levelProgress.style.width = '100%';
  }
}

function updateStats(){
  let wpm = 0;
  if(sessionStart){
    const minutes = (Date.now() - sessionStart) / 60000;
    if(minutes > 0) wpm = Math.round((totalTypedChars / 5) / Math.max(minutes, 0.008));
  }
  const acc = attemptedKeystrokes > 0 ? Math.round((correctChars / attemptedKeystrokes) * 100) : 100;
  statWpm.textContent = wpm;
  statAcc.textContent = acc + '%';
  statStreak.textContent = streak;
}

document.getElementById('skipBtn').addEventListener('click', ()=>{ streak = 0; advance(); });
document.getElementById('resetLevelBtn').addEventListener('click', ()=> loadLevel(curLevel));

loadLevel(0);

/* ============================================================
   Complex characters tab
   ============================================================ */
function codepointLabel(cp){
  const names = { 0x200c:'ZWNJ', 0x200d:'ZWJ', 0x0ccd:'virama' };
  return names[cp] || null;
}
function renderCodepoints(str){
  return Array.from(str).map(ch=>{
    const cp = ch.codePointAt(0);
    const name = codepointLabel(cp);
    const hex = 'U+' + cp.toString(16).toUpperCase().padStart(4,'0');
    const invisible = (cp === 0x200c || cp === 0x200d);
    return `<div class="cx-cp${invisible?' invisible':''}"><span class="glyph">${invisible ? (name||'') : ch}</span><span class="code">${hex}</span></div>`;
  }).join('');
}
function renderKeys(seq){
  return seq.map(entry=>{
    if(typeof entry === 'string') return `<span class="cx-key">${escapeHtml(entry)}</span>`;
    if(Array.isArray(entry)) return `<span class="cx-key${entry[1]?' shift':''}">${escapeHtml(entry[0])}</span>`;
    if(entry && typeof entry === 'object') return `<span class="cx-key alt">⌥ ${escapeHtml(entry.label)}</span>`;
    return '';
  }).join('');
}

const complexGridEl = document.getElementById('complexGrid');
function renderComplex(){
  complexGridEl.innerHTML = '';
  (LAYOUT.examples || []).forEach(ex=>{
    const card = document.createElement('div');
    card.className = 'cx-card';
    card.innerHTML = `
      <div class="cx-tag">${escapeHtml(ex.tag)}</div>
      <div class="cx-word">${escapeHtml(ex.word)}</div>
      <div class="cx-gloss">${escapeHtml(ex.gloss)}</div>
      <div class="cx-row"><b>Built from:</b> ${escapeHtml(ex.built)}</div>
      <div class="cx-row"><b>Type this:</b></div>
      <div class="cx-keys">${renderKeys(ex.keys)}</div>
      <div class="cx-codepoints">${renderCodepoints(ex.word)}</div>
    `;
    complexGridEl.appendChild(card);
  });
}

/* ---------- Full Kannada Unicode block coverage (U+0C80–U+0CFF) ---------- */
const unicodeGridEl = document.getElementById('unicodeGrid');
function coverageNoteEl(){
  let baseN = 0, histN = 0, noneN = 0;
  UNICODE_COVERAGE.forEach(u=>{
    const m = COVERAGE.get(u.ch);
    if(!m){ noneN++; }
    else if(m.layer === 'base'){ baseN++; }
    else { histN++; }
  });
  const note = document.createElement('div');
  note.className = 'coverage-note';
  note.innerHTML = `<b>ಒಟ್ಟು ${UNICODE_COVERAGE.length}</b> assigned codepoints in the Kannada block — <b>${baseN}</b> on this layout's keys · <b>${histN}</b> historic/special via a modifier (shown below) · <b>${noneN}</b> no dedicated key (compose by typing):`;
  return note;
}
function renderUnicode(){
  unicodeGridEl.innerHTML = '';
  unicodeGridEl.parentNode.insertBefore(coverageNoteEl(), unicodeGridEl);
  UNICODE_COVERAGE.forEach(u=>{
    const m = COVERAGE.get(u.ch);
    const cell = document.createElement('div');
    cell.className = 'u-cell' + (m && m.layer === 'base' ? '' : ' u-ref');
    let badge = 'no key';
    if(m){
      if(m.layer === 'base') badge = 'ಕೀ · layout';
      else if(m.layer === 'backquote') badge = 'hist · ` + key';
      else if(m.layer === 'altgr') badge = 'hist · ⌥ + key';
      else if(m.layer === 'shift') badge = 'hist · ⇧ + key';
    }
    const show = (m&&m.stroke) ? `<span class="u-stroke"><kbd>${escapeHtml(m.stroke)}</kbd></span>` : `<span class="u-code">${u.cp}</span>`;
    cell.title = (m && m.stroke) ? `${u.cp} KANNADA ${u.name} — type ${m.stroke}` : `${u.cp} KANNADA ${u.name}${m ? '' : ' — no dedicated key; compose by typing'}`;
    cell.innerHTML = `
      <span class="u-glyph">${u.ch}</span>
      ${show}
      <span class="u-badge">${badge}</span>
    `;
    unicodeGridEl.appendChild(cell);
  });
}

/* ============================================================
   Free type tab
   ============================================================ */
const freeSurface = attachTypingSurface(document.getElementById('surfaceFree'), null, {
  placeholder: 'ಇಲ್ಲಿ ಬರೆಯಿರಿ — start typing here →'
});
document.getElementById('clearFreeBtn').addEventListener('click', ()=> freeSurface.setText(''));
document.getElementById('copyFreeBtn').addEventListener('click', ()=>{
  const text = freeSurface.getText();
  navigator.clipboard && navigator.clipboard.writeText(text).catch(()=>{});
});

/* ============================================================
   Review tab content
   ============================================================ */
const reviewListEl = document.getElementById('reviewList');
function renderReview(){
  reviewListEl.innerHTML = '';
  (LAYOUT.findings || []).forEach(f=>{
    const div = document.createElement('div');
    div.className = 'finding ' + f.sev;
    div.innerHTML = `<h3><span class="sev">${escapeHtml(f.sevLabel)}</span>${escapeHtml(f.title)}</h3>${f.body}`;
    reviewListEl.appendChild(div);
  });
}

/* ============================================================
   Boot
   ============================================================ */
buildPicker();
syncLayoutUI();
const digitToggleEl = document.getElementById('digitToggle');
if(digitToggleEl){
  digitToggleEl.classList.toggle('on', westDigits);
  digitToggleEl.setAttribute('aria-checked', westDigits ? 'true' : 'false');
  digitToggleEl.addEventListener('click', ()=> setWestDigits(!westDigits));
}

})();