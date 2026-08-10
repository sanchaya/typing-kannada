/* ============================================================
   ಕೀಲಿಕನ್ನಡ — Kannada typing tutor
   Engine faithfully re-implements the KPRao/KGP/Nudi macOS
   keyboard-layout state machine (actions + terminators) so that
   physical key sequences on a US ANSI keyboard produce the same
   Kannada text the real installed keyboard layout would.
   ============================================================ */

(async function(){

let LAYOUT;
try{
  const res = await fetch('data/kannada_layout.json');
  LAYOUT = await res.json();
} catch(err){
  document.body.innerHTML = '<p style="font-family:sans-serif;padding:40px;">Could not load <code>data/kannada_layout.json</code>. If you opened this file directly (file://), run a local static server instead — e.g. <code>python3 -m http.server</code> — then visit http://localhost:8000. On GitHub Pages this loads automatically.</p>';
  throw err;
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

/* Every assigned codepoint in the Kannada block (U+0C80–U+0CFF). `keyboard:false`
   marks historic letters and rare signs that have no physical key on the
   KPRao/KGP/Nudi layout — rendered on the keyboard map as a reference strip. */
const UNICODE_COVERAGE = [
  { cp:'U+0C80', ch:'ಀ', name:'Spacing candrabindu', keyboard:false },
  { cp:'U+0C81', ch:'ಁ', name:'Candrabindu', keyboard:false },
  { cp:'U+0C82', ch:'ಂ', name:'Anusvara', keyboard:true },
  { cp:'U+0C83', ch:'ಃ', name:'Visarga', keyboard:true },
  { cp:'U+0C84', ch:'಄', name:'Siddham', keyboard:false },
  { cp:'U+0C85', ch:'ಅ', name:'A', keyboard:true },
  { cp:'U+0C86', ch:'ಆ', name:'AA', keyboard:true },
  { cp:'U+0C87', ch:'ಇ', name:'I', keyboard:true },
  { cp:'U+0C88', ch:'ಈ', name:'II', keyboard:true },
  { cp:'U+0C89', ch:'ಉ', name:'U', keyboard:true },
  { cp:'U+0C8A', ch:'ಊ', name:'UU', keyboard:true },
  { cp:'U+0C8B', ch:'ಋ', name:'Vocalic R', keyboard:true },
  { cp:'U+0C8C', ch:'ಌ', name:'Vocalic L', keyboard:false },
  { cp:'U+0C8E', ch:'ಎ', name:'E', keyboard:true },
  { cp:'U+0C8F', ch:'ಏ', name:'EE', keyboard:true },
  { cp:'U+0C90', ch:'ಐ', name:'AI', keyboard:true },
  { cp:'U+0C92', ch:'ಒ', name:'O', keyboard:true },
  { cp:'U+0C93', ch:'ಓ', name:'OO', keyboard:true },
  { cp:'U+0C94', ch:'ಔ', name:'AU', keyboard:true },
  { cp:'U+0C95', ch:'ಕ', name:'Ka', keyboard:true },
  { cp:'U+0C96', ch:'ಖ', name:'Kha', keyboard:true },
  { cp:'U+0C97', ch:'ಗ', name:'Ga', keyboard:true },
  { cp:'U+0C98', ch:'ಘ', name:'Gha', keyboard:true },
  { cp:'U+0C99', ch:'ಙ', name:'Nga', keyboard:true },
  { cp:'U+0C9A', ch:'ಚ', name:'Ca', keyboard:true },
  { cp:'U+0C9B', ch:'ಛ', name:'Cha', keyboard:true },
  { cp:'U+0C9C', ch:'ಜ', name:'Ja', keyboard:true },
  { cp:'U+0C9D', ch:'ಝ', name:'Jha', keyboard:true },
  { cp:'U+0C9E', ch:'ಞ', name:'Nya', keyboard:true },
  { cp:'U+0C9F', ch:'ಟ', name:'Tta', keyboard:true },
  { cp:'U+0CA0', ch:'ಠ', name:'Ttha', keyboard:true },
  { cp:'U+0CA1', ch:'ಡ', name:'Dda', keyboard:true },
  { cp:'U+0CA2', ch:'ಢ', name:'Ddha', keyboard:true },
  { cp:'U+0CA3', ch:'ಣ', name:'Nna', keyboard:true },
  { cp:'U+0CA4', ch:'ತ', name:'Ta', keyboard:true },
  { cp:'U+0CA5', ch:'ಥ', name:'Tha', keyboard:true },
  { cp:'U+0CA6', ch:'ದ', name:'Da', keyboard:true },
  { cp:'U+0CA7', ch:'ಧ', name:'Dha', keyboard:true },
  { cp:'U+0CA8', ch:'ನ', name:'Na', keyboard:true },
  { cp:'U+0CAA', ch:'ಪ', name:'Pa', keyboard:true },
  { cp:'U+0CAB', ch:'ಫ', name:'Pha', keyboard:true },
  { cp:'U+0CAC', ch:'ಬ', name:'Ba', keyboard:true },
  { cp:'U+0CAD', ch:'ಭ', name:'Bha', keyboard:true },
  { cp:'U+0CAE', ch:'ಮ', name:'Ma', keyboard:true },
  { cp:'U+0CAF', ch:'ಯ', name:'Ya', keyboard:true },
  { cp:'U+0CB0', ch:'ರ', name:'Ra', keyboard:true },
  { cp:'U+0CB1', ch:'ಱ', name:'Rra', keyboard:false },
  { cp:'U+0CB2', ch:'ಲ', name:'La', keyboard:true },
  { cp:'U+0CB3', ch:'ಳ', name:'Lla', keyboard:true },
  { cp:'U+0CB5', ch:'ವ', name:'Va', keyboard:true },
  { cp:'U+0CB6', ch:'ಶ', name:'Sha', keyboard:true },
  { cp:'U+0CB7', ch:'ಷ', name:'Ssa', keyboard:true },
  { cp:'U+0CB8', ch:'ಸ', name:'Sa', keyboard:true },
  { cp:'U+0CB9', ch:'ಹ', name:'Ha', keyboard:true },
  { cp:'U+0CBC', ch:'಼', name:'Nukta', keyboard:true },
  { cp:'U+0CBD', ch:'ಽ', name:'Avagraha', keyboard:true },
  { cp:'U+0CBE', ch:'ಾ', name:'Sign AA', keyboard:true },
  { cp:'U+0CBF', ch:'ಿ', name:'Sign I', keyboard:true },
  { cp:'U+0CC0', ch:'ೀ', name:'Sign II', keyboard:true },
  { cp:'U+0CC1', ch:'ು', name:'Sign U', keyboard:true },
  { cp:'U+0CC2', ch:'ೂ', name:'Sign UU', keyboard:true },
  { cp:'U+0CC3', ch:'ೃ', name:'Sign ṛ', keyboard:true },
  { cp:'U+0CC4', ch:'ೄ', name:'Sign ṝ', keyboard:true },
  { cp:'U+0CC6', ch:'ೆ', name:'Sign E', keyboard:true },
  { cp:'U+0CC7', ch:'ೇ', name:'Sign EE', keyboard:true },
  { cp:'U+0CC8', ch:'ೈ', name:'Sign AI', keyboard:true },
  { cp:'U+0CCA', ch:'ೊ', name:'Sign O', keyboard:true },
  { cp:'U+0CCB', ch:'ೋ', name:'Sign OO', keyboard:true },
  { cp:'U+0CCC', ch:'ೌ', name:'Sign AU', keyboard:true },
  { cp:'U+0CCD', ch:'್', name:'Virama', keyboard:true },
  { cp:'U+0CD5', ch:'ೕ', name:'Length mark', keyboard:false },
  { cp:'U+0CD6', ch:'ೖ', name:'AI length mark', keyboard:false },
  { cp:'U+0CDD', ch:'ೝ', name:'Nakaara pollu', keyboard:false },
  { cp:'U+0CDE', ch:'ೞ', name:'Fa', keyboard:false },
  { cp:'U+0CE0', ch:'ೠ', name:'Vocalic RR', keyboard:false },
  { cp:'U+0CE1', ch:'ೡ', name:'Vocalic LL', keyboard:false },
  { cp:'U+0CE2', ch:'ೢ', name:'Sign ḷ', keyboard:false },
  { cp:'U+0CE3', ch:'ೣ', name:'Sign ḻ', keyboard:false },
  { cp:'U+0CE6', ch:'೦', name:'0', keyboard:true },
  { cp:'U+0CE7', ch:'೧', name:'1', keyboard:true },
  { cp:'U+0CE8', ch:'೨', name:'2', keyboard:true },
  { cp:'U+0CE9', ch:'೩', name:'3', keyboard:true },
  { cp:'U+0CEA', ch:'೪', name:'4', keyboard:true },
  { cp:'U+0CEB', ch:'೫', name:'5', keyboard:true },
  { cp:'U+0CEC', ch:'೬', name:'6', keyboard:true },
  { cp:'U+0CED', ch:'೭', name:'7', keyboard:true },
  { cp:'U+0CEE', ch:'೮', name:'8', keyboard:true },
  { cp:'U+0CEF', ch:'೯', name:'9', keyboard:true },
  { cp:'U+0CF1', ch:'ೱ', name:'Jihvamuliya', keyboard:false },
  { cp:'U+0CF2', ch:'ೲ', name:'Upadhmaniya', keyboard:false },
  { cp:'U+0CF3', ch:'ೳ', name:'Combining anusvara', keyboard:false }
];

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

/* ---------------- Engine: mirrors the Ukelele action/terminator state machine ---------------- */
class KannadaEngine{
  constructor(){ this.state = 'none'; }
  reset(){ this.state = 'none'; }
  press(code, shift){
    const km = shift ? LAYOUT.keymap1 : LAYOUT.keymap0;
    const entry = km[code];
    if(!entry) return '';
    let out = '';
    if(entry.type === 'output'){
      if(this.state !== 'none'){
        out += LAYOUT.terminators[this.state] || '';
        this.state = 'none';
      }
      out += entry.value;
      return out;
    }
    // action key
    const table = LAYOUT.actions[entry.value];
    if(!table) return '';
    let when = table[this.state];
    if(!when){
      if(this.state !== 'none'){
        out += LAYOUT.terminators[this.state] || '';
        this.state = 'none';
      }
      when = table['none'];
    }
    if(when){
      if('output' in when){ out += when.output; this.state = 'none'; }
      else if('next' in when){ this.state = when.next; }
    }
    return out;
  }
  /* returns true if a pending (uncommitted) state was cancelled rather than
     needing an actual character deleted from the text buffer */
  backspace(){
    if(this.state !== 'none'){ this.state = 'none'; return true; }
    return false;
  }
  pendingPreview(){
    return this.state === 'none' ? '' : (LAYOUT.terminators[this.state] || '');
  }
  flush(){
    if(this.state !== 'none'){
      const out = LAYOUT.terminators[this.state] || '';
      this.state = 'none';
      return out;
    }
    return '';
  }
}

/* ---------------- Keyboard rendering ---------------- */
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

function buildKeyEl(code, wide, isSpace){
  const el = document.createElement('div');
  el.className = 'key' + (wide ? ' wide' : '') + (isSpace ? ' space' : '');
  el.dataset.code = code;
  const base = getDisplayChar(LAYOUT.keymap0[String(code)]);
  const shifted = getDisplayChar(LAYOUT.keymap1[String(code)]);
  el.innerHTML = `
    <div class="top">${shifted}</div>
    <div class="main">${base}</div>
    <div class="qwerty">${QWERTY_LABEL[code] || ''}</div>
  `;
  return el;
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
  bottomRow.appendChild(buildKeyEl(48, true));   // Tab
  bottomRow.appendChild(buildKeyEl(49, false, true)); // Space
  bottomRow.appendChild(buildKeyEl(36, true));   // Return
  bottomRow.appendChild(buildKeyEl(51, true));   // Backspace
  container.appendChild(bottomRow);

  const refRow = renderReferenceRow();
  if(refRow) container.appendChild(refRow);
}

/* Historic letters and rare signs that have no physical key on the
   KPRao/KGP/Nudi layout — a compact reference under the keyboard map so the
   full Kannada Unicode block is visible where you type. */
function renderReferenceRow(){
  const refs = UNICODE_COVERAGE.filter(u=>!u.keyboard);
  if(!refs.length) return null;
  const row = document.createElement('div');
  row.className = 'kbd-ref-row';
  row.innerHTML = `<span class="kbd-ref-label">ಐತಿಹಾಸಿಕ · no key · <b>${refs.length}</b> reference:</span>` +
    refs.map(u=>`<span class="kbd-ref" title="U+${u.cp.slice(2)} KANNADA ${u.name} — historic / rare, no physical key"><b class="ref-glyph">${u.ch}</b><span class="ref-code">${u.cp.slice(2)}</span></span>`).join('');
  return row;
}

function flashKey(container, code, shift){
  const el = container.querySelector(`.key[data-code="${code}"]`);
  if(!el) return;
  el.classList.add('pressed');
  if(shift) el.classList.add('shifted');
  setTimeout(()=>{ el.classList.remove('pressed'); el.classList.remove('shifted'); }, 140);
}

/* highlight across every rendered keyboard instance on the page */
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
  const engine = new KannadaEngine();
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

  function escapeHtml(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  el.addEventListener('click', ()=> el.focus());

  function handleKey(e){
    if(e.ctrlKey || e.metaKey || e.altKey) return;
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
    const shift = e.shiftKey;
    const emitted = engine.press(code, shift);
    if(emitted) buffer += emitted.replace(/\r/g, '\n');
    flashAll(code, shift);
    if(kbContainer){
      // reflect current pending state visually as "shifted" tint on nothing extra – flashAll already covers press feedback
    }
    render();
  }

  el.addEventListener('keydown', handleKey);

  render();
  return {
    getText: ()=> buffer,
    setText: (t)=> { buffer = t; engine.reset(); render(); },
    focusEl: el,
    engine,
    handleKey
  };
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

let shiftLayerOn = false;
document.getElementById('shiftToggle').addEventListener('click', function(){
  shiftLayerOn = !shiftLayerOn;
  this.classList.toggle('on', shiftLayerOn);
  kbLayout.querySelectorAll('.key').forEach(k=>{
    k.classList.toggle('shifted', shiftLayerOn);
    const main = k.querySelector('.main');
    const top = k.querySelector('.top');
    if(shiftLayerOn){
      const tmp = main.textContent; main.textContent = top.textContent; top.textContent = tmp;
    }
  });
});

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
  return seq.map(([label, shift])=>`<span class="cx-key${shift?' shift':''}">${label}</span>`).join('');
}

const COMPLEX_EXAMPLES = [
  {
    tag:'Traditional ligature', word:'ಕ್ಷಣ', gloss:'kṣaṇa — "moment"',
    built:'ಕ + ್ (virama) + ಷ + ಣ — ಕ+ಷ is one of two traditional conjuncts many fonts render as a single fused glyph rather than a visible stack.',
    keys:[['K',false],['F',false],['X',false],['N',true]]
  },
  {
    tag:'Traditional ligature', word:'ಜ್ಞಾನ', gloss:'jñāna — "knowledge"',
    built:'ಜ + ್ (virama) + ಞ + ಾ (long ā matra) + ನ — ಜ+ಞ is the other classic fused ligature (jña).',
    keys:[['J',false],['F',false],['Z',false],['A',true],['N',false]]
  },
  {
    tag:'Consonant cluster', word:'ಸ್ಪರ್ಧೆ', gloss:'spardhe — "competition"',
    built:'ಸ + ್ + ಪ, then ರ + ್ + ಧ + ೆ — two separate conjuncts back to back (ಸ್ಪ and ರ್ಧ).',
    keys:[['S',false],['F',false],['P',false],['R',false],['F',false],['D',true],['E',false]]
  },
  {
    tag:'Consonant cluster', word:'ಕ್ರಮ', gloss:'krama — "method, order"',
    built:'ಕ + ್ + ರ + ಮ — a consonant followed by ರ after virama often renders with a distinct "ra-kar" joined form rather than a plain stack.',
    keys:[['K',false],['F',false],['R',false],['M',false]]
  },
  {
    tag:'Reph-style cluster', word:'ಕರ್ನಾಟಕ', gloss:'Karnataka',
    built:'ಕ + ರ + ್ (virama, forms ರ್) + ನ + ಾ + ಟ + ಕ — the ರ್ that ends the syllable and starts the next is the everyday case that first surfaced the Shift+F bug.',
    keys:[['K',false],['R',false],['F',false],['N',false],['A',true],['Q',false],['K',false]]
  },
  {
    tag:'Vocalic matra', word:'ಕೃಷಿ', gloss:'kṛṣi — "agriculture"',
    built:'ಕ + ೃ (vocalic-r matra, Shift+R) + ಷ + ಿ (short i matra) — the ಋ-family vowel signs use their own dedicated pending state.',
    keys:[['K',false],['R',true],['X',false],['I',false]]
  },
  {
    tag:'Nukta form', word:'ಕ಼', gloss:'ka + nukta (not a standalone word — a technical demo)',
    built:'ಕ + ವಿಶೇಷ (Shift+X, the nukta/special-mark key) — used for sounds borrowed from other languages/scripts that plain Kannada consonants don\'t cover.',
    keys:[['K',false],['X',true]]
  },
  {
    tag:'Explicit virama · fixed', word:'ಕಾರ್‌', gloss:'"car", forced to stand alone (won\'t ligate with whatever follows)',
    built:'ಕ + ಾ + ರ + ್ + ್ (virama pressed twice) — this is the exact pattern that used to produce a stray duplicated virama; it\'s now a clean, generalized "don\'t ligate this consonant" instruction that works the same way on all 34 consonants, not just ಕ.',
    keys:[['K',false],['A',true],['R',false],['F',false],['F',false]]
  }
];

const complexGridEl = document.getElementById('complexGrid');
COMPLEX_EXAMPLES.forEach(ex=>{
  const card = document.createElement('div');
  card.className = 'cx-card';
  card.innerHTML = `
    <div class="cx-tag">${ex.tag}</div>
    <div class="cx-word">${ex.word}</div>
    <div class="cx-gloss">${ex.gloss}</div>
    <div class="cx-row"><b>Built from:</b> ${ex.built}</div>
    <div class="cx-row"><b>Type this:</b></div>
    <div class="cx-keys">${renderKeys(ex.keys)}</div>
    <div class="cx-codepoints">${renderCodepoints(ex.word)}</div>
  `;
  complexGridEl.appendChild(card);
});

/* ---------- Full Kannada Unicode block coverage (U+0C80–U+0CFF) ---------- */
const unicodeGridEl = document.getElementById('unicodeGrid');
if(unicodeGridEl){
  const onKeyboard = UNICODE_COVERAGE.filter(u=>u.keyboard).length;
  const coverageNote = document.createElement('div');
  coverageNote.className = 'coverage-note';
  coverageNote.innerHTML = `<b>ಒಟ್ಟು ${UNICODE_COVERAGE.length}</b> assigned codepoints in the Kannada block — <b>${onKeyboard}</b> reachable on this keyboard, <b>${UNICODE_COVERAGE.length - onKeyboard}</b> historic/sign characters shown as reference (they have no physical key on the KPRao/KGP/Nudi layout, and whether they render depends on your font).`;
  unicodeGridEl.parentNode.insertBefore(coverageNote, unicodeGridEl);
  UNICODE_COVERAGE.forEach(u=>{
    const cell = document.createElement('div');
    cell.className = 'u-cell' + (u.keyboard ? '' : ' u-ref');
    cell.title = `${u.cp} KANNADA ${u.name}`;
    cell.innerHTML = `
      <span class="u-glyph">${u.ch}</span>
      <span class="u-code">${u.cp}</span>
      <span class="u-badge">${u.keyboard ? 'ಕೀ · layout' : 'reference'}</span>
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
const FINDINGS = [
  {
    sev:'ok', sevLabel:'Fixed · was critical',
    title:'ZWJ/ZWNJ garbage bug — reported live, now fixed',
    body:`<p>Real-world repro: typing <code>ಕಾರ್ನಲ್ಲಿ</code> using <code>R</code> → <code>F</code> (virama) → <code>Shift+F</code> produced <code>ಕಾರ್‌್ನಲ್ಲಿ</code> — a duplicated virama with a stray ZWNJ wedged in between. Root cause was two of the findings below combining: Shift+F was a blind literal key that always stapled on ZWNJ+virama regardless of context, and the "type virama twice to force a standalone consonant" feature only existed for ಕ, so every other consonant fell through to broken behaviour.</p>
    <p><b>Fix applied:</b> Shift+F is no longer a separate literal-output key — it now routes through the exact same context-aware virama action as the base key. The "double-virama forces an explicit, non-ligating consonant + ZWNJ" behaviour is generalized from just ಕ to all 34 consonants (33 new state transitions + 33 new terminators, verified programmatically). Re-running the original repro sequence now produces a clean, meaningful result — an intentionally standalone ರ್ — instead of garbage. Regular typing (single virama presses, ordinary conjuncts) is unaffected; see the Complex Characters tab for a live before/after.</p>
    <p>Note: this fix lives in this web tutor's copy of the layout data. The upstream <code>.keylayout</code> source still has the original blind Shift+F mapping and the ಕ-only special case — apply the same generalization there if you want the real installed keyboard to match.</p>`
  },
  {
    sev:'critical', sevLabel:'Fix before shipping',
    title:'Two malformed XML entity references break the layout file',
    body:`<p>Two <code>output</code> attributes reference an undefined entity <code>&amp;x200c;</code> / <code>&amp;x200D;</code> — missing the <code>#</code> that makes it a numeric character reference. As written, this is not valid XML: a strict parser (and some build/import tools) will reject the file outright rather than silently treating it as the intended zero-width joiner / non-joiner.</p>
    <pre>Line ~367:  &lt;key code="3" output="&amp;x200c;"/&gt;                (Caps layer, F key)
Line ~1673: &lt;when state="none" output="&amp;x200D;"/&gt;   (nukta/ವಿಶೇಷ action)</pre>
    <p>Fix: change both to proper numeric character references — <code>&amp;#x200c;</code> (ZWNJ) and <code>&amp;#x200D;</code> (ZWJ). This tutor's engine patches both automatically so the demo above behaves correctly, but the source <code>.keylayout</code> file itself still needs the correction before it's recompiled into an installer.</p>`
  },
  {
    sev:'warn', sevLabel:'Dead code',
    title:'Shift+Space is wired to an unreachable dead-key state machine',
    body:`<p>The <code>Shift+Space</code> key (Caps-layer index 1, code 49) is mapped to an action ("5") with five branches for <code>State 1</code> through <code>State 5</code>, intended to type spacing accent marks (´ &#96; ˆ ¨ ˜). But nothing anywhere in the file ever transitions the state machine into <code>State 1</code>–<code>State 5</code> — no key's <code>next</code> ever produces those names. The branches can never fire.</p>
    <p>In practice, <code>Shift+Space</code> today just always outputs a plain space — the dead branches are inert, but they're also confusing for anyone maintaining the layout later, and they hint at an unfinished feature (a dead-key row for diacritics) that never got wired up.</p>
    <p>Recommendation: either remove the unused branches and simplify <code>Shift+Space</code> to a plain output key, or finish the intended feature by adding the missing state transitions.</p>`
  },
  {
    sev:'ok', sevLabel:'Fixed · was "inconsistency"',
    title:'The "F" key (virama/nukta slot) used to behave differently on Shift vs Caps Lock',
    body:`<p>Originally, physical key <code>F</code> (code 3) carried three different behaviours across layers that were meant to mirror each other — base gave a context-aware virama, Shift blindly stapled on ZWNJ+virama, Caps Lock gave ZWNJ alone. Folded into the fix above: Shift+F now calls the same action as the base key, so all three layers are consistent (Caps Lock still needs the same treatment applied to its own key entry if you want full parity — it currently still uses the old literal-output style).</p>`
  },
  {
    sev:'ok', sevLabel:'Fixed · was "incomplete feature"',
    title:'Explicit "visible virama" (double-halant → ZWNJ) now works on all 34 consonants, not just ಕ',
    body:`<p>Typing a consonant then the virama key twice now forces that consonant to render standalone (with a ZWNJ) instead of ligating into a conjunct with whatever follows — generalized from the original ಕ-only special case. See the Complex Characters tab for a worked example on ರ.</p>`
  },
  {
    sev:'ok', sevLabel:'Verified sound',
    title:'Vowel-sign combination logic is complete and internally consistent',
    body:`<p>Every independent vowel action (ಆ ಇ ಈ ಉ ಊ ಋ ಎ ಏ ಐ ಒ ಓ ಔ) defines a branch for all 34 consonant states, and every state that a key transitions into via <code>next</code> has a matching <code>&lt;terminators&gt;</code> entry — verified programmatically across all 84 actions / 70 terminator states while building this tutor. No dangling states, no missing terminators.</p>`
  },
  {
    sev:'ok', sevLabel:'By design',
    title:'No separate handling needed for conjuncts (ಒತ್ತಕ್ಷರ)',
    body:`<p>The layout never explicitly builds consonant clusters (e.g. ಸ್ಕ, ರ್ಥ) — and it doesn't need to. Because Kannada Unicode represents conjuncts as a plain consonant + virama + consonant sequence, simply typing the two consonants back-to-back with a virama between them produces the correct underlying text; the visual ligature is formed by the system's text-shaping engine, not the keyboard layout. This is correct and expected behaviour, not a gap.</p>`
  },
  {
    sev:'warn', sevLabel:'Coverage gap',
    title:'No way to type Western Arabic digits (0–9) directly',
    body:`<p>The base number row types Kannada numerals (೦–೯) and the Shift row types symbols (!@#…). There's no layer on the primary US-ANSI keys that produces plain "0123456789" — needed constantly in real writing (dates, phone numbers, prices, code, addresses). The Command-layer (⌘) does map to plain Latin QWERTY including digits, so it's reachable, but it's not obvious/discoverable, and worth calling out explicitly in the layout's own documentation.</p>`
  },
  {
    sev:'ok', sevLabel:'Nice touch',
    title:'A full Latin/QWERTY fallback layer exists (⌘ and ⌥ modifiers)',
    body:`<p>Holding <code>Command</code> (or <code>Option</code>) types plain ASCII QWERTY regardless of the Kannada layer being active — useful for switching to English mid-sentence, filenames, URLs, or keyboard shortcuts without switching input sources. This is a thoughtful inclusion many phonetic layouts skip.</p>`
  },
  {
    sev:'ok', sevLabel:'Scope note',
    title:'ISO/JIS extra-key overrides (keyMapSet "16c") are out of scope for this tutor',
    body:`<p>The layout defines a secondary key-map set for a handful of hardware-specific keys (section-sign key, extra ISO key, etc.) that only exist on non-US keyboard hardware. This web tutor targets the standard US ANSI layout, so those overrides aren't rendered here — they don't need review changes, just noting for completeness.</p>`
  }
];

const reviewListEl = document.getElementById('reviewList');
FINDINGS.forEach(f=>{
  const div = document.createElement('div');
  div.className = 'finding ' + f.sev;
  div.innerHTML = `<h3><span class="sev">${f.sevLabel}</span>${f.title}</h3>${f.body}`;
  reviewListEl.appendChild(div);
});

})();
