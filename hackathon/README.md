# Hackathon prototypes

Two working prototypes from the problem-statement sheet, plus the build pipeline for each.

| # | Problem | Prototype | Open |
|---|---------|-----------|------|
| 1 | AI Agent for Everyday Government Services | **Seva Saathi** | `seva-saathi/index.html` |
| 6 | Multilingual Scam & QR-Code Defence | **ScamShield** | `scamshield/index.html` |

The full pipeline (architecture, stages, stack, evaluation, build plan, demo script) is in **[PIPELINE.md](PIPELINE.md)**.

## Run

No build step and no API keys. Serve the folder and open the pages:

```bash
cd hackathon
python3 -m http.server 8000
# http://localhost:8000/seva-saathi/   and   http://localhost:8000/scamshield/
```

Both also work from GitHub Pages or any static host.

## Tests

```bash
node hackathon/tests/scamshield.test.js    # 26 checks: scam messages, QR payloads, link tricks, false positives
node hackathon/tests/seva-saathi.test.js   # 37 checks: retrieval in 3 writing styles, eligibility, checklists, data integrity
```

## What each prototype does

### Seva Saathi (problem 1)
- Takes a need in English, Hindi or Hinglish ("gas connection", "मैं किसान हूं", "voter id banwana hai") and finds the matching scheme or service.
- Asks only the questions that decide eligibility, and remembers answers across services in the same session.
- Returns an eligibility verdict with the reason for every rule, a **document checklist tailored to the answers** (for example a minor's passport adds Annexure D; a 40+ driving-licence applicant adds Form 1A), next steps, and numbered citations to the official site.
- **Grounding:** it answers only from its knowledge base and says "I could not find official information" for anything else. Every answer shows the entry's review date, is flagged when older than six months, and lists the points that change often (fees, interest rates, deadlines) instead of quoting a number that may be wrong.
- Whole conversation switches between English and Hindi at any time.

12 services are covered: PM-KISAN, Ayushman Bharat PM-JAY, PM Ujjwala, Sukanya Samriddhi, Atal Pension Yojana, PM Vishwakarma, National Scholarship Portal, passport, voter ID, driving licence, instant e-PAN, Aadhaar address update.

### ScamShield (problem 6)
- Analyses pasted messages and links in English, Hindi (Devanagari) and Hinglish.
- Decodes QR codes from an uploaded, dropped or pasted image, and explains what the code will actually do (UPI payment request with payee and amount, web link, call/SMS trigger).
- Highlights the exact words that triggered each finding and explains **why** each one matters, in English or Hindi, then gives a 0 to 100 risk score and what to do next (1930, cybercrime.gov.in).
- Link checks without opening the link: brand look-alikes and misspellings, fake government domains, look-alike letters from other alphabets, `@` tricks, raw IP addresses, shorteners, throwaway endings, direct `.apk` downloads.
- **Privacy:** everything runs in the page. Nothing is uploaded and no link is ever fetched. A "privacy view" shows the redacted text (phone, Aadhaar, card, account numbers and codes masked) that would be the only thing sent to a language model in the full pipeline.

## Known limits (read before demoing)

- **Seva Saathi's data is seed data.** The 12 entries were written by hand from general knowledge of the schemes and were not re-checked against the live official pages. The app says so on every answer. Review them against the cited sites before showing figures to judges, or build the ingestion job in PIPELINE.md.
- **Neither prototype calls a language model.** Matching and explanations are rule-based so the demo is deterministic and works offline. PIPELINE.md shows where the model goes.
- **Screenshot OCR** loads Tesseract.js from a CDN on first use, so it needs internet. It could not be exercised in the build sandbox (CDN blocked); the failure path was tested, the success path was not. QR decoding is bundled and works offline.
- ScamShield covers English, Hindi and Hinglish phrases. Text in other Indian scripts gets link/QR/UPI analysis only, and the page says so.
- A low ScamShield score means "no known pattern matched", not "safe".

## Third-party code

`scamshield/vendor/jsQR.js` is [jsQR](https://github.com/cozmo/jsQR) 1.4.0, Apache-2.0 (licence alongside).
