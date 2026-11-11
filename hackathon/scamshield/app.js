/* ScamShield UI. All analysis runs in this page; nothing typed or uploaded is sent anywhere. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let lang = 'en';
  let last = null; // { text, source, decoded }

  const UI = {
    en: {
      tagline: 'Check a message, link, QR code or screenshot before you click or pay.',
      privacy: '🔒 Private by design: analysis happens inside this page. Your message and images are never uploaded, and links are never opened.',
      tabText: 'Message or link', tabImg: 'QR code or screenshot',
      pasteLabel: 'Paste the SMS, WhatsApp message, e-mail or link (English, हिन्दी or Hinglish)',
      tryLabel: 'Or try an example:', analyze: 'Check it', clear: 'Clear',
      dropHint: 'Drop a QR code image or a screenshot here', choose: 'Choose image',
      ocrBtn: 'Read the text in this screenshot (downloads an OCR model on first use)',
      tryQr: 'Or try a sample QR code:',
      footer: 'Hackathon prototype. A low score is not proof that a message is genuine. Cyber-fraud helpline: 1930 · cybercrime.gov.in',
      scoreOf: 'risk / 100', summary: n => `${n} kind${n === 1 ? '' : 's'} of warning sign found. Each one is explained below.`,
      none: 'Nothing in the text matched the scam patterns this tool knows.',
      highlighted: 'What was checked', evidence: 'Why this looks suspicious', evidenceLow: 'What was noticed',
      links: 'Links found', upi: 'Payment request details', todo: 'What to do now',
      domain: 'Real site', host: 'Full host', payee: 'Pays to (UPI ID)', pname: 'Name shown', amount: 'Amount', pnote: 'Note',
      priv: 'Privacy view: what a cloud AI would see if you opted in',
      privNote: 'The prototype sends nothing. In the full pipeline, only this redacted text would go to a language model for a second opinion, and only with consent.',
      detected: 'Language detected', langs: { en: 'English', hi: 'Hindi', 'hi-Latn': 'Hinglish (Hindi in Latin letters)', 'other-indic': 'Other Indian script' },
      qrDecoded: 'QR code decoded. Its content:', qrNone: 'No QR code found in this image.', reading: 'Reading image…',
      ocrLoading: 'Loading OCR and reading text… this can take a minute.', ocrFail: 'Could not load the OCR component (it needs an internet connection the first time). You can type the message into the first tab instead.',
      ocrDone: 'Text read from the screenshot:', ocrEmpty: 'No readable text found in the image.',
      src: { text: 'Pasted text', qr: 'QR code', ocr: 'Screenshot text' },
      sev: ['Reassuring', 'Minor', 'Suspicious', 'Strong warning'],
    },
    hi: {
      tagline: 'क्लिक या भुगतान करने से पहले संदेश, लिंक, QR कोड या स्क्रीनशॉट की जांच करें।',
      privacy: '🔒 निजता सुरक्षित: जांच इसी पेज के अंदर होती है। आपका संदेश और चित्र कहीं अपलोड नहीं होते और लिंक कभी खोले नहीं जाते।',
      tabText: 'संदेश या लिंक', tabImg: 'QR कोड या स्क्रीनशॉट',
      pasteLabel: 'SMS, व्हाट्सएप संदेश, ई-मेल या लिंक यहां चिपकाएं (English, हिन्दी या Hinglish)',
      tryLabel: 'या कोई उदाहरण आजमाएं:', analyze: 'जांचें', clear: 'साफ करें',
      dropHint: 'QR कोड का चित्र या स्क्रीनशॉट यहां छोड़ें', choose: 'चित्र चुनें',
      ocrBtn: 'इस स्क्रीनशॉट का पाठ पढ़ें (पहली बार OCR मॉडल डाउनलोड होगा)',
      tryQr: 'या नमूना QR कोड आजमाएं:',
      footer: 'हैकाथॉन प्रोटोटाइप। कम स्कोर इस बात का प्रमाण नहीं कि संदेश असली है। साइबर धोखाधड़ी हेल्पलाइन: 1930 · cybercrime.gov.in',
      scoreOf: 'जोखिम / 100', summary: n => `${n} तरह के चेतावनी संकेत मिले। हर एक नीचे समझाया गया है।`,
      none: 'पाठ में ऐसा कुछ नहीं मिला जो इस टूल के ज्ञात घोटाला पैटर्न से मेल खाए।',
      highlighted: 'क्या जांचा गया', evidence: 'यह संदिग्ध क्यों लगता है', evidenceLow: 'क्या देखा गया',
      links: 'मिले हुए लिंक', upi: 'भुगतान अनुरोध का विवरण', todo: 'अब क्या करें',
      domain: 'असली साइट', host: 'पूरा होस्ट', payee: 'भुगतान जाएगा (UPI ID)', pname: 'दिखाया गया नाम', amount: 'राशि', pnote: 'नोट',
      priv: 'निजता दृश्य: अनुमति देने पर क्लाउड AI को क्या दिखेगा',
      privNote: 'प्रोटोटाइप कुछ नहीं भेजता। पूरी पाइपलाइन में केवल यह छिपाया हुआ पाठ, और वह भी आपकी सहमति से, दूसरी राय के लिए भाषा मॉडल को जाएगा।',
      detected: 'पहचानी गई भाषा', langs: { en: 'अंग्रेज़ी', hi: 'हिन्दी', 'hi-Latn': 'हिंग्लिश (रोमन में हिन्दी)', 'other-indic': 'अन्य भारतीय लिपि' },
      qrDecoded: 'QR कोड पढ़ लिया गया। इसकी सामग्री:', qrNone: 'इस चित्र में कोई QR कोड नहीं मिला।', reading: 'चित्र पढ़ा जा रहा है…',
      ocrLoading: 'OCR लोड हो रहा है और पाठ पढ़ा जा रहा है… इसमें एक मिनट लग सकता है।', ocrFail: 'OCR घटक लोड नहीं हो सका (पहली बार इंटरनेट चाहिए)। आप संदेश पहले टैब में टाइप कर सकते हैं।',
      ocrDone: 'स्क्रीनशॉट से पढ़ा गया पाठ:', ocrEmpty: 'चित्र में पढ़ने योग्य पाठ नहीं मिला।',
      src: { text: 'चिपकाया गया पाठ', qr: 'QR कोड', ocr: 'स्क्रीनशॉट का पाठ' },
      sev: ['आश्वस्त करने वाला', 'मामूली', 'संदिग्ध', 'कड़ी चेतावनी'],
    },
  };
  const t = k => UI[lang][k];
  const tr = o => o[lang] || o.en;

  const SAMPLES = [
    { label: { en: 'Bank KYC link', hi: 'बैंक KYC लिंक' }, text: 'Dear customer, your SBI account will be blocked today due to pending KYC. Update immediately to avoid suspension: http://sbi-kyc-update.xyz/login' },
    { label: { en: 'बिजली बिल (Hindi)', hi: 'बिजली बिल' }, text: 'प्रिय उपभोक्ता, आपका बिजली कनेक्शन आज रात 9:30 बजे काट दिया जाएगा क्योंकि पिछले महीने का बिल अपडेट नहीं हुआ। तुरंत बिजली अधिकारी से संपर्क करें 9876543210' },
    { label: { en: 'Job offer', hi: 'नौकरी का प्रस्ताव' }, text: 'Hello! I am HR manager from Amazon. Part time job, work from home. Earn Rs 3000-8000 per day by liking YouTube videos, no experience needed. Pay registration fee Rs 500 to start. WhatsApp 9123456789 or t.me/hr_amzn_task' },
    { label: { en: 'Hinglish OTP call', hi: 'हिंग्लिश OTP' }, text: 'Sir main bank se bol raha hu, aapka khata block ho jayega. Abhi karo verify, aapke phone par jo OTP aaya hai wo batao, jaldi karo.' },
    { label: { en: 'Digital arrest', hi: 'डिजिटल अरेस्ट' }, text: 'This is Inspector Sharma from Mumbai customs department. A parcel booked with your Aadhaar contains illegal drugs. You are under digital arrest. Stay on the video call, do not tell anyone, and transfer Rs 48,000 for verification.' },
    { label: { en: 'Genuine OTP alert', hi: 'असली OTP अलर्ट' }, text: '482913 is your OTP for transaction of Rs 499.00 at Amazon. Do not share this OTP with anyone. - HDFC Bank' },
  ];
  const QR_SAMPLES = [
    { file: 'samples/qr-upi-refund.png', label: { en: '"Refund" QR', hi: '"रिफंड" QR' } },
    { file: 'samples/qr-phishing-link.png', label: { en: 'Cashback link', hi: 'कैशबैक लिंक' } },
    { file: 'samples/qr-shop-upi.png', label: { en: 'Shop payment', hi: 'दुकान भुगतान' } },
    { file: 'samples/qr-official.png', label: { en: 'Official site', hi: 'आधिकारिक साइट' } },
  ];

  /* ---------- rendering ---------- */
  const sev = w => (w >= 0.6 ? 3 : w >= 0.3 ? 2 : w > 0 ? 1 : 0);

  function highlight(text, evidence) {
    const spans = evidence.filter(e => e.start >= 0 && e.end > e.start).map(e => ({ s: e.start, e: e.end, v: e.cat === 'protective' || e.cat === 'official' ? 0 : sev(e.w), cat: e.cat }))
      .sort((a, b) => b.v - a.v || (b.e - b.s) - (a.e - a.s));
    const owner = new Array(text.length).fill(null);
    spans.forEach(sp => { for (let i = sp.s; i < sp.e; i++) if (owner[i] === null) owner[i] = sp; });
    let html = '', i = 0;
    while (i < text.length) {
      const o = owner[i]; let j = i;
      while (j < text.length && owner[j] === o) j++;
      const chunk = esc(text.slice(i, j));
      html += o ? `<mark class="s${o.v}" title="${esc(tr(ScamShield.CATS[o.cat].label))}">${chunk}</mark>` : chunk;
      i = j;
    }
    return html;
  }

  function render() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i]').forEach(el => { el.textContent = t(el.dataset.i); });
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    $('textSamples').innerHTML = SAMPLES.map((s, i) => `<button data-s="${i}">${esc(tr(s.label))}</button>`).join('');
    $('qrSamples').innerHTML = QR_SAMPLES.map((s, i) => `<figure><img src="${s.file}" data-q="${i}" alt="${esc(tr(s.label))}" tabindex="0"><figcaption>${esc(tr(s.label))}</figcaption></figure>`).join('');
    if (!last) { $('result').innerHTML = ''; return; }

    const r = ScamShield.analyze(last.text, { source: last.source });
    const shown = r.evidence;
    const risky = new Set(r.evidence.filter(e => e.w > 0).map(e => e.cat)).size;
    let h = `<section class="card lv-${r.level}">
      <div class="verdict">
        <div class="score" style="--p:${Math.max(r.score, 3)}"><div><span>${r.score}<small>${esc(t('scoreOf'))}</small></span></div></div>
        <div><h2>${esc(tr(r.levelLabel))}</h2>
          <div class="muted">${risky ? esc(t('summary')(risky)) : esc(t('none'))}</div>
          <div class="small muted">${esc(t('src')[last.source])} · ${esc(t('detected'))}: ${esc(t('langs')[r.lang])}</div>
        </div>
      </div>
      ${r.notes.map(n => `<div class="note warn">${esc(tr(n))}</div>`).join('')}
      <h3>${esc(t('highlighted'))}</h3>
      <div class="msgview">${highlight(r.text, r.evidence)}</div>`;

    if (shown.length) {
      h += `<h3>${esc(r.level === 'low' ? t('evidenceLow') : t('evidence'))}</h3>`;
      const groups = [];
      shown.forEach(e => { let g = groups.find(x => x.cat === e.cat); if (!g) groups.push(g = { cat: e.cat, items: [] }); g.items.push(e); });
      h += groups.map(g => {
        const v = g.cat === 'protective' || g.cat === 'official' ? 0 : sev(Math.max(...g.items.map(e => e.w)));
        const quotes = [...new Set(g.items.map(e => e.match).filter(Boolean))].slice(0, 3);
        const whys = [...new Set(g.items.map(e => tr(e.why)))];
        return `<div class="ev s${v}"><b>${esc(tr(ScamShield.CATS[g.cat].label))} <span class="badge ${['b-ok', 'b-info', 'b-warn', 'b-bad'][v]}">${esc(t('sev')[v])}</span></b>
          ${quotes.map(q => `<q>${esc(q.length > 140 ? q.slice(0, 140) + '…' : q)}</q>`).join('')}
          ${whys.length === 1 ? esc(whys[0]) : `<ul>${whys.map(w => `<li>${esc(w)}</li>`).join('')}</ul>`}</div>`;
      }).join('');
    }
    if (r.urls.length) {
      h += `<h3>${esc(t('links'))}</h3>` + r.urls.map(u => `<dl class="kv"><dt>${esc(t('domain'))}</dt><dd><b class="mono">${esc(u.domain)}</b> ${u.official ? '<span class="badge b-ok">✓</span>' : ''}</dd><dt>${esc(t('host'))}</dt><dd class="mono">${esc(u.host)}</dd></dl>`).join('');
    }
    if (r.upi.length) {
      h += `<h3>${esc(t('upi'))}</h3>` + r.upi.map(u => `<dl class="kv"><dt>${esc(t('payee'))}</dt><dd class="mono">${esc(u.vpa || '—')}</dd><dt>${esc(t('pname'))}</dt><dd>${esc(u.name || '—')}</dd><dt>${esc(t('amount'))}</dt><dd>${u.amount ? '₹' + esc(u.amount) : '—'}</dd>${u.note ? `<dt>${esc(t('pnote'))}</dt><dd>${esc(u.note)}</dd>` : ''}</dl>`).join('');
    }
    h += `<h3>${esc(t('todo'))}</h3><ul>${r.advice.map(a => `<li>${esc(tr(a))}</li>`).join('')}</ul>
      <details style="margin-top:14px"><summary>${esc(t('priv'))}</summary>
        <p class="small muted">${esc(t('privNote'))}</p><div class="msgview mono">${esc(r.redacted)}</div></details>
    </section>`;
    $('result').innerHTML = h;
  }

  function run(text, source) {
    last = { text, source };
    render();
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- image handling: QR decode locally, OCR on request ---------- */
  let currentImg = null, qrPayload = '';
  function setStatus(html) { $('imgStatus').innerHTML = html; }

  async function decodeQr(img) {
    const cv = $('cv');
    const tries = [1600, 1000, 600];
    for (const max of tries) {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      const d = ctx.getImageData(0, 0, cv.width, cv.height);
      const hit = window.jsQR && jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' });
      if (hit && hit.data) return hit.data;
    }
    if ('BarcodeDetector' in window) {
      try { const found = await new BarcodeDetector({ formats: ['qr_code'] }).detect(img); if (found[0]) return found[0].rawValue; } catch (e) { /* fall through */ }
    }
    return '';
  }

  function loadImage(src) {
    setStatus(esc(t('reading')));
    const img = new Image();
    img.onload = async () => {
      currentImg = img;
      $('preview').src = img.src; $('preview').style.display = 'block';
      qrPayload = await decodeQr(img);
      $('ocr').hidden = false;
      if (qrPayload) {
        setStatus(`<b>${esc(t('qrDecoded'))}</b> <span class="mono">${esc(qrPayload)}</span>`);
        run(qrPayload, 'qr');
      } else {
        setStatus(esc(t('qrNone')));
        last = null; render();
      }
    };
    img.onerror = () => setStatus(esc(t('qrNone')));
    img.src = src;
  }

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  async function runOcr() {
    if (!currentImg) return;
    setStatus(esc(t('ocrLoading')));
    try {
      if (!window.Tesseract) await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
      const out = await Tesseract.recognize($('preview'), 'eng+hin');
      const text = (out.data.text || '').trim();
      if (!text && !qrPayload) { setStatus(esc(t('ocrEmpty'))); return; }
      setStatus(`<b>${esc(t('ocrDone'))}</b>`);
      run(text + (qrPayload ? '\n' + qrPayload : ''), 'ocr');
    } catch (e) { setStatus(`<span class="badge b-warn">!</span> ${esc(t('ocrFail'))}`); }
  }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (b) { lang = b.dataset.lang; render(); return; }
    const s = e.target.closest('[data-s]');
    if (s) { $('msg').value = SAMPLES[+s.dataset.s].text; run($('msg').value, 'text'); return; }
    const q = e.target.closest('[data-q]');
    if (q) { loadImage(QR_SAMPLES[+q.dataset.q].file); }
  });
  $('go').onclick = () => { if ($('msg').value.trim()) run($('msg').value, 'text'); };
  $('clear').onclick = () => { $('msg').value = ''; last = null; render(); };
  $('msg').addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') $('go').click(); });
  function tab(which) {
    $('tab-text').setAttribute('aria-selected', String(which === 'text'));
    $('tab-img').setAttribute('aria-selected', String(which === 'img'));
    $('pane-text').hidden = which !== 'text'; $('pane-img').hidden = which !== 'img';
  }
  $('tab-text').onclick = () => tab('text');
  $('tab-img').onclick = () => tab('img');
  $('pick').onclick = () => $('file').click();
  $('file').onchange = e => { const f = e.target.files[0]; if (f) loadImage(URL.createObjectURL(f)); };
  $('ocr').onclick = runOcr;
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) loadImage(URL.createObjectURL(f)); });
  document.addEventListener('paste', e => {
    const f = [...(e.clipboardData ? e.clipboardData.files : [])].find(x => x.type.startsWith('image/'));
    if (f) { tab('img'); loadImage(URL.createObjectURL(f)); }
  });

  render();
})();
