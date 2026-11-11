// Run: node hackathon/tests/scamshield.test.js
const assert = require('assert');
const { analyze, analyzeUrl, regDomain, redact } = require('../scamshield/engine.js');

const cats = r => [...new Set(r.evidence.map(e => e.cat))];
const cases = [
  { name: 'EN bank KYC phishing', min: 80, has: ['link', 'kyc', 'threat', 'urgency'],
    text: 'Dear customer, your SBI account will be blocked today. Update your KYC immediately: http://sbi-kyc-update.xyz/login' },
  { name: 'HI electricity scare', min: 70, has: ['power', 'contact'],
    text: 'प्रिय उपभोक्ता, आपका बिजली कनेक्शन आज रात 9:30 बजे काट दिया जाएगा क्योंकि पिछले महीने का बिल अपडेट नहीं हुआ। तुरंत बिजली अधिकारी से संपर्क करें 9876543210' },
  { name: 'Hinglish OTP request', min: 70, has: ['sensitive'],
    text: 'Sir aapka khata block ho jayega, abhi karo verify. OTP bhejo jo aapke phone par aaya hai' },
  { name: 'EN task-job scam', min: 70, has: ['job', 'fee'],
    text: 'Hi, I am HR manager from Amazon. Part time job, work from home, earn Rs 3000-8000 per day by liking YouTube videos. Pay registration fee Rs 500 to start. WhatsApp 9123456789' },
  { name: 'HI receive-money QR trick', min: 80, has: ['receive'],
    text: 'बधाई हो! आपने 25,000 रुपये का इनाम जीता है। राशि पाने के लिए यह QR स्कैन करें और अपना UPI पिन डालें।' },
  { name: 'Digital arrest', min: 80, has: ['arrest'],
    text: 'This is from Mumbai customs department. A parcel in your name contains illegal drugs. You are under digital arrest. Stay on the video call and do not tell anyone.' },
  { name: 'Remote access', min: 70, has: ['remote'],
    text: 'To get your refund processed, please install AnyDesk and share the 9 digit code with our executive.' },
  { name: 'Legit OTP alert', max: 19, lacks: ['sensitive'], has: ['protective'],
    text: '482913 is your OTP for transaction of Rs 499.00 at Amazon. Do not share this OTP with anyone. - HDFC Bank' },
  { name: 'HI legit OTP alert', max: 19, lacks: ['sensitive'],
    text: 'आपका ओटीपी 482913 है। यह ओटीपी किसी को न बताएं। - एसबीआई' },
  { name: 'Plain friendly message', max: 19,
    text: 'Hey, are we still meeting at the library at 5? Bring the notes from yesterday.' },
  { name: 'Official link only', max: 19, has: ['official'],
    text: 'Check your PM-KISAN status at https://pmkisan.gov.in/' },
  { name: 'QR: UPI collect dressed as refund', src: 'qr', min: 70, has: ['upi'],
    text: 'upi://pay?pa=9876543210@ybl&pn=Amazon%20Refund&am=4999&cu=INR&tn=Refund' },
  { name: 'QR: ordinary shop UPI', src: 'qr', min: 20, max: 49, has: ['upi'],
    text: 'upi://pay?pa=sharmastores@okhdfcbank&pn=Sharma%20General%20Store&cu=INR' },
  { name: 'QR: phishing URL', src: 'qr', min: 80, has: ['link', 'qr'],
    text: 'https://paytm-cashback.reward-claim.top/verify' },
];

let fail = 0;
for (const c of cases) {
  const r = analyze(c.text, { source: c.src || 'text' });
  try {
    if (c.min != null) assert(r.score >= c.min, `score ${r.score} < ${c.min}`);
    if (c.max != null) assert(r.score <= c.max, `score ${r.score} > ${c.max}`);
    (c.has || []).forEach(k => assert(cats(r).includes(k), `missing category ${k}; got ${cats(r)}`));
    (c.lacks || []).forEach(k => assert(!cats(r).includes(k), `unexpected category ${k}`));
    console.log(`ok   ${String(r.score).padStart(3)} ${r.level.padEnd(8)} ${c.name}`);
  } catch (e) { fail++; console.log(`FAIL ${String(r.score).padStart(3)} ${r.level.padEnd(8)} ${c.name}: ${e.message}`); }
}

const u = (s) => analyzeUrl(s);
const t = (name, cond) => { if (cond) console.log('ok   ' + name); else { fail++; console.log('FAIL ' + name); } };
t('regDomain two-level', regDomain('retail.onlinesbi.sbi') === 'onlinesbi.sbi' && regDomain('a.b.sbi.co.in') === 'sbi.co.in');
t('official bank domain', u('https://www.onlinesbi.sbi/').official);
t('.bank.in trusted', u('https://netbanking.hdfc.bank.in/login').official);
t('typosquat amaz0n', u('amaz0n-offers.in/deal').findings.some(f => f.w >= 0.8));
t('typosquat paytrn', u('https://paytrn.com').findings.some(f => f.w >= 0.8));
t('gov lookalike', u('http://pmkisan-gov.in/status').findings.some(f => f.w >= 0.75));
t('ip host', u('http://185.23.4.9/sbi').findings.some(f => f.w >= 0.6));
t('@ trick', u('https://sbi.co.in@evil.example.com/x').findings.some(f => /@/.test(f.why.en)));
t('shortener', u('https://bit.ly/3xYz').findings.some(f => /shortener/.test(f.why.en)));
t('homoglyph', u('https://www.аmazon.in/').findings.some(f => f.w >= 0.7));
t('redaction', redact('Call 9876543210, card 4111 1111 1111 1111, aadhaar 2345 6789 0123, a@b.com') === 'Call [PHONE], card [CARD], aadhaar [AADHAAR], [EMAIL]');
t('no URL from sentence join', analyze('Dear customer.Your order is ready').urls.length === 0);

console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
