// Run: node hackathon/tests/seva-saathi.test.js
const { KB, QUESTIONS, search, evaluate, monthsOld } = require('../seva-saathi/kb.js');
let fail = 0;
const t = (name, cond) => { console.log((cond ? 'ok   ' : 'FAIL ') + name); if (!cond) fail++; };
const top = q => (search(q)[0] || {}).id;
const get = id => KB.find(e => e.id === id);
const verdict = (id, p) => evaluate(get(id), p).verdict;

// retrieval in English, Hindi and Hinglish; refusal when nothing matches
t('search: farmer money', top('I am a farmer, any money support?') === 'pm-kisan');
t('search: Hindi gas', top('मुझे गैस कनेक्शन चाहिए') === 'ujjwala');
t('search: Hinglish scholarship', top('college ki padhai ke liye scholarship') === 'nsp');
t('search: passport', top('how to get a passport') === 'passport');
t('search: daughter savings', top('savings scheme for my daughter') === 'sukanya');
t('search: Hindi pension', top('बुढ़ापे के लिए पेंशन') === 'apy');
t('search: voter', top('voter id banwana hai') === 'voter');
t('search: unknown topic refuses', search('how do I get a fishing boat permit in Norway').length === 0);
t('search: gibberish refuses', search('asdf qwer').length === 0);

// eligibility
t('pm-kisan eligible', verdict('pm-kisan', { land: 'yes', taxpayer: 'no', govtjob: 'no' }) === 'pass');
t('pm-kisan taxpayer excluded', verdict('pm-kisan', { land: 'yes', taxpayer: 'yes', govtjob: 'no' }) === 'fail');
t('pm-kisan unsure -> needs check', verdict('pm-kisan', { land: 'unsure', taxpayer: 'no', govtjob: 'no' }) === 'unknown');
t('pmjay 72 eligible', verdict('pmjay', { age: 72 }) === 'pass');
t('pmjay 40 needs check', verdict('pmjay', { age: 40 }) === 'unknown');
t('apy 45 not eligible', verdict('apy', { age: 45, bank: 'yes', taxpayer: 'no' }) === 'fail');
t('apy 30 eligible', verdict('apy', { age: 30, bank: 'yes', taxpayer: 'no' }) === 'pass');
t('sukanya girl 11 fails', verdict('sukanya', { girlAge: 11 }) === 'fail');
t('voter 17 advance', verdict('voter', { age: 17 }) === 'unknown');
t('dl 16 geared fails', verdict('dl', { age: 16, vehicle: 'gear' }) === 'fail');
t('dl 16 gearless passes', verdict('dl', { age: 16, vehicle: 'gearless' }) === 'pass');
t('pan existing fails', verdict('pan', { age: 30, hasPan: 'yes', aadhaarMobile: 'yes' }) === 'fail');

// personalised checklist
const docs = (id, p) => evaluate(get(id), p).docs.map(d => d.t.en).join(' | ');
t('passport minor gets Annexure D', /Annexure D/.test(docs('passport', { age: 10 })) && !/Annexure D/.test(docs('passport', { age: 30 })));
t('dl 45 gets medical form', /Form 1A/.test(docs('dl', { age: 45, vehicle: 'gear' })) && !/Form 1A/.test(docs('dl', { age: 25, vehicle: 'gear' })));
t('dl 16 gets consent', /consent/.test(docs('dl', { age: 16, vehicle: 'gearless' })));

// data integrity: every entry is bilingual, sourced from an official domain, dated
const bil = o => o && typeof o.en === 'string' && o.en && typeof o.hi === 'string' && o.hi;
for (const e of KB) {
  const okText = bil(e.name) && bil(e.summary) && bil(e.benefit) && e.steps.every(bil) && e.docs.every(d => bil(d.t)) && e.caveats.every(bil)
    && e.rules.every(r => bil(r({}).t));
  const okSrc = e.sources.length > 0 && e.sources.every(s => /^https:\/\/([\w-]+\.)*(gov\.in|nic\.in|org\.in)\//.test(s.url));
  const okAsk = e.ask.every(k => QUESTIONS[k]);
  t(`entry ${e.id}: bilingual, official sources, dated`, okText && okSrc && okAsk && /^\d{4}-\d{2}$/.test(e.snapshot));
}
t('monthsOld', monthsOld('2026-03', new Date(2026, 10, 11)) === 8);
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
