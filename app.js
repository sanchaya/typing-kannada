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

  el.addEventListener('keydown', (e)=>{
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
  });

  render();
  return {
    getText: ()=> buffer,
    setText: (t)=> { buffer = t; engine.reset(); render(); },
    focusEl: el,
    engine
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
attachTypingSurface(document.getElementById('surfaceLayout'), kbLayout, {
  placeholder: 'Click here, then type on your physical keyboard to test the layout →'
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

function onPracticeChange(buffer){
  const level = LEVELS[curLevel];
  const item = level.items[curItem];
  if(sessionStart === null && buffer.length > 0) sessionStart = Date.now();
  renderTargetDiff(item.t, buffer);

  if(buffer.length > 0){
    attemptedKeystrokes++;
    const y = Array.from(buffer);
    const t = Array.from(item.t);
    const lastIdx = y.length - 1;
    if(lastIdx < t.length && y[lastIdx] === t[lastIdx]) correctChars++;
  }

  if(buffer === item.t){
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
    sev:'warn', sevLabel:'Inconsistency',
    title:'The "F" key (virama/nukta slot) behaves differently on Shift vs Caps Lock',
    body:`<p>Physical key <code>F</code> (code 3) carries three different behaviours across layers that are meant to mirror each other:</p>
    <pre>Base (no modifier):     action → ್  (virama, with the ಕ+್+್ → ಕ್‌ chain)
Shift:                  output → ZWNJ + ್   (‌್  — as one literal string)
Caps Lock:              output → ZWNJ only  (after the entity fix)</pre>
    <p>Shift and Caps Lock are supposed to select "the same shifted layer" for most keys on this layout (see the <code>anyShift caps?</code> vs <code>caps</code> modifier rules), but this one key produces different text under each. Worth a deliberate decision — either make Caps Lock match Shift exactly (output ZWNJ+virama), or document why they intentionally differ.</p>`
  },
  {
    sev:'warn', sevLabel:'Incomplete feature',
    title:'Explicit "visible virama" (double-halant → ZWNJ) is only implemented for ಕ',
    body:`<p>Typing <code>ಕ</code> then the virama key twice produces <code>ಕ್</code> followed by a zero-width non-joiner — a deliberate way to force the consonant to render standalone instead of ligating into a conjunct with whatever follows. That's a genuinely useful feature for words where a conjunct would otherwise form unintentionally.</p>
    <p>But the state table for the virama action only special-cases the <code>ಕ</code> state. For every other consonant, double-pressing virama just re-finalizes the plain consonant and then emits a bare virama — same visible result as a single press, so the "force no-ligature" trick silently doesn't work anywhere except on ಕ.</p>
    <p>Recommendation: generalize the <code>ಕ</code> → <code>ಕ್</code> → <code>ಕ್‌</code> pattern to all 34 consonants (34 extra <code>&lt;when&gt;</code> lines), so the behaviour is predictable everywhere rather than only on one letter.</p>`
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
