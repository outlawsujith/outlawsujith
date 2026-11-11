/* Seva Saathi chat flow: need -> matching service -> a few eligibility questions -> grounded answer.
 * Every statement shown comes from a knowledge-base record and is rendered next to its source.
 * If nothing in the knowledge base matches, the assistant says so instead of guessing. */
(function () {
  'use strict';
  const { KB, QUESTIONS, CATEGORIES, STALE_AFTER_MONTHS, search, evaluate, monthsOld } = window.SevaKB;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const S = { lang: 'en', msgs: [], stage: 'need', entry: null, queue: [], profile: {}, checks: {} };
  const tr = o => (o && (o[S.lang] || o.en)) || '';

  const UI = {
    en: {
      tagline: 'Find the right scheme or service, check eligibility, and get your document checklist.',
      placeholderNeed: 'Type what you need, e.g. "scholarship for college" or "gas connection"',
      placeholderNum: 'Type a number', send: 'Send',
      foot: 'Hackathon prototype. Information comes from a small hand-built knowledge base with dated entries; the final decision always rests with the department concerned.',
      hello: 'Namaste! I help with government schemes and everyday services. Tell me what you need, in English or Hindi, or pick a topic.',
      helloNote: 'I only answer from official sources in my knowledge base, and I show the source and its date with every answer.',
      found1: 'This looks like the closest match. Shall I check it for you?', foundN: 'I found these. Which one do you want?',
      notFound: 'I could not find official information about that in my knowledge base, so I will not guess.',
      notFoundTip: 'Try different words, pick a topic below, or search all schemes on myScheme (myscheme.gov.in), the Government of India\'s scheme finder.',
      inTopic: 'Services under this topic:', askIntro: n => `I need ${n} quick answer${n === 1 ? '' : 's'} to check eligibility and tailor your checklist.`,
      known: 'Using what you told me earlier.', skip: 'Skip', badNum: 'Please type the age as a number, for example 24.',
      vPass: 'You appear to be eligible', vFail: 'You appear not to be eligible', vUnknown: 'Eligibility needs to be confirmed',
      vNote: 'Based only on your answers here. The department decides after verifying your documents.',
      why: 'Why', benefit: 'What you get', docs: 'Your document checklist', docsNote: 'Tailored to your answers. Carry originals and one photocopy of each.',
      steps: 'Next steps', sources: 'Official sources', flags: 'Check before you act',
      stale: (d, m) => `This entry was last reviewed in ${d} (${m} months ago). Rules, amounts and dates may have changed: confirm on the official site.`,
      fresh: d => `Entry last reviewed: ${d}.`,
      seed: 'Prototype data: this entry was drafted by hand and has not been re-checked against the live official page.',
      another: 'Check another service', copy: 'Copy checklist', copied: 'Copied', notElig: 'Since you may not be eligible, here is what the application would need in case your situation changes:',
      yes: 'Yes, check this', other: 'Something else', months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      next: 'What else can I help you with?',
    },
    hi: {
      tagline: 'सही योजना या सेवा खोजें, पात्रता जांचें और अपने दस्तावेजों की सूची पाएं।',
      placeholderNeed: 'अपनी जरूरत लिखें, जैसे "कॉलेज के लिए छात्रवृत्ति" या "गैस कनेक्शन"',
      placeholderNum: 'संख्या लिखें', send: 'भेजें',
      foot: 'हैकाथॉन प्रोटोटाइप। जानकारी हाथ से बनाए गए छोटे ज्ञान-भंडार से आती है जिसकी हर प्रविष्टि पर तारीख है; अंतिम निर्णय हमेशा संबंधित विभाग का होता है।',
      hello: 'नमस्ते! मैं सरकारी योजनाओं और रोजमर्रा की सेवाओं में मदद करता हूं। अपनी जरूरत हिन्दी या अंग्रेज़ी में बताएं, या कोई विषय चुनें।',
      helloNote: 'मैं केवल अपने ज्ञान-भंडार के आधिकारिक स्रोतों से जवाब देता हूं, और हर जवाब के साथ स्रोत और उसकी तारीख दिखाता हूं।',
      found1: 'यह सबसे नजदीकी मेल लगता है। क्या मैं इसकी जांच करूं?', foundN: 'मुझे ये मिले। आपको कौन सा चाहिए?',
      notFound: 'मुझे अपने ज्ञान-भंडार में इसके बारे में आधिकारिक जानकारी नहीं मिली, इसलिए मैं अंदाज़ा नहीं लगाऊंगा।',
      notFoundTip: 'दूसरे शब्दों में लिखें, नीचे से विषय चुनें, या भारत सरकार के योजना खोजक myScheme (myscheme.gov.in) पर सभी योजनाएं खोजें।',
      inTopic: 'इस विषय की सेवाएं:', askIntro: n => `पात्रता जांचने और आपकी सूची बनाने के लिए मुझे ${n} छोटे जवाब चाहिए।`,
      known: 'आपकी पहले दी गई जानकारी का उपयोग कर रहा हूं।', skip: 'छोड़ें', badNum: 'कृपया उम्र संख्या में लिखें, जैसे 24।',
      vPass: 'आप पात्र लगते हैं', vFail: 'आप पात्र नहीं लगते', vUnknown: 'पात्रता की पुष्टि जरूरी है',
      vNote: 'केवल यहां दिए गए आपके जवाबों पर आधारित। दस्तावेजों की जांच के बाद निर्णय विभाग करता है।',
      why: 'कारण', benefit: 'आपको क्या मिलेगा', docs: 'आपके दस्तावेजों की सूची', docsNote: 'आपके जवाबों के अनुसार। हर दस्तावेज की मूल प्रति और एक फोटोकॉपी साथ रखें।',
      steps: 'आगे के कदम', sources: 'आधिकारिक स्रोत', flags: 'कदम उठाने से पहले जांचें',
      stale: (d, m) => `इस प्रविष्टि की पिछली समीक्षा ${d} में हुई थी (${m} महीने पहले)। नियम, राशि और तिथियां बदल चुकी हो सकती हैं: आधिकारिक साइट पर पुष्टि करें।`,
      fresh: d => `प्रविष्टि की पिछली समीक्षा: ${d}।`,
      seed: 'प्रोटोटाइप डेटा: यह प्रविष्टि हाथ से तैयार की गई है और इसे लाइव आधिकारिक पेज से दोबारा नहीं मिलाया गया है।',
      another: 'दूसरी सेवा जांचें', copy: 'सूची कॉपी करें', copied: 'कॉपी हो गई', notElig: 'चूंकि आप शायद पात्र नहीं हैं, स्थिति बदलने पर आवेदन में यह सब लगेगा:',
      yes: 'हां, इसे जांचें', other: 'कुछ और', months: ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
      next: 'मैं और किस बात में मदद करूं?',
    },
  };
  const t = k => UI[S.lang][k];

  /* ---------- message helpers ---------- */
  const bot = (fn, wide) => { S.msgs.push({ who: 'bot', fn, wide }); render(); };
  const user = fn => { S.msgs.push({ who: 'user', fn: typeof fn === 'function' ? fn : () => esc(fn) }); };
  const topicChips = () => `<div class="chips">${CATEGORIES.map(c => `<button data-cat="${c.id}">${esc(tr(c.label))}</button>`).join('')}</div>`;
  const pickButtons = list => list.map(e => `<button class="pick" data-entry="${e.id}"><b>${esc(tr(e.name))}</b><span>${esc(tr(e.summary))}</span></button>`).join('');

  function render() {
    document.documentElement.lang = S.lang;
    $('tagline').textContent = t('tagline'); $('send').textContent = t('send'); $('foot').textContent = t('foot');
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
    const q = S.stage === 'ask' ? QUESTIONS[S.queue[0]] : null;
    $('input').placeholder = q && q.type === 'num' ? t('placeholderNum') : t('placeholderNeed');
    $('input').inputMode = q && q.type === 'num' ? 'numeric' : 'text';
    const lastIdx = S.msgs.length - 1;
    $('chat').innerHTML = S.msgs.map((m, i) => `<div class="msg ${m.who}${m.wide ? ' wide' : ''}${i < lastIdx ? ' old' : ''}" data-i="${i}">${m.fn(i)}</div>`).join('');
    const lastEl = $('chat').lastElementChild;
    if (lastEl && S.msgs.length > 1) lastEl.scrollIntoView({ behavior: 'smooth', block: lastEl.classList.contains('wide') ? 'start' : 'nearest' });
  }

  /* ---------- flow ---------- */
  function greet() {
    bot(() => `<p>${esc(t('hello'))}</p><p class="small muted">${esc(t('helloNote'))}</p>${topicChips()}`);
  }

  function handleNeed(text) {
    user(text);
    const hits = search(text);
    if (!hits.length) {
      bot(() => `<p>${esc(t('notFound'))}</p><p class="small muted">${esc(t('notFoundTip'))}</p>${topicChips()}`);
      return;
    }
    bot(() => `<p>${esc(hits.length === 1 ? t('found1') : t('foundN'))}</p>${pickButtons(hits)}`);
  }

  function startEntry(entry) {
    S.entry = entry;
    S.queue = entry.ask.filter(k => S.profile[k] === undefined);
    const reused = entry.ask.length - S.queue.length;
    if (S.queue.length) {
      S.stage = 'ask';
      const n = S.queue.length;
      bot(() => `<p><b>${esc(tr(entry.name))}</b></p><p>${esc(t('askIntro')(n))}${reused ? ' ' + esc(t('known')) : ''}</p>`);
      askNext();
    } else showResult();
  }

  function askNext() {
    if (!S.queue.length) return showResult();
    const key = S.queue[0], q = QUESTIONS[key];
    bot(() => `<p>${esc(tr(q.q))}</p><div class="chips">${q.type === 'opt' ? q.opts.map(o => `<button data-ans="${o[0]}">${esc(tr(o[1]))}</button>`).join('') : ''}<button data-ans="__skip">${esc(t('skip'))}</button></div>`);
  }

  function answer(value, labelFn) {
    const key = S.queue.shift();
    S.profile[key] = value;
    user(labelFn);
    askNext();
  }

  function fmtDate(snapshot) { const [y, m] = snapshot.split('-').map(Number); return `${t('months')[m - 1]} ${y}`; }

  function showResult() {
    S.stage = 'need';
    const entry = S.entry, profile = Object.assign({}, S.profile);
    bot(i => resultHTML(entry, profile, i), true);
    bot(() => `<p>${esc(t('next'))}</p>${topicChips()}`);
  }

  function resultHTML(entry, profile, idx) {
    const r = evaluate(entry, profile);
    const v = { pass: ['b-ok', t('vPass')], fail: ['b-bad', t('vFail')], unknown: ['b-warn', t('vUnknown')] }[r.verdict];
    const cite = n => `<sup class="c"><a href="#src-${idx}-${n}">[${n}]</a></sup>`;
    const icon = { pass: '✓', fail: '✕', unknown: '?' };
    const age = monthsOld(entry.snapshot);
    const stale = age > STALE_AFTER_MONTHS;
    return `<div class="res">
      <h2>${esc(tr(entry.name))}</h2>
      <p><span class="badge ${v[0]}">${esc(v[1])}</span> <span class="small muted">${esc(t('vNote'))}</span></p>
      <h3>${esc(t('why'))}</h3>
      ${r.reasons.map(x => `<div class="reason"><span class="ic ${x.s}" aria-hidden="true">${icon[x.s]}</span><span>${esc(tr(x.t))} ${cite(1)}</span></div>`).join('')}
      <h3>${esc(t('benefit'))}</h3><p>${esc(tr(entry.benefit))} ${cite(1)}</p>
      <h3>${esc(t('docs'))}</h3>
      <p class="small muted">${esc(r.verdict === 'fail' ? t('notElig') : t('docsNote'))}</p>
      <ul class="check">${r.docs.map((d, j) => `<li><label><input type="checkbox" data-check="${idx}-${j}" ${S.checks[idx + '-' + j] ? 'checked' : ''}><span>${esc(tr(d.t))}</span></label></li>`).join('')}</ul>
      <div class="chips"><button data-copy="${idx}">${esc(t('copy'))}</button></div>
      <h3>${esc(t('steps'))}</h3>
      <ol>${entry.steps.map(s => `<li>${esc(tr(s))} ${cite(entry.stepSrc || 1)}</li>`).join('')}</ol>
      <h3>${esc(t('flags'))}</h3>
      <div class="note ${stale ? 'warn' : 'info'}">${esc(stale ? t('stale')(fmtDate(entry.snapshot), age) : t('fresh')(fmtDate(entry.snapshot)))}</div>
      ${entry.caveats.map(c => `<div class="note warn">${esc(tr(c))}</div>`).join('')}
      <div class="note info">${esc(t('seed'))}</div>
      <h3>${esc(t('sources'))}</h3>
      <ol class="srcs small">${entry.sources.map((s, n) => `<li id="src-${idx}-${n + 1}">${esc(s.title)}: <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.url)}</a></li>`).join('')}</ol>
    </div>`;
  }

  function checklistText(idx) {
    const el = document.querySelector(`.msg[data-i="${idx}"]`);
    const title = el.querySelector('h2').textContent;
    const items = [...el.querySelectorAll('.check span')].map(s => '☐ ' + s.textContent);
    const srcs = [...el.querySelectorAll('.srcs a')].map(a => a.href);
    return [title, '', ...items, '', ...srcs].join('\n');
  }

  /* ---------- events ---------- */
  $('form').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('input').value.trim();
    if (!text) return;
    $('input').value = '';
    if (S.stage === 'ask') {
      const key = S.queue[0], q = QUESTIONS[key];
      if (q.type === 'num') {
        const digits = text.replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d)).match(/\d{1,3}/);
        if (!digits || +digits[0] > 120) { user(text); bot(() => `<p>${esc(t('badNum'))}</p>`); askNext(); return; }
        answer(+digits[0], text);
      } else {
        const low = text.toLowerCase();
        const hit = q.opts.find(o => [o[1].en.toLowerCase(), o[1].hi].some(lbl => lbl === low || lbl.startsWith(low) || low.startsWith(lbl.split(',')[0])));
        if (hit) answer(hit[0], text);
        else { S.stage = 'need'; handleNeed(text); }
      }
    } else handleNeed(text);
  });

  document.addEventListener('click', e => {
    const el = e.target.closest('button');
    if (!el) return;
    if (el.dataset.lang) { S.lang = el.dataset.lang; render(); return; }
    if (el.dataset.copy !== undefined) {
      const text = checklistText(el.dataset.copy);
      const done = () => { el.textContent = t('copied'); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
      return;
    }
    if (el.closest('.msg.old')) return;
    if (el.dataset.cat) {
      const c = CATEGORIES.find(x => x.id === el.dataset.cat);
      const list = KB.filter(k => k.cat === c.id);
      S.stage = 'need';
      user(() => esc(tr(c.label)));
      bot(() => `<p>${esc(t('inTopic'))}</p>${pickButtons(list)}`);
    } else if (el.dataset.entry) {
      const entry = KB.find(k => k.id === el.dataset.entry);
      user(() => esc(tr(entry.name)));
      startEntry(entry);
    } else if (el.dataset.ans && S.stage === 'ask') {
      const q = QUESTIONS[S.queue[0]], a = el.dataset.ans;
      if (a === '__skip') answer(null, () => esc(t('skip')));
      else { const o = q.opts.find(x => x[0] === a); answer(a === 'unsure' ? 'unsure' : a, () => esc(tr(o[1]))); }
    }
  });
  document.addEventListener('change', e => { if (e.target.dataset.check) S.checks[e.target.dataset.check] = e.target.checked; });

  greet();
})();
