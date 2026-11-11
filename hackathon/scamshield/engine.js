/* ScamShield engine — explainable, offline scam analysis for English, Hindi and Hinglish.
 * Pure functions, no network access. Works in the browser (window.ScamShield) and in Node (require).
 * Nothing here ever opens, fetches or resolves a URL: links are judged from their text alone. */
(function (root) {
  'use strict';

  const L = (en, hi) => ({ en, hi });

  /* ---------- categories: what each kind of evidence means ---------- */
  const CATS = {
    sensitive: { w: 0.7, strong: true, label: L('Asks for secret information', 'गोपनीय जानकारी मांगी गई'),
      why: L('It asks you to share or enter an OTP, PIN, CVV, password or ID/bank details. Banks, UPI apps and government offices never ask for these over message or call.',
             'इसमें OTP, PIN, CVV, पासवर्ड या पहचान/बैंक विवरण मांगा गया है। बैंक, UPI ऐप या सरकारी दफ्तर संदेश या कॉल पर यह कभी नहीं मांगते।') },
    receive: { w: 0.85, strong: true, label: L('"Scan or enter PIN to receive money"', '"पैसे पाने के लिए स्कैन करें / PIN डालें"'),
      why: L('You never need to scan a QR code or enter your UPI PIN to receive money. Entering the PIN always sends money out of your account.',
             'पैसे पाने के लिए कभी QR स्कैन करने या UPI PIN डालने की जरूरत नहीं होती। PIN डालने से हमेशा आपके खाते से पैसे जाते हैं।') },
    remote: { w: 0.8, strong: true, label: L('Remote-access / screen-sharing app', 'रिमोट एक्सेस / स्क्रीन शेयरिंग ऐप'),
      why: L('It mentions a remote-control or screen-sharing app. Once installed, the other person can see your OTPs and operate your banking apps.',
             'इसमें रिमोट कंट्रोल या स्क्रीन शेयरिंग ऐप का जिक्र है। इसे इंस्टॉल करते ही सामने वाला आपके OTP देख सकता है और बैंकिंग ऐप चला सकता है।') },
    arrest: { w: 0.85, strong: true, label: L('"Digital arrest" / fake investigation', '"डिजिटल अरेस्ट" / फर्जी जांच'),
      why: L('It uses the "digital arrest" script: a fake officer claims a case against you and keeps you on a call. No Indian agency arrests or interrogates people over video call or asks for money to "verify" funds.',
             'यह "डिजिटल अरेस्ट" वाला तरीका है: नकली अधिकारी आपके खिलाफ केस बताकर कॉल पर रोके रखता है। भारत की कोई एजेंसी वीडियो कॉल पर गिरफ्तारी या पूछताछ नहीं करती, न ही "जांच" के लिए पैसे मांगती है।') },
    apk: { w: 0.65, strong: true, label: L('Asks you to install an app/file', 'ऐप/फाइल इंस्टॉल करने को कहा गया'),
      why: L('It pushes you to install an app or .apk file from a link. Such files can read your SMS (OTPs) and take over the phone. Install apps only from the official app store.',
             'यह लिंक से ऐप या .apk फाइल इंस्टॉल करने को कहता है। ऐसी फाइलें आपके SMS (OTP) पढ़ सकती हैं और फोन पर कब्जा कर सकती हैं। ऐप केवल आधिकारिक स्टोर से ही इंस्टॉल करें।') },
    fee: { w: 0.55, strong: true, label: L('Asks for an advance payment or fee', 'अग्रिम भुगतान या शुल्क मांगा गया'),
      why: L('It asks you to pay a fee, deposit or charge first. Genuine jobs, prizes, refunds and loans do not require an upfront payment to an individual.',
             'इसमें पहले शुल्क, जमा राशि या चार्ज देने को कहा गया है। असली नौकरी, इनाम, रिफंड या लोन के लिए किसी व्यक्ति को पहले पैसे नहीं देने पड़ते।') },
    threat: { w: 0.5, strong: true, label: L('Threat of blocking, penalty or legal action', 'ब्लॉक, जुर्माने या कानूनी कार्रवाई की धमकी'),
      why: L('It threatens that an account/service will be blocked or that legal action will follow. Fear is used to stop you from checking the facts.',
             'इसमें खाता/सेवा बंद होने या कानूनी कार्रवाई की धमकी है। डर इसलिए दिखाया जाता है ताकि आप सच्चाई की जांच न करें।') },
    power: { w: 0.6, strong: true, label: L('Electricity disconnection scare', 'बिजली कटने का डर'),
      why: L('"Your electricity will be cut tonight, call this number" is a well-known scam. Electricity boards do not send disconnection notices from personal numbers.',
             '"आज रात बिजली कट जाएगी, इस नंबर पर कॉल करें" एक जाना-माना घोटाला है। बिजली विभाग निजी नंबरों से कनेक्शन काटने का नोटिस नहीं भेजता।') },
    reward: { w: 0.5, strong: true, label: L('Prize, lottery or free-gift bait', 'इनाम, लॉटरी या मुफ्त उपहार का लालच'),
      why: L('It promises a prize, lottery win, cashback or free gift you did not apply for. You cannot win a contest you never entered.',
             'इसमें ऐसा इनाम, लॉटरी, कैशबैक या मुफ्त उपहार बताया गया है जिसके लिए आपने आवेदन नहीं किया। जिस प्रतियोगिता में भाग नहीं लिया, उसमें जीत नहीं सकते।') },
    job: { w: 0.5, strong: true, label: L('Too-good-to-be-true job or earning offer', 'बहुत आसान कमाई / नौकरी का प्रस्ताव'),
      why: L('It offers easy money for simple tasks or a job without interview. These "task" scams pay small amounts first and then ask for deposits.',
             'इसमें आसान काम के बदले मोटी कमाई या बिना इंटरव्यू नौकरी का वादा है। ऐसे "टास्क" घोटाले पहले थोड़े पैसे देते हैं, फिर जमा राशि मांगते हैं।') },
    kyc: { w: 0.45, strong: true, label: L('KYC / PAN "update or expire" pressure', 'KYC / PAN "अपडेट या बंद" का दबाव'),
      why: L('It says your KYC or PAN must be updated through this message. KYC is updated only inside the official app or at the branch, never through a link sent to you.',
             'इसमें कहा गया है कि KYC या PAN इसी संदेश से अपडेट करना होगा। KYC केवल आधिकारिक ऐप या शाखा में अपडेट होता है, भेजे गए लिंक से कभी नहीं।') },
    parcel: { w: 0.45, strong: true, label: L('Parcel / courier / customs story', 'पार्सल / कूरियर / कस्टम की कहानी'),
      why: L('It claims a parcel is stuck or seized. This story is used to collect a small "fee" (card details) or to start a fake customs/police call.',
             'इसमें पार्सल अटकने या जब्त होने का दावा है। इस बहाने छोटा "शुल्क" (कार्ड विवरण) लिया जाता है या नकली कस्टम/पुलिस कॉल शुरू की जाती है।') },
    secrecy: { w: 0.5, strong: true, label: L('Tells you to keep it secret', 'बात छिपाने को कहा गया'),
      why: L('It tells you not to inform family, the bank or anyone else. Genuine organisations never ask for secrecy.',
             'इसमें परिवार, बैंक या किसी और को न बताने को कहा गया है। असली संस्थाएं कभी बात छिपाने को नहीं कहतीं।') },
    urgency: { w: 0.35, strong: true, label: L('Urgency / deadline pressure', 'जल्दबाजी / समय-सीमा का दबाव'),
      why: L('It pushes you to act immediately or within a short deadline, so that you do not pause to verify.',
             'यह तुरंत या बहुत कम समय में कार्रवाई का दबाव बनाता है, ताकि आप रुककर जांच न करें।') },
    refund: { w: 0.35, strong: true, label: L('Unexpected refund / cashback', 'अचानक रिफंड / कैशबैक'),
      why: L('It announces a refund or cashback you were not expecting, to make you click or share details.',
             'इसमें ऐसा रिफंड या कैशबैक बताया गया है जिसकी आपको उम्मीद नहीं थी, ताकि आप क्लिक करें या जानकारी दें।') },
    contact: { w: 0.3, strong: true, label: L('Asks you to call/WhatsApp a personal number', 'निजी नंबर पर कॉल/व्हाट्सएप करने को कहा'),
      why: L('It asks you to contact a 10-digit mobile number or a chat handle. Organisations use official helplines printed on their website, card or bill.',
             'इसमें 10 अंकों के मोबाइल नंबर या चैट हैंडल पर संपर्क करने को कहा गया है। संस्थाएं अपनी वेबसाइट, कार्ड या बिल पर छपी आधिकारिक हेल्पलाइन का उपयोग करती हैं।') },
    link: { w: 0, strong: true, label: L('Suspicious link', 'संदिग्ध लिंक'), why: L('', '') },
    upi: { w: 0, strong: true, label: L('UPI payment request', 'UPI भुगतान अनुरोध'), why: L('', '') },
    qr: { w: 0, strong: true, label: L('QR code content', 'QR कोड की सामग्री'), why: L('', '') },
    authority: { w: 0.2, strong: false, label: L('Uses the name of a bank, brand or authority', 'बैंक, ब्रांड या सरकारी संस्था का नाम लिया गया'),
      why: L('It uses the name of a trusted organisation. On its own this is normal, but together with the other signals it points to impersonation: anyone can type a bank\'s name.',
             'इसमें किसी भरोसेमंद संस्था का नाम है। अकेले यह सामान्य है, पर बाकी संकेतों के साथ यह नकल की ओर इशारा करता है: बैंक का नाम कोई भी लिख सकता है।') },
    greeting: { w: 0.15, strong: false, label: L('Generic greeting instead of your name', 'आपके नाम की जगह सामान्य संबोधन'),
      why: L('It says "Dear customer" instead of your name. Bulk scam messages do not know who you are.',
             'इसमें आपके नाम की जगह "प्रिय ग्राहक" लिखा है। थोक में भेजे गए घोटाले वाले संदेश आपको नहीं जानते।') },
    cta: { w: 0.2, strong: false, label: L('Pushes you to click a link', 'लिंक पर क्लिक करने का दबाव'),
      why: L('It tells you to click or tap a link to fix the problem. Go to the official app or type the website address yourself instead.',
             'यह समस्या हल करने के लिए लिंक पर क्लिक करने को कहता है। इसके बजाय आधिकारिक ऐप खोलें या वेबसाइट का पता खुद टाइप करें।') },
    protective: { w: 0, strong: false, label: L('Warns you NOT to share secrets', 'गोपनीय जानकारी साझा न करने की चेतावनी'),
      why: L('It tells you not to share the OTP/PIN. Genuine alerts usually say this, but scammers copy it too, so it does not prove the message is safe.',
             'इसमें OTP/PIN साझा न करने को कहा गया है। असली अलर्ट अक्सर ऐसा कहते हैं, पर ठग भी इसकी नकल करते हैं, इसलिए यह संदेश के सुरक्षित होने का प्रमाण नहीं है।') },
    official: { w: 0, strong: false, label: L('Link on a known official domain', 'ज्ञात आधिकारिक डोमेन का लिंक'),
      why: L('', '') },
  };

  /* ---------- text rules (English, Hindi in Devanagari, Hinglish) ---------- */
  const S = '[^.!?\\n।]';
  const R = (cat, src) => ({ cat, re: new RegExp(src, 'giu') });
  const RULES = [
    // English
    R('urgency', '\\b(urgent(ly)?|immediately|right now|with ?in \\d+ ?(hours?|hrs?|minutes?|mins?|days?)|in the next \\d+ ?(hours?|hrs?|minutes?|mins?)|last (chance|warning|day|date)|final (notice|warning|reminder)|expir(e|es|ing) (today|tonight|soon)|today only|act (now|fast)|before (midnight|tonight)|asap|tonight at \\d)'),
    R('threat', '\\b(will be|shall be|has been|have been|is being|is|are|been|gets?)\\s+(permanently\\s+|temporarily\\s+)?(blocked|suspended|deactivated|frozen|closed|terminated|restricted|locked|debited|cancell?ed)\\b|\\blegal action\\b|\\barrest warrant\\b|\\b(fir|case|complaint) (has been |is |will be )?(registered|filed|lodged)\\b|\\b(heavy )?penalty of\\b|\\bblacklist(ed)?\\b'),
    R('arrest', '\\bdigital arrest\\b|\\bmoney[- ]laundering\\b|\\b(parcel|package|courier)\\b' + S + '{0,60}\\b(drugs?|narcotics|mdma|illegal (items?|goods|passports?))\\b|\\bstay on (the |this )?(video )?call\\b|\\b(skype|video call) (verification|statement|interrogation)\\b|\\b(cbi|ncb|narcotics|customs|cyber ?crime|crime branch|police|ed) (officer|inspector|official|department|headquarters?)\\b'),
    R('sensitive', '\\b(share|send|provide|enter|confirm|tell|give|submit|forward|reply with|verify)\\b' + S + '{0,40}\\b(otp|one[- ]time password|verification code|upi pin|m?pin|cvv|password|passcode|card (number|details)|(debit|credit|atm) card|aadha?ar( number| card)?|pan( card)? (number|details)|net ?banking|login (id|details|credentials)|bank (details|account)|account (number|details))\\b'),
    R('kyc', '\\bkyc\\b' + S + '{0,40}\\b(expir\\w*|pending|updat\\w*|incomplete|suspend\\w*|verif\\w*|block\\w*)|\\b(update|complete|verify|re-?submit)\\b' + S + '{0,25}\\b(kyc|pan)\\b|\\bpan( card)?\\b' + S + '{0,25}\\b(not linked|not updated|expired|inoperative)'),
    R('reward', '\\b(congratulations|congrats|you(\'ve| have)? (won|been selected)|lucky (winner|draw|customer)|lottery|jackpot|\\bkbc\\b|prize( money)?|free (gift|recharge|iphone|laptop|data)|claim your (prize|reward|gift)|reward points?' + S + '{0,20}expir\\w*)'),
    R('job', '\\b(work from home|part[- ]time (job|work)|earn (up ?to )?(rs\\.?|₹|inr)? ?[\\d,]+ ?k?( ?[-–] ?(rs\\.?|₹)? ?[\\d,]+ ?k?)? ?(\\/|per|a|every)? ?(day|daily|week|hour|month)|daily (income|payment|payout|earning)s?|no (experience|investment|interview)( (needed|required))?|like (and|&) subscribe|(youtube|instagram|google|hotel|movie) (videos?|reviews?|likes?|ratings?)' + S + '{0,30}(earn|paid|pay|task)|prepaid tasks?|simple tasks?|hr (manager|team|department|executive) (from|of|at))'),
    R('fee', '\\b(registration|processing|security|verification|customs?|clearance|delivery|refundable|activation|joining|handling|re-?delivery|convenience|gst|tax) (fee|charge|deposit|amount|payment)s?\\b|\\bpay (only |just )?(rs\\.?|₹|inr) ?[\\d,]+|\\b(send|transfer|deposit) (rs\\.?|₹|inr) ?[\\d,]+'),
    R('remote', '\\b(any ?desk|team ?viewer|quick ?support|rust ?desk|airdroid|screen[- ]?shar(e|ing)|remote (access|support|control))\\b'),
    R('apk', '[\\w-]+\\.apk\\b|\\b(install|download) (the |this |our |new |attached )?(app|application|file|apk|update)\\b' + S + '{0,40}\\b(link|below|attached|whatsapp|here)'),
    R('receive', '\\b(scan|enter (your )?(upi )?pin|approve (the )?(collect )?request|accept (the )?request)\\b' + S + '{0,60}\\b(receive|get (your|the)|claim|credit(ed)?|collect|refund|cashback)\\b|\\b(receive|claim|refund|cashback|credited?)\\b' + S + '{0,60}\\b(scan (the |this )?(qr|code)|enter (your )?(upi )?pin)\\b'),
    R('secrecy', '\\b(do not|don\'?t|never) (tell|inform|disclose (this )?to|discuss (this )?with|talk to) (anyone|anybody|your (family|parents|bank|friends)|family)\\b|\\bkeep (this|it) (strictly )?(confidential|secret)\\b'),
    R('parcel', '\\b(parcel|package|courier|shipment|consignment)\\b' + S + '{0,60}\\b(held|on hold|stuck|seized|undelivered|could ?n[o\']t be delivered|delivery failed|failed|incomplete address|wrong address|customs)\\b'),
    R('power', '\\b(electricity|power|light bill|electric)\\b' + S + '{0,70}\\b(disconnect(ed|ion)?|cut( off)?)\\b'),
    R('refund', '\\b(refund|cashback)\\b' + S + '{0,40}\\b(pending|approved|initiated|claim|process|eligible|waiting)'),
    R('contact', '\\b(call|contact|whatsapp|message|telegram|dial)\\b' + S + '{0,35}(\\+?91[\\s-]?)?[6-9]\\d{4}[\\s-]?\\d{5}\\b|\\bt\\.me\\/\\S+|\\bwa\\.me\\/\\S+'),
    R('authority', '\\b(sbi|state bank|hdfc|icici|axis bank|pnb|kotak|rbi|reserve bank|income tax|uidai|trai|cbi|police|customs|fedex|dhl|blue ?dart|india ?post|amazon|flipkart|paytm|phonepe|google pay|gpay|netflix|electricity (board|department|office)|bank|government|govt)\\b'),
    R('greeting', '\\bdear (customer|user|sir|madam|sir ?\\/ ?madam|account holder|valued customer|client|beneficiary|consumer|member|candidate)\\b'),
    R('cta', '\\b(click|tap|open|visit|follow|use)\\b' + S + '{0,25}\\b(link|here|below|url)\\b'),
    // Hindi (Devanagari)
    R('urgency', '(तुरंत|तुरन्त|फौरन|जल्दी करें|जल्द से जल्द|आज ही|आज रात|अभी (करें|क्लिक|कॉल|अपडेट)|अंतिम (चेतावनी|मौका|सूचना|तिथि|दिन)|\\d+ ?(घंटे|घंटों|मिनट|मिनटों) (के भीतर|में|के अंदर))'),
    R('threat', '(ब्लॉक|बंद|निलंबित|सस्पेंड|फ्रीज|निष्क्रिय|रद्द)' + S + '{0,12}(हो जाएगा|हो जायेगा|हो जाएगी|हो जायेगी|कर दिया जाएगा|कर दी जाएगी|कर दिया गया|हो गया|हो गई|दिया जाएगा)|कानूनी कार्र?वाई|गिरफ्तार|एफआईआर|जुर्माना'),
    R('arrest', 'डिजिटल अरेस्ट|मनी लॉन्ड्रिंग|वीडियो कॉल पर (बने )?रहें|(सीबीआई|पुलिस|कस्टम|नारकोटिक्स|क्राइम ब्रांच) (अधिकारी|इंस्पेक्टर|विभाग)'),
    R('sensitive', '(ओटीपी|OTP|पिन|PIN|सीवीवी|CVV|पासवर्ड|आधार नंबर|कार्ड नंबर|कार्ड की जानकारी|खाता संख्या|बैंक विवरण)' + S + '{0,30}(बताएं|बताइए|बताये|भेजें|भेजिए|दर्ज करें|डालें|शेयर करें|साझा करें|दीजिए|दें)'),
    R('kyc', '(केवाईसी|KYC)' + S + '{0,30}(अपडेट|समाप्त|लंबित|पूरा|सत्यापन|वेरिफाई|बंद)|पैन' + S + '{0,20}(लिंक नहीं|अपडेट)'),
    R('reward', '(बधाई हो|लॉटरी|इनाम|पुरस्कार|जीत (लिया|लिए|चुके)|जीता है|जीती है|लकी ड्रा|केबीसी|मुफ्त (रिचार्ज|उपहार|गिफ्ट))'),
    R('job', '(घर बैठे|वर्क फ्रॉम होम|पार्ट ?टाइम|रोज(ाना)? ?(₹|रु\\.?|रुपये)? ?[\\d,]+|प्रतिदिन ?(₹|रु\\.?)? ?[\\d,]+|कमाएं|कमाइए|बिना (निवेश|अनुभव|इंटरव्यू))'),
    R('fee', '(रजिस्ट्रेशन|पंजीकरण|प्रोसेसिंग|सिक्योरिटी|कस्टम|सत्यापन) (फीस|शुल्क|चार्ज)|(₹|रु\\.?|रुपये) ?[\\d,]+ ?(रुपये )?(भेजें|जमा करें|ट्रांसफर करें|का भुगतान)'),
    R('remote', '(एनीडेस्क|टीमव्यूअर|स्क्रीन शेयर|क्विक ?सपोर्ट)'),
    R('apk', '(ऐप|एप|फाइल|एपीके)' + S + '{0,20}(डाउनलोड|इंस्टॉल) करें'),
    R('receive', '(पैसे|पैसा|राशि|रिफंड|कैशबैक|इनाम)' + S + '{0,40}(पाने|प्राप्त करने|लेने) के लिए' + S + '{0,40}(स्कैन|पिन|PIN)'),
    R('secrecy', '(परिवार|घरवालों|बैंक|किसी) को (भी )?(इस (कॉल|बारे|संदेश)' + S + '{0,12})(न|ना|मत) बताएं|गोपनीय रखें'),
    R('parcel', '(पार्सल|कूरियर|पैकेज)' + S + '{0,50}(रुका|रोका|जब्त|होल्ड|अधूरा पता|डिलीवर नहीं|कस्टम)'),
    R('power', 'बिजली' + S + '{0,60}(काट|कट जाएग|कनेक्शन बंद)'),
    R('refund', '(रिफंड|कैशबैक)' + S + '{0,30}(लंबित|स्वीकृत|मंजूर|प्राप्त करें|क्लेम)'),
    R('contact', '(कॉल करें|संपर्क करें|व्हाट्सएप करें|फोन करें)' + S + '{0,25}[6-9]\\d{9}|[6-9]\\d{9}' + S + '{0,20}(पर )?(कॉल करें|संपर्क करें|व्हाट्सएप करें|फोन करें)'),
    R('authority', '(एसबीआई|स्टेट बैंक|एचडीएफसी|बैंक|आरबीआई|आयकर|पुलिस|सीबीआई|कस्टम|बिजली (विभाग|बोर्ड|कार्यालय)|ट्राई|यूआईडीएआई|सरकार)'),
    R('greeting', 'प्रिय (ग्राहक|उपभोक्ता|खाताधारक|सदस्य|उपयोगकर्ता)'),
    R('cta', '(लिंक|यहां|यहाँ)' + S + '{0,20}(क्लिक|टैप|खोलें|दबाएं)'),
    // Hinglish (Hindi written in Latin letters)
    R('urgency', '\\b(turant|jaldi( se)?( karo| kare| karein)?|abhi (karo|kare|karein|call|click|update)|aaj hi|aaj raat|akhri (mauka|chetavni|din)|\\d+ ?ghante? (me|mein|ke andar))\\b'),
    R('threat', '\\b(block|band|bandh|suspend|freeze|deactivate|close) (ho|kar) ?(jayega|jaega|jayegi|jaegi|jaayega|diya jayega|diya jaega|diya gaya|gaya|gayi|gaya hai)\\b|\\b(giraftar|giraftari|kanooni karwai|jurmana)\\b'),
    R('sensitive', '\\b(otp|pin|cvv|password|aadha?ar( number| card)?|card (number|details)|account number|bank details)\\b' + S + '{0,30}\\b(batao|bataye|bataiye|batayein|bata do|bhejo|bheje|bhejiye|bhejein|bhej do|share kar(o|e|ein|iye|en)|daal(o|e|ein|iye)|dijiye|de do|dedo|enter kar(o|e|ein|en))\\b'),
    R('kyc', '\\bkyc\\b' + S + '{0,30}\\b(update kar\\w*|pura kar\\w*|expire|khatam|pending|band)'),
    R('reward', '\\b(badhai( ho)?|inaam|jeet (liya|gaye|chuke)|jeeta hai|jeete hain|muft|free (recharge|gift))\\b'),
    R('job', '\\b(ghar baithe|part ?time (kaam|job)|roz(ana)? ?(rs\\.?|₹)? ?[\\d,]+|kamao|kamaye|kamaiye|kamayein|bina (investment|nivesh|interview))\\b'),
    R('fee', '\\b(registration|processing|security) (fee|fees|charge)s? (bhej\\w*|jama|pay|de\\w*)|(rs\\.?|₹) ?[\\d,]+ ?(rupaye |rupay |rs )?(bhejo|bhejiye|bhej do|jama kar\\w*|transfer kar\\w*|pay kar\\w*)'),
    R('receive', '\\b(paise|paisa|refund|cashback|inaam|amount)\\b' + S + '{0,40}\\b(pane|paane|lene|milne|receive karne) ke liye\\b' + S + '{0,40}\\b(scan|pin)\\b'),
    R('power', '\\bbijli\\b' + S + '{0,60}\\b(kat|cut|band|kaat)\\b'),
    R('contact', '\\b(call|sampark|whatsapp|phone) kar(o|e|ein|iye|en)\\b' + S + '{0,25}[6-9]\\d{9}|[6-9]\\d{9}' + S + '{0,15}\\bpar (call|sampark|whatsapp|phone) kar\\w*'),
    R('secrecy', '\\bkisi ko (bhi )?(mat|na|nahi) (batana|batao|bataye|bataiye)\\b'),
  ];

  const NEG_EN = /\b(do not|don'?t|dont|never|not to|no need to|will never ask (you )?to|won'?t ask (you )?to)\s+(ever\s+)?$/i;
  const NEG_INNER = /(^|\s)(न|ना|मत|नहीं|na|mat|nahi|nahin)(\s|$)/i;

  /* ---------- link analysis ---------- */
  const TWO_LEVEL = new Set(['co.in', 'gov.in', 'nic.in', 'org.in', 'net.in', 'ac.in', 'edu.in', 'res.in', 'bank.in', 'fin.in',
    'gen.in', 'firm.in', 'ind.in', 'co.uk', 'org.uk', 'ac.uk', 'com.au', 'co.za', 'com.br', 'co.jp', 'com.sg', 'com.my', 'co.nz', 'com.cn']);
  const BARE_TLDS = 'com|in|org|net|xyz|top|info|co|io|app|link|click|online|site|live|shop|club|vip|tk|ml|ga|cf|gq|icu|buzz|cfd|sbs|ly|me|cc|ru|cn|sbi|bank|page|dev|store|win|loan|work|support|help|pw|biz|rest|quest|monster|cyou|lat|today|life|world|fun|space|website|tech|pro|mobi|to|gd|gy|it|at|id';
  const URL_RE = new RegExp('((?:https?:\\/\\/|www\\.)[^\\s<>"\'\\u0900-\\u097F]+|(?<![@\\w.\\/-])(?:[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]*[\\p{L}\\p{N}])?\\.)+(?:' + BARE_TLDS + ')(?![\\p{L}\\p{N}-])(?:[\\/?#][^\\s<>"\'\\u0900-\\u097F]*)?)', 'giu');
  const SHORTENERS = new Set(['bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'v.gd', 'cutt.ly', 'rb.gy', 'ow.ly',
    'shorturl.at', 'tiny.cc', 'rebrand.ly', 's.id', 't.ly', 'buff.ly', 'qrco.de', 'me-qr.com', 'shorte.st', 'tr.ee', 'lnkd.in', 'urlz.fr', 'cli.re']);
  const BAD_TLDS = new Set(['xyz', 'top', 'click', 'tk', 'ml', 'ga', 'cf', 'gq', 'icu', 'buzz', 'cfd', 'sbs', 'vip', 'loan', 'win', 'work',
    'rest', 'quest', 'monster', 'cyou', 'lat', 'pw', 'live', 'online', 'site', 'club', 'shop', 'fun', 'support', 'help', 'link']);
  const BRANDS = [
    { n: 'SBI', t: ['sbi', 'onlinesbi', 'yono', 'statebank'], d: ['sbi.co.in', 'onlinesbi.sbi', 'sbi.bank.in', 'sbicard.com', 'yonobusiness.sbi'] },
    { n: 'HDFC Bank', t: ['hdfc', 'hdfcbank'], d: ['hdfcbank.com', 'hdfc.bank.in', 'hdfc.com'] },
    { n: 'ICICI Bank', t: ['icici', 'icicibank'], d: ['icicibank.com', 'icici.bank.in'] },
    { n: 'Axis Bank', t: ['axisbank'], d: ['axisbank.com', 'axis.bank.in'] },
    { n: 'PNB', t: ['pnb', 'pnbindia'], d: ['pnbindia.in', 'pnb.bank.in'] },
    { n: 'Kotak', t: ['kotak'], d: ['kotak.com', 'kotak.bank.in'] },
    { n: 'Paytm', t: ['paytm'], d: ['paytm.com', 'paytm.in', 'paytmbank.com', 'p-y.tm'] },
    { n: 'PhonePe', t: ['phonepe'], d: ['phonepe.com'] },
    { n: 'Google Pay', t: ['gpay', 'googlepay'], d: ['google.com'] },
    { n: 'Amazon', t: ['amazon'], d: ['amazon.in', 'amazon.com', 'amzn.in', 'amzn.to', 'amazonpay.in'] },
    { n: 'Flipkart', t: ['flipkart'], d: ['flipkart.com', 'fkrt.it'] },
    { n: 'WhatsApp', t: ['whatsapp'], d: ['whatsapp.com'] },
    { n: 'India Post', t: ['indiapost'], d: ['indiapost.gov.in'] },
    { n: 'IRCTC', t: ['irctc'], d: ['irctc.co.in'] },
    { n: 'UIDAI / Aadhaar', t: ['uidai', 'aadhaar', 'aadhar'], d: ['uidai.gov.in'] },
    { n: 'Income Tax', t: ['incometax', 'itrefund'], d: ['incometax.gov.in'] },
    { n: 'NPCI / BHIM UPI', t: ['npci', 'bhim', 'bhimupi'], d: ['npci.org.in', 'bhimupi.org.in'] },
    { n: 'Jio', t: ['jio'], d: ['jio.com'] },
    { n: 'Airtel', t: ['airtel'], d: ['airtel.in', 'airtel.com'] },
    { n: 'FedEx', t: ['fedex'], d: ['fedex.com'] },
    { n: 'DHL', t: ['dhl'], d: ['dhl.com'] },
    { n: 'Blue Dart', t: ['bluedart'], d: ['bluedart.com'] },
    { n: 'Netflix', t: ['netflix'], d: ['netflix.com'] },
    { n: 'LIC', t: ['licindia'], d: ['licindia.in'] },
  ];
  const OFFICIAL = new Set(BRANDS.flatMap(b => b.d).concat(['npci.org.in', 'rbi.org.in', 'google.com', 'youtube.com', 'microsoft.com', 'apple.com', 'github.com', 'wikipedia.org']));
  const GOV_WORDS = ['gov', 'govt', 'sarkar', 'sarkari', 'pmkisan', 'pmjay', 'ayushman', 'epfo', 'parivahan', 'echallan', 'digilocker', 'cybercrime', 'rbi', 'trai'];
  const PATH_WORDS = /(login|signin|verify|verification|kyc|update|secure|reward|claim|refund|otp|unlock|suspend|wallet|bonus|prize|pay)/i;

  function regDomain(host) {
    const p = host.split('.');
    if (p.length <= 2) return host;
    const last2 = p.slice(-2).join('.');
    return TWO_LEVEL.has(last2) ? p.slice(-3).join('.') : last2;
  }
  const isTrustedSuffix = h => /\.(gov\.in|nic\.in|bank\.in)$/.test(h);
  const leet = s => s.replace(/0/g, 'o').replace(/[1!|]/g, 'l').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/rn/g, 'm').replace(/vv/g, 'w');
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev[j - 1]); // rough transposition
      }
      prev = cur;
    }
    return prev[b.length];
  }

  function analyzeUrl(raw) {
    const out = { raw, host: '', domain: '', findings: [], official: false, valid: true };
    const add = (w, en, hi) => out.findings.push({ w, why: L(en, hi) });
    let u;
    const cleaned = raw.replace(/[),.;:!?»”’'"]+$/u, '');
    out.raw = cleaned;
    try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned) ? cleaned : 'http://' + cleaned); } catch (e) { out.valid = false; return out; }
    const hadScheme = /^https?:\/\//i.test(cleaned);
    const host = u.hostname.toLowerCase().replace(/\.$/, '');
    out.host = host;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) {
      out.domain = host;
      add(0.6, 'The link uses a raw IP address instead of a website name. Real organisations do not send such links.', 'लिंक में वेबसाइट के नाम की जगह सीधा IP पता है। असली संस्थाएं ऐसे लिंक नहीं भेजतीं।');
      return out;
    }
    const domain = regDomain(host); out.domain = domain;
    const tld = host.split('.').pop();
    const official = OFFICIAL.has(domain) || isTrustedSuffix(host);
    out.official = official;
    if (/(^|\.)xn--/.test(host) || /[^\x00-\x7f]/.test(cleaned.split(/[/?#]/)[hadScheme ? 2 : 0] || '')) {
      add(0.7, 'The website name contains look-alike letters from another alphabet (an "internationalised" name). This trick makes a fake site look like a real one.', 'वेबसाइट के नाम में दूसरी लिपि के मिलते-जुलते अक्षर हैं। इस चाल से नकली साइट असली जैसी दिखती है।');
    }
    if (u.username || /^[^/]*@/.test(cleaned.replace(/^https?:\/\//i, '').split(/[/?#]/)[0])) {
      add(0.6, 'The link contains "@". Everything before the @ is ignored by the browser, so the real destination is "' + host + '".', 'लिंक में "@" है। @ से पहले का हिस्सा ब्राउज़र अनदेखा करता है, इसलिए असली गंतव्य "' + host + '" है।');
    }
    if (official) {
      add(0, '"' + domain + '" is on the known official list' + (isTrustedSuffix(host) ? ' (restricted .gov.in / .nic.in / .bank.in name)' : '') + '. Still open it by typing the address yourself.', '"' + domain + '" ज्ञात आधिकारिक सूची में है। फिर भी पता खुद टाइप करके खोलें।');
      return out;
    }
    if (domain === 't.me' || domain === 'wa.me') {
      add(0.3, 'This link opens a private Telegram/WhatsApp chat with an unknown person, moving you off any official channel.', 'यह लिंक किसी अनजान व्यक्ति के साथ निजी टेलीग्राम/व्हाट्सएप चैट खोलता है, जो आपको आधिकारिक माध्यम से बाहर ले जाता है।');
      return out;
    }
    if (SHORTENERS.has(domain)) {
      add(0.35, 'This is a link shortener (' + domain + '), which hides the real destination. Organisations sending account alerts rarely use them.', 'यह लिंक शॉर्टनर (' + domain + ') है, जो असली गंतव्य छिपाता है। खाते से जुड़ी सूचना भेजने वाली संस्थाएं इनका उपयोग शायद ही करती हैं।');
    }
    const tokens = host.split(/[.\-_]/).filter(Boolean);
    const flat = host.replace(/[.\-_]/g, '');
    let branded = null;
    for (const b of BRANDS) {
      if (b.t.some(t => tokens.includes(t) || (t.length >= 6 && flat.includes(t)))) { branded = b; break; }
    }
    if (!branded) {
      const label = domain.split('.')[0];
      for (const part of label.split('-').concat([label.replace(/-/g, '')])) {
        const norm = leet(part);
        for (const b of BRANDS) for (const t of b.t) {
          if (t.length < 5) continue;
          const d = lev(norm, t);
          if ((norm === t && part !== t) || (d === 1) || (d === 2 && t.length >= 8)) { branded = b; out.typo = true; }
        }
      }
    }
    if (branded) {
      add(0.8, (out.typo ? 'The website name is a misspelling that imitates ' : 'The link uses the name of ') + branded.n + ', but the actual site is "' + domain + '", which is not ' + branded.n + '\'s official domain (' + branded.d[0] + ').',
        (out.typo ? 'वेबसाइट का नाम गलत वर्तनी से ' + branded.n + ' की नकल करता है' : 'लिंक में ' + branded.n + ' का नाम है') + ', पर असली साइट "' + domain + '" है, जो ' + branded.n + ' का आधिकारिक डोमेन (' + branded.d[0] + ') नहीं है।');
    } else if (GOV_WORDS.some(g => tokens.includes(g) || (g.length >= 6 && flat.includes(g)))) {
      add(0.75, 'The link looks like a government site, but "' + domain + '" does not end in .gov.in or .nic.in, which genuine Indian government sites use.', 'लिंक सरकारी साइट जैसा दिखता है, पर "' + domain + '" का अंत .gov.in या .nic.in से नहीं होता, जो असली भारतीय सरकारी साइटों में होता है।');
    }
    if (BAD_TLDS.has(tld)) {
      add(0.45, 'The address ends in ".' + tld + '", a low-cost ending that is heavily used for throwaway scam sites.', 'पते का अंत ".' + tld + '" से है, जो सस्ता है और अस्थायी घोटाला साइटों में बहुत इस्तेमाल होता है।');
    }
    if (/\.apk($|[?#])/i.test(u.pathname + u.search)) {
      add(0.7, 'The link downloads an Android app file (.apk) directly, bypassing the Play Store\'s checks.', 'यह लिंक सीधे Android ऐप फाइल (.apk) डाउनलोड करता है, जो Play Store की जांच से बचती है।');
    }
    if (hadScheme && u.protocol === 'http:') {
      add(0.2, 'The link uses "http" without encryption. Any page asking for login or payment details must use "https".', 'लिंक बिना एन्क्रिप्शन वाला "http" है। लॉगिन या भुगतान विवरण मांगने वाला पेज "https" होना चाहिए।');
    }
    if (host.split('.').length - domain.split('.').length >= 3) {
      add(0.3, 'The address has many sub-parts before the real site name ("' + domain + '"), a common way to bury the true domain.', 'पते में असली साइट ("' + domain + '") से पहले कई हिस्से जोड़े गए हैं, जो असली डोमेन छिपाने का आम तरीका है।');
    }
    if ((domain.split('.')[0].match(/-/g) || []).length >= 2) {
      add(0.25, 'The site name strings several words together with hyphens ("' + domain + '"), typical of made-up look-alike domains.', 'साइट के नाम में कई शब्द हाइफ़न से जोड़े गए हैं ("' + domain + '"), जो बनावटी नकली डोमेन की पहचान है।');
    }
    if (PATH_WORDS.test(u.pathname + u.search) || PATH_WORDS.test(host.replace(domain, ''))) {
      add(0.3, 'The link points to a login / verify / claim style page on a site that is not on the official list.', 'लिंक ऐसी साइट के लॉगिन / वेरिफाई / क्लेम जैसे पेज पर जाता है जो आधिकारिक सूची में नहीं है।');
    }
    if (!out.findings.length) {
      add(0.08, 'Unrecognised site "' + domain + '". Nothing clearly wrong in the address itself, but it is not on the known official list, so do not enter personal details there.', 'अनजान साइट "' + domain + '"। पते में साफ तौर पर कुछ गलत नहीं, पर यह ज्ञात आधिकारिक सूची में नहीं है, इसलिए वहां निजी जानकारी न डालें।');
    }
    return out;
  }

  /* ---------- UPI payment links / QR payloads ---------- */
  function analyzeUpi(raw, source) {
    const q = raw.slice(raw.indexOf('?') + 1);
    const p = {};
    q.split('&').forEach(kv => { const i = kv.indexOf('='); if (i > 0) { try { p[kv.slice(0, i).toLowerCase()] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')); } catch (e) { p[kv.slice(0, i).toLowerCase()] = kv.slice(i + 1); } } });
    const out = { raw, vpa: p.pa || '', name: p.pn || '', amount: p.am || '', note: p.tn || '', findings: [] };
    const add = (w, en, hi) => out.findings.push({ w, why: L(en, hi) });
    add(0.25, 'This is a UPI payment request to "' + (out.vpa || 'unknown ID') + '"' + (out.name ? ' (shown name: ' + out.name + ')' : '') + '. Opening it and entering your PIN will SEND money. It cannot credit money to you.',
      'यह "' + (out.vpa || 'अज्ञात ID') + '"' + (out.name ? ' (दिखाया गया नाम: ' + out.name + ')' : '') + ' को UPI भुगतान का अनुरोध है। इसे खोलकर PIN डालने से पैसे जाएंगे। इससे आपके खाते में पैसे नहीं आ सकते।');
    if (out.amount) add(0.25, 'The amount is pre-filled (₹' + out.amount + '). Check it against what you actually agreed to pay.', 'राशि पहले से भरी हुई है (₹' + out.amount + ')। इसे उस राशि से मिलाएं जो आपने देने के लिए तय की थी।');
    const bait = /(refund|cash ?back|reward|prize|lottery|lucky|kbc|winner|bonus|gift|customer ?care|help ?desk|support|kyc|verification|income ?tax|electricity|govt|government|रिफंड|इनाम|कैशबैक|लॉटरी)/i;
    const shown = (out.name + (out.note && !out.name.toLowerCase().includes(out.note.toLowerCase()) ? ' / ' + out.note : '')).trim();
    if (bait.test(out.name + ' ' + out.note)) add(0.55, 'The payee name or note says "' + shown + '", suggesting you will receive something. A payment request cannot give you a refund, prize or cashback.', 'भुगतान पाने वाले के नाम या नोट में "' + shown + '" लिखा है, मानो आपको कुछ मिलेगा। भुगतान अनुरोध से रिफंड, इनाम या कैशबैक नहीं मिल सकता।');
    const brand = BRANDS.find(b => b.t.concat([b.n.toLowerCase()]).some(t => out.name.toLowerCase().replace(/\s+/g, '').includes(t.replace(/\s+/g, '')) && t.length >= 3));
    const personalHandle = /^\d{10}@|@(ybl|ibl|axl|paytm|okaxis|okhdfcbank|oksbi|okicici|upi|apl|yapl|ptyes|ptsbi|pthdfc|ptaxis)$/i.test(out.vpa);
    if (brand && personalHandle) add(0.5, 'The name shown is "' + out.name + '" but the UPI ID "' + out.vpa + '" looks like a personal account. Companies collect payments through verified merchant IDs.', 'दिखाया गया नाम "' + out.name + '" है, पर UPI ID "' + out.vpa + '" निजी खाते जैसी लगती है। कंपनियां सत्यापित मर्चेंट ID से भुगतान लेती हैं।');
    if (!out.vpa) add(0.3, 'The payment request has no readable payee ID.', 'इस भुगतान अनुरोध में पाने वाले की ID पढ़ी नहीं जा सकी।');
    if (source === 'qr' && !out.name) add(0.1, 'The QR does not carry a payee name, so confirm the name your UPI app shows before paying.', 'QR में पाने वाले का नाम नहीं है, इसलिए भुगतान से पहले UPI ऐप में दिखा नाम जांच लें।');
    return out;
  }

  /* ---------- language + privacy helpers ---------- */
  function detectLang(text) {
    const letters = (text.match(/\p{L}/gu) || []).length || 1;
    const deva = (text.match(/[\u0900-\u097F]/g) || []).length;
    const otherIndic = (text.match(/[\u0980-\u0D7F]/g) || []).length;
    if (otherIndic / letters > 0.2) return 'other-indic';
    if (deva / letters > 0.15) return 'hi';
    const hing = (text.toLowerCase().match(/\b(hai|hain|aap|aapka|aapki|apna|apne|karo|kare|karein|kijiye|nahi|jayega|jaega|turant|paise|khata|bijli|ke liye|abhi|mein|hoga|raha|rahi)\b/g) || []).length;
    return hing >= 2 ? 'hi-Latn' : 'en';
  }
  function redact(text) {
    return text
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]')
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
      .replace(/\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[AADHAAR]')
      .replace(/(\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g, '[PHONE]')
      .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[PAN]')
      .replace(/\b\d{9,18}\b/g, '[ACCOUNT]')
      .replace(/\b(otp|code|पिन|ओटीपी|pin)(\D{0,12})\d{4,8}\b/gi, '$1$2[CODE]')
      .replace(/\b\d{4,8}(\s+is your\s+(otp|one[- ]time password|verification code))/gi, '[CODE]$1');
  }

  /* ---------- advice ---------- */
  const ADVICE = {
    base: L('Do not click, pay or reply until you have checked with the organisation through its official app, website or the number printed on your card/bill.', 'जब तक आप संस्था के आधिकारिक ऐप, वेबसाइट या कार्ड/बिल पर छपे नंबर से पुष्टि न कर लें, तब तक क्लिक, भुगतान या जवाब न करें।'),
    report: L('Report it: call 1930 (national cyber-fraud helpline) or file at cybercrime.gov.in. Suspicious calls/SMS can be reported on Chakshu at sancharsaathi.gov.in.', 'शिकायत करें: 1930 (राष्ट्रीय साइबर धोखाधड़ी हेल्पलाइन) पर कॉल करें या cybercrime.gov.in पर दर्ज करें। संदिग्ध कॉल/SMS की सूचना sancharsaathi.gov.in के चक्षु पर दें।'),
    paid: L('If you already paid or shared an OTP, call 1930 immediately and inform your bank. Quick reporting improves the chance of freezing the money.', 'अगर आपने पैसे भेज दिए हैं या OTP बता दिया है, तो तुरंत 1930 पर कॉल करें और बैंक को बताएं। जल्दी शिकायत से पैसा रोके जाने की संभावना बढ़ती है।'),
    sensitive: L('Never share OTP, UPI PIN, CVV or passwords with anyone, including people claiming to be bank staff.', 'OTP, UPI PIN, CVV या पासवर्ड किसी को न बताएं, चाहे वह खुद को बैंक कर्मचारी ही क्यों न बताए।'),
    upi: L('To receive money you do nothing: no scan, no PIN. If someone insists, it is a scam.', 'पैसे पाने के लिए आपको कुछ नहीं करना होता: न स्कैन, न PIN। कोई जोर दे तो समझें कि यह ठगी है।'),
    remote: L('Do not install the app. If you already did, uninstall it, switch on flight mode, and change your banking passwords from another device.', 'ऐप इंस्टॉल न करें। अगर कर लिया है तो हटाएं, फ्लाइट मोड चालू करें और दूसरे डिवाइस से बैंकिंग पासवर्ड बदलें।'),
    arrest: L('Hang up. Police, CBI, ED or customs never arrest over a video call or ask you to transfer money to a "safe account".', 'कॉल काट दें। पुलिस, CBI, ED या कस्टम कभी वीडियो कॉल पर गिरफ्तारी नहीं करते और न ही "सुरक्षित खाते" में पैसे भेजने को कहते हैं।'),
    link: L('Do not open the link. Type the official address yourself or use the official app.', 'लिंक न खोलें। आधिकारिक पता खुद टाइप करें या आधिकारिक ऐप इस्तेमाल करें।'),
    low: L('No strong scam signals were found, but this tool cannot prove a message is genuine. If it asks for money or personal details, verify through an official channel first.', 'कोई मजबूत घोटाला संकेत नहीं मिला, पर यह टूल संदेश के असली होने की गारंटी नहीं दे सकता। अगर पैसे या निजी जानकारी मांगी जाए, तो पहले आधिकारिक माध्यम से पुष्टि करें।'),
  };

  const LEVELS = [
    { min: 80, id: 'critical', label: L('Very likely a scam', 'घोटाला होने की बहुत अधिक संभावना') },
    { min: 50, id: 'high', label: L('Likely a scam', 'घोटाला होने की संभावना') },
    { min: 20, id: 'caution', label: L('Be careful', 'सावधान रहें') },
    { min: 0, id: 'low', label: L('No strong scam signals found', 'कोई मजबूत घोटाला संकेत नहीं मिला') },
  ];

  /* ---------- main entry ---------- */
  function analyze(input, opts) {
    const source = (opts && opts.source) || 'text';
    const text = String(input || '').replace(/\r/g, '').slice(0, 20000);
    const ev = [];
    const push = (cat, w, start, end, why, extra) => ev.push(Object.assign({ cat, w, start, end, match: start >= 0 ? text.slice(start, end) : '', why }, extra || {}));

    // UPI deep links first (so they are not double counted as web links)
    const upi = [];
    const upiRe = /upi:\/\/pay\?[^\s<>"']+/gi;
    let m;
    while ((m = upiRe.exec(text))) {
      const a = analyzeUpi(m[0], source); upi.push(a);
      a.findings.forEach(f => push('upi', f.w, m.index, m.index + m[0].length, f.why));
    }
    const masked = text.replace(upiRe, s => ' '.repeat(s.length));

    const urls = [];
    for (const um of masked.matchAll(URL_RE)) {
      const a = analyzeUrl(um[0]);
      if (!a.valid) continue;
      urls.push(a);
      a.findings.forEach(f => push(f.w === 0 ? 'official' : 'link', f.w, um.index, um.index + a.raw.length, f.why));
    }

    // phrase rules must not fire on words inside a link (the link analysis already covers those)
    let prose = masked;
    for (const um of masked.matchAll(URL_RE)) prose = prose.slice(0, um.index) + ' '.repeat(um[0].length) + prose.slice(um.index + um[0].length);

    const seen = {};
    for (const r of RULES) {
      r.re.lastIndex = 0;
      for (const rm of prose.matchAll(r.re)) {
        if (!rm[0].trim()) continue;
        let cat = r.cat;
        if (cat === 'sensitive' && (NEG_EN.test(prose.slice(Math.max(0, rm.index - 40), rm.index)) || NEG_INNER.test(rm[0]))) cat = 'protective';
        seen[cat] = (seen[cat] || 0) + 1;
        if (seen[cat] > 4) continue;
        const dup = ev.some(e => e.cat === cat && e.start < rm.index + rm[0].length && rm.index < e.end);
        if (dup) continue;
        push(cat, CATS[cat].w, rm.index, rm.index + rm[0].length, CATS[cat].why);
      }
    }

    if (source === 'qr') {
      if (/^(smsto|sms|tel|mailto):/i.test(text.trim())) push('qr', 0.4, 0, text.length, L('This QR does not open a page: it starts a call, SMS or e-mail to a number/address chosen by whoever made it. Premium numbers and verification-code theft work this way.', 'यह QR कोई पेज नहीं खोलता: यह बनाने वाले के चुने नंबर/पते पर कॉल, SMS या ई-मेल शुरू करता है। प्रीमियम नंबर और वेरिफिकेशन कोड की चोरी ऐसे ही होती है।'));
      else if (urls.length && !urls.every(u => u.official)) push('qr', 0.12, -1, -1, L('A QR code hides its destination until after you scan it. Read the full address your camera shows before opening.', 'QR कोड स्कैन होने तक अपना गंतव्य छिपाए रखता है। खोलने से पहले कैमरे में दिखा पूरा पता पढ़ें।'));
    }

    // score: per category = strongest hit + a little for repeats; categories combine as "noisy OR"
    const strongPresent = ev.some(e => e.w > 0.2 && CATS[e.cat].strong);
    const byCat = {};
    ev.forEach(e => { (byCat[e.cat] = byCat[e.cat] || []).push(e); });
    let safe = 1;
    Object.keys(byCat).forEach(cat => {
      if (!CATS[cat].strong && !strongPresent) return;
      const ws = byCat[cat].map(e => e.w).sort((a, b) => b - a);
      if (!ws[0]) return;
      // link / UPI findings are independent facts about one object, so they stack; repeated phrases barely do
      const c = (cat === 'link' || cat === 'upi')
        ? Math.min(0.95, 1 - ws.reduce((a, w) => a * (1 - w), 1))
        : Math.min(0.95, ws[0] + 0.25 * ws.slice(1).reduce((a, b) => a + b, 0) * (1 - ws[0]));
      safe *= 1 - c;
    });
    const score = Math.round(100 * (1 - safe));
    const level = LEVELS.find(l => score >= l.min);
    const lang = detectLang(text);

    const has = c => !!byCat[c];
    const advice = [];
    if (level.id === 'low') advice.push(ADVICE.low);
    else {
      advice.push(ADVICE.base);
      if (has('link')) advice.push(ADVICE.link);
      if (has('sensitive')) advice.push(ADVICE.sensitive);
      if (has('upi') || has('receive')) advice.push(ADVICE.upi);
      if (has('remote') || has('apk')) advice.push(ADVICE.remote);
      if (has('arrest')) advice.push(ADVICE.arrest);
      if (score >= 50) { advice.push(ADVICE.report); advice.push(ADVICE.paid); }
    }
    const notes = [];
    if (lang === 'other-indic') notes.push(L('This text is in a script the prototype has no phrase rules for yet. Only links, UPI requests and numbers were analysed, so the score may be too low.', 'यह पाठ ऐसी लिपि में है जिसके लिए प्रोटोटाइप में अभी वाक्यांश नियम नहीं हैं। केवल लिंक, UPI अनुरोध और नंबर जांचे गए, इसलिए स्कोर कम हो सकता है।'));
    if (!text.trim()) notes.push(L('Nothing to analyse.', 'जांचने के लिए कुछ नहीं है।'));

    ev.sort((a, b) => b.w - a.w || a.start - b.start);
    return { score, level: level.id, levelLabel: level.label, lang, evidence: ev, urls, upi, advice, notes, redacted: redact(text), text };
  }

  const api = { analyze, analyzeUrl, analyzeUpi, redact, detectLang, regDomain, CATS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ScamShield = api;
})(typeof window !== 'undefined' ? window : globalThis);
