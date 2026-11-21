/* Spot the Scam — read the message, decide: safe or scam.
   The lesson IS the mechanic: every answer teaches the red flag (or the safety sign).
   100 levels, 5 messages per level, pass with 4+. Progress in localStorage (wa_ss_*). */
(function () {
  'use strict';
  var MAX_LEVEL = 100, PER_LEVEL = 5, PASS = 4;

  /* Scenario bank. Fields: c channel, f sender, t text, s 1=scam 0=safe,
     w why, r golden rule, tier 1 easy / 2 medium / 3 hard. */
  var BANK = [
    /* ---------- TIER 1 — obvious ---------- */
    { c: 'Text message', f: 'BANK-ALERT', t: 'Your account is BLOCKED. Send your PIN and full card number to this number to unlock it now.', s: 1, tier: 1,
      w: 'A real bank will never ask for your PIN or full card number — by text, call, or any other way.', r: 'Banks never ask for PINs or passwords.' },
    { c: 'Text message', f: 'PRIZE-CENTER', t: 'CONGRATS! You won 500,000 in the Mega Lottery! To claim your prize, first pay a small fee of 2,000.', s: 1, tier: 1,
      w: 'You cannot win a lottery you never entered — and a real prize never asks you to pay a fee first.', r: 'Pay to claim a prize? It is a scam.' },
    { c: 'Email', f: 'Prince Wealth <prince.wealth@mailbox.com>', t: 'Dear friend, I am a prince with millions stuck abroad. Send a little money to help me move it, and I will share half with you.', s: 1, tier: 1,
      w: 'A stranger promising to share millions is one of the oldest tricks in the world. The only money that moves is yours — away.', r: 'Strangers do not share fortunes.' },
    { c: 'Chat message', f: 'Unknown number', t: 'Hi, I am Sara from CryptoRich. Send 100 today and I will double it in one hour. Guaranteed!', s: 1, tier: 1,
      w: 'Nobody can guarantee to double money. Real investing can go down as well as up — "guaranteed profit" is always a lie.', r: 'Guaranteed profit = guaranteed scam.' },
    { c: 'Text message', f: 'DELIVERY', t: 'Your parcel is being held. Pay the customs fee now to release it: deliverfast-pay.xyz', s: 1, tier: 1,
      w: 'A strange link plus a surprise fee for a parcel you did not order. Real couriers do not collect fees through random links.', r: 'Surprise fee + strange link = stop.' },
    { c: 'Social DM', f: 'video.fan.92', t: 'OMG is this YOU in this video?? Log in fast to watch it: facebok-login.ru', s: 1, tier: 1,
      w: 'Look at the address: "facebok", not "facebook", on a strange ending. It is a fake login page waiting to steal your password.', r: 'Read the address letter by letter.' },
    { c: 'Email', f: 'Exam Leaks <papers@examleaks.com>', t: 'LEAKED EXAM PAPERS! All answers before the test. Pay 500 and pass without studying.', s: 1, tier: 1,
      w: 'There are no leaked papers — just a thief. Paying also means cheating, and cheats get caught.', r: 'Shortcuts to cheating are traps.' },
    { c: 'Text message', f: 'JOBS-DAILY', t: 'Work from home! Earn 5,000 a day just liking videos. To start, buy the 999 starter kit today.', s: 1, tier: 1,
      w: 'A real job pays YOU. Any "job" that asks you to pay first — for a kit, training, or a deposit — is a scam.', r: 'Real jobs never charge you to start.' },
    { c: 'Chat message', f: 'Bank Security (unknown number)', t: 'A hacker is in your account! Quick — tell me the OTP code we just sent you so I can stop him.', s: 1, tier: 1,
      w: 'The OTP is the key to your account. Anyone asking for it IS the hacker. Real bank staff never ask for it.', r: 'Never share an OTP. With anyone. Ever.' },
    { c: 'Email', f: 'Account Team <alert@accounts-verify.net>', t: 'Dear customer, your account will be DELETED in 2 hours. Verify your password here immediately to save it.', s: 1, tier: 1,
      w: 'Panic is the trick: "2 hours!" rushes you so you do not think. Real companies do not delete accounts over one email.', r: 'Messages that rush you want you not to think.' },
    { c: 'Text message', f: 'WINNER', t: 'You are selected for a FREE phone! Just pay shipping of 199 here: claim-now.top', s: 1, tier: 1,
      w: 'A "free" phone that costs money is not free. The small payment is how they get your card details.', r: 'Free that costs money is not free.' },
    { c: 'Social DM', f: 'Celebrity Giveaway (fan page)', t: 'I chose YOU for my secret giveaway! Send me your bank details and I will send you 10,000 today.', s: 1, tier: 1,
      w: 'Celebrities do not DM strangers asking for bank details. The account is fake, and the money would flow the wrong way.', r: 'Nobody needs your bank details to GIVE you money.' },
    { c: 'Email', f: 'Photo Contest <win@photo-contest.com>', t: 'Your photo won our contest! Download your prize certificate here: prize-file.exe', s: 1, tier: 1,
      w: 'A file ending in .exe is a program, not a certificate. Downloading unknown programs is how viruses get in.', r: 'Never open surprise program files.' },
    { c: 'Chat message', f: 'Unknown number', t: 'Sorry, I sent money to your number by mistake. Please send it back to this other number quickly.', s: 1, tier: 1,
      w: 'A classic trick: the "mistaken" payment is fake or will bounce, but the money you send back is real — and gone.', r: 'Do not return "mistaken" money to strangers.' },
    { c: 'Text message', f: 'LOAN-FAST', t: 'Loan APPROVED! No documents, no checks! Just pay the small processing fee first and the money is yours.', s: 1, tier: 1,
      w: 'Real lenders take fees from the loan itself or after approval — never cash upfront from a stranger by text.', r: 'Upfront fee for a loan = scam.' },
    { c: 'Email', f: 'Billing <support@netfliix-billing.com>', t: 'Your subscription payment failed. Update your card now or lose your account: netfliix-billing.com/pay', s: 1, tier: 1,
      w: 'Read the name slowly: "netfliix" has an extra i. Scammers copy famous names with one letter changed.', r: 'One wrong letter changes everything.' },
    { c: 'Text message', f: 'Your Bank', t: 'You spent 1,250 at MegaMart today. If this was NOT you, call the number on the back of your card.', s: 0, tier: 1,
      w: 'Safe signs: no link, nothing asked from you, and it sends you to the number printed on your own card — the one place you can trust.', r: 'Real alerts ask for nothing.' },
    { c: 'Email', f: 'School Office <office@school.edu>', t: 'Reminder: school reopens on Monday. Classes begin at 8:00 AM. Please bring your sports kit for the afternoon games.', s: 0, tier: 1,
      w: 'Safe signs: it is from your school, it only gives information, and it asks for nothing — no money, no password, no click.', r: 'Information-only messages are usually safe.' },
    { c: 'Chat message', f: 'Mum', t: 'Please bring milk and eggs on your way home. Dinner at seven!', s: 0, tier: 1,
      w: 'A normal family message: a person you know, an everyday request, no money and no links.', r: 'Everyday requests from family are safe.' },
    { c: 'Text message', f: 'FoodDelivery App', t: 'Your order is out for delivery. You can follow your rider live inside the app.', s: 0, tier: 1,
      w: 'Safe sign: it points you INSIDE the official app — not to a website link, and it asks for no payment.', r: '"Open our app" is safer than "click this link".' },
    { c: 'Email', f: 'City Library <desk@citylibrary.org>', t: 'Good news: the book you reserved is ready. Please collect it from the front desk this week.', s: 0, tier: 1,
      w: 'You reserved the book, the library is real, and nothing is asked of you except showing up.', r: 'Expected messages from real places are safe.' },
    { c: 'Text message', f: 'City Clinic', t: 'Reminder: your appointment is tomorrow at 10 AM. Reply C to confirm or call us to change it.', s: 0, tier: 1,
      w: 'Safe signs: an appointment you actually made, and it only asks you to confirm — no money, no secrets, no link.', r: 'Confirming is fine. Paying strangers is not.' },
    { c: 'Social DM', f: 'Your friend Ayesha', t: 'Happy birthday!! Hope you have the best day. Cake on you this weekend!', s: 0, tier: 1,
      w: 'Just a birthday wish from a friend. No links, no money, no rush — nothing a scammer would bother with.', r: 'Friendly chats with no asks are safe.' },
    { c: 'Email', f: 'GameZone <receipts@gamezone.com>', t: 'Your receipt: 1 game added to your library. You can view this purchase any time in your account.', s: 0, tier: 1,
      w: 'A simple receipt for something you bought. It asks for nothing and links nowhere strange.', r: 'Receipts inform. Scams demand.' },

    /* ---------- TIER 2 — trickier ---------- */
    { c: 'Email', f: 'IT Helpdesk <it-helpdesk@company-secure.net>', t: 'Your mailbox is almost full and messages are being rejected. Re-enter your password now to keep receiving mail.', s: 1, tier: 2,
      w: 'The address is "company-secure.net" — a look-alike, not your real company or school domain. Passwords are never "re-entered" from an email.', r: 'Check the sender domain, not the display name.' },
    { c: 'Text message', f: 'SECURITY', t: 'Someone tried to sign in to your account. If this was not you, secure it immediately: secure-acc0unt.com', s: 1, tier: 2,
      w: 'Look closely: "acc0unt" uses a zero instead of the letter o. The warning sounds real, but the link leads to a fake page.', r: 'Zeros hide inside fake addresses.' },
    { c: 'Chat message', f: 'Class Teacher (new number)', t: 'Assalam-o-Alaikum parents, I have a new number. Please pay this term\'s exam fee to my personal account below before Friday.', s: 1, tier: 2,
      w: 'A "new number" plus fees to a personal account is a known school-fee scam. Real fees go through the school office — call the school to check.', r: 'Verify new numbers through the office.' },
    { c: 'Email', f: 'Antivirus Billing <invoice@av-billing.com>', t: 'Payment of 899 for Antivirus Pro has been taken from your account. If you did not buy this, call us within 24 hours to cancel: 0800-555-0134', s: 1, tier: 2,
      w: 'The panic invoice trick: there is no charge — they want you to call the number, where a fake agent will ask for card details or remote access.', r: 'Do not call numbers from surprise invoices.' },
    { c: 'Social DM', f: 'Your friend Bilal', t: 'Bro I am stuck in another city, my wallet got stolen. Please send 300 right now, I will return it tomorrow. Do not call, my phone is dying.', s: 1, tier: 2,
      w: '"Do not call" is the biggest red flag — scammers who hijack accounts fear a voice call. Always call the person on their real number first.', r: 'Urgent money + "do not call" = call them.' },
    { c: 'Text message', f: 'SIM-INFO', t: 'Your SIM will be blocked today under new rules. Update your details at the link to avoid disconnection.', s: 1, tier: 2,
      w: 'Blocking threats with a link are a standard trick. Real network updates come through official channels, not surprise links.', r: 'Threat + link + today = scam pattern.' },
    { c: 'Email', f: 'Security Center <noreply@login-secure-portal.net>', t: 'Unusual sign-in detected from another country. Review your activity and confirm your identity here.', s: 1, tier: 2,
      w: 'The real warning would tell you to open the app or type the address yourself. This one herds you to "login-secure-portal.net" — a fake.', r: 'Type real addresses yourself; never from the message.' },
    { c: 'Chat message', f: 'HR — Online Reviews Co.', t: 'Great news, you are selected as a product reviewer! We will post products to you. First, deposit 50 as refundable security.', s: 1, tier: 2,
      w: '"Refundable deposit" is still you paying a stranger for a job. Real employers never take deposits from workers.', r: 'A job asking for a deposit is not a job.' },
    { c: 'Email', f: 'Global Scholarship Fund <awards@scholarship-fund.org>', t: 'Congratulations! You have been selected for a full scholarship abroad. Pay the registration fee within 7 days to reserve your seat.', s: 1, tier: 2,
      w: 'Real scholarships are checked through official websites and never need a quick "reservation fee" from an email you never applied to.', r: 'Scholarships you never applied for do not exist.' },
    { c: 'Text message', f: 'REFUND', t: 'Your refund of 750 is ready! Scan the QR code in the attached image to receive it in your account.', s: 1, tier: 2,
      w: 'Scanning a stranger\'s QR code usually starts a payment FROM you, not to you. Refunds return the way you paid — automatically.', r: 'QR codes from strangers move money the wrong way.' },
    { c: 'Social DM', f: 'Page Support', t: 'Your page has violated our policy and will be deleted in 24 hours. Appeal here before it is too late: page-appeal-form.xyz', s: 1, tier: 2,
      w: 'Real platforms warn you inside the app, in the notifications area — never through a DM with a strange link and a countdown.', r: 'Real warnings live inside the app.' },
    { c: 'Email', f: 'Tax Refunds Office <refund@tax-office-payments.com>', t: 'Dear taxpayer, your refund of 4,320 is ready. Enter your bank details on our secure form to receive it within 3 days.', s: 1, tier: 2,
      w: 'Tax offices do not email strangers asking for bank details on a form. Refunds go to the account already on record.', r: 'Governments do not collect bank details by email.' },
    { c: 'Email', f: 'Your Bank <statements@yourbank.com>', t: 'Your monthly statement is ready. To view it, sign in the way you normally do — through our app or by typing our address yourself.', s: 0, tier: 2,
      w: 'Safe signs: no link at all, and it tells you to sign in the normal way. This is exactly how a careful bank writes.', r: 'No link + "sign in normally" = good sign.' },
    { c: 'Text message', f: 'OTP Service', t: 'Your one-time code is 482913. Never share this code with anyone — we will never call or message to ask for it.', s: 0, tier: 2,
      w: 'Receiving a code YOU asked for is normal and safe. Notice the message itself warns you never to share it — real services say this.', r: 'Codes are safe to receive, deadly to share.' },
    { c: 'Chat message', f: 'Class Group — Mr. Ahmed', t: 'Assalam-o-Alaikum everyone. Tomorrow\'s maths test is postponed to Friday. Please revise chapters 4 and 5.', s: 0, tier: 2,
      w: 'Safe signs: your real class group, your teacher\'s normal style, and it asks for nothing but revision.', r: 'Known groups + no asks = safe.' },
    { c: 'Email', f: 'Streaming Help <no-reply@streaming.com>', t: 'Your password was changed a few minutes ago. If this was not you, use "Forgot password" on our official website to take back your account.', s: 0, tier: 2,
      w: 'Safe signs: no link, and it sends you to the official website by name. It tells you what happened without asking for secrets.', r: 'Good alerts inform; they do not collect.' },
    { c: 'Text message', f: 'Courier Depot', t: 'We tried to deliver your parcel today but you were out. It is waiting at the depot — please bring your ID to collect it.', s: 0, tier: 2,
      w: 'Safe signs: no fee, no link, and collection in person with ID — how real depots work.', r: 'In-person collection beats payment links.' },
    { c: 'Social post', f: 'Corner Bakery (official page)', t: 'Our shop will be closed this Sunday for a family event. Thank you for understanding — see you on Monday!', s: 0, tier: 2,
      w: 'A normal announcement on the shop\'s own page. Nothing is asked, nothing is sold, no link pushes you anywhere.', r: 'Announcements are not attacks.' },

    /* ---------- TIER 3 — subtle ---------- */
    { c: 'Email', f: 'Accounts Dept <accounts@yourcompany.com>', t: 'Please process the attached invoice today and keep it between us for now — the director is travelling and asked me to handle it quietly.', s: 1, tier: 3,
      w: 'This is the "boss fraud" pattern: a normal-looking address, a rush, and secrecy. Real payments follow the normal checking process — secrecy is the tell.', r: 'Secrecy around money is always a red flag.' },
    { c: 'Text message', f: 'BANK', t: 'A new payee was added to your account. If this was not you, check now: bank-secure-check.com', s: 1, tier: 3,
      w: 'The sender NAME says BANK — but sender names can be faked. The link is the truth-teller, and it is not your bank\'s real address.', r: 'Sender names can be faked. Links cannot hide.' },
    { c: 'Email', f: 'Receipts <receipt@shop-receipts.com>', t: 'Thank you for your purchase of 1,150. Changed your mind? Dispute this charge here within 48 hours.', s: 1, tier: 3,
      w: 'A purchase you never made, plus a "dispute here" link. The receipt is bait — the dispute page harvests card details.', r: 'Fake receipts fish for real cards.' },
    { c: 'Chat message', f: 'Admissions Office (new number)', t: 'Your seat is confirmed. Upload your ID card photo here and pay the challan to this personal wallet number today to lock it.', s: 1, tier: 3,
      w: 'Two red flags together: ID photos to a chat, and official fees to a personal wallet. Real admissions use official challans and portals.', r: 'Official fees never go to personal wallets.' },
    { c: 'Social DM', f: 'Trading Mentor', t: 'My students made 40% this month (screenshots attached). Join my private group — we move to another app, you deposit, I trade for you.', s: 1, tier: 3,
      w: 'Profit screenshots are easy to fake, and "I trade for you" means your deposit disappears. Real mentors do not recruit by DM.', r: 'Screenshots are not proof of profit.' },
    { c: 'Email', f: 'Cloud Storage <billing@cloude-storage.com>', t: 'Your storage is 98% full and your photos will stop backing up. Buy extra space now to keep them safe.', s: 1, tier: 3,
      w: 'Read the domain: "cloude" with an extra e. The fear (losing photos) is real, but the seller is fake.', r: 'Fear plus one wrong letter = trap.' },
    { c: 'Text message', f: 'Unknown number', t: 'You missed a call from the Bank Fraud Department. Call us back on this number immediately to protect your account.', s: 1, tier: 3,
      w: 'The callback trick: the number is the scammer\'s, not the bank\'s. Always call the number printed on your card instead.', r: 'Only trust the number on your card.' },
    { c: 'Social post', f: 'Flood Relief — Help Now', t: 'Families have lost everything. Please donate generously to this personal account and share this post quickly.', s: 1, tier: 3,
      w: 'Real charities publish official accounts and receipts. A copied disaster photo plus a personal account is a known donation scam.', r: 'Donate through official charity channels only.' },
    { c: 'Email', f: 'Results Office <notice@university-results.com>', t: 'Your result is withheld due to unpaid dues. Pay within 2 hours through this portal to release it: results-portal-pay.com', s: 1, tier: 3,
      w: 'A 2-hour deadline on exam results is designed to panic students. Universities announce dues through official portals and notice boards.', r: 'Deadlines on results are panic buttons.' },
    { c: 'Chat message', f: 'Property Agent', t: 'The house you liked has three other families waiting. Pay the booking token to my personal account today, or I will have to let it go.', s: 1, tier: 3,
      w: 'Pressure plus a personal account. Real bookings come with receipts and office paperwork — never "today or never" into a private wallet.', r: 'Pressure to pay privately = walk away.' },
    { c: 'Email', f: 'Account Security <no-reply@yourmail.com>', t: 'We noticed a new sign-in to your account from a new device in your city. If this was you, no action is needed.', s: 0, tier: 3,
      w: 'Safe signs: it only informs you, includes no link, and asks for nothing. "No action needed" is something scammers never say.', r: '"No action needed" is a safe sign.' },
    { c: 'Text message', f: 'Your Bank', t: 'Good news: two-step verification is now ON for your account. Your account is safer than before.', s: 0, tier: 3,
      w: 'Pure information about a safety feature you turned on. No link, no ask, no rush.', r: 'Good news with no asks is just news.' },
    { c: 'Email', f: 'Mrs. Khan — Class Teacher', t: 'Assalam-o-Alaikum. Attached is this week\'s homework timetable (PDF). Please make sure the science project is ready by Thursday.', s: 0, tier: 3,
      w: 'Safe signs: your real teacher, an expected school file, in the normal flow of class messages. Nothing is asked except homework.', r: 'Expected files from known teachers are normal.' },
    { c: 'Chat message', f: 'Your sister', t: 'I uploaded the photos from yesterday\'s picnic to our family album. Go look — the one of you sleeping is the best!', s: 0, tier: 3,
      w: 'Family chat about a shared album. No link to a strange site, no money, no secrets — just teasing.', r: 'Normal family talk is safe.' },
    { c: 'Email', f: 'Music App <hello@musicapp.com>', t: 'Your free trial ends in 3 days. You will not be charged anything unless you choose a plan yourself on our website.', s: 0, tier: 3,
      w: 'Safe signs: it clearly says you will NOT be charged, asks for no card details, and leaves the choice to you on their website.', r: 'Honest billing messages calm you down.' },
    { c: 'Text message', f: 'City Pharmacy', t: 'Your prescription is ready for pickup at the counter. We are open until 9 PM today.', s: 0, tier: 3,
      w: 'A pickup note from your pharmacy. It asks you to visit a real counter — no payment link, no details requested.', r: 'Pickup notes are safe.' }
  ];

  function tierName(l) { return l <= 20 ? 'Scam Spotter Basics' : (l <= 60 ? 'Sharp Eyes' : 'Scam Shield Pro'); }
  function poolFor(l) {
    var tiers = l <= 20 ? [1] : (l <= 60 ? [1, 2] : [2, 3]);
    return BANK.filter(function (x) { return tiers.indexOf(x.tier) >= 0; });
  }
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pickFor(level) {
    var pool = poolFor(level).slice(), rand = rng(level * 7919 + 13), out = [];
    while (out.length < PER_LEVEL && pool.length) { out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]); }
    return out;
  }

  var $ = function (id) { return document.getElementById(id); };
  var levelNowEl = $('ss-level-now'), noteEl = $('ss-progress-note'), mapEl = $('ss-map');
  var roundEl = $('ss-round'), correctEl = $('ss-correct'), starsEl = $('ss-stars');
  var cardEl = $('ss-card'), chEl = $('ss-channel'), fromEl = $('ss-from'), textEl = $('ss-text');
  var btnScam = $('ss-btn-scam'), btnSafe = $('ss-btn-safe');
  var whyEl = $('ss-why'), verdictEl = $('ss-verdict'), whyTextEl = $('ss-why-text'), ruleEl = $('ss-rule'), nextBtn = $('ss-next');
  var doneEl = $('ss-done'), doneTitle = $('ss-done-title'), doneStats = $('ss-done-stats');
  var againBtn = $('ss-again'), nextLvlBtn = $('ss-next-level'), restartBtn = $('ss-restart');

  var level = 1, unlocked = 1, starsMap = {};
  try {
    level = parseInt(localStorage.getItem('wa_ss_current') || '1', 10) || 1;
    unlocked = parseInt(localStorage.getItem('wa_ss_unlocked') || '1', 10) || 1;
    starsMap = JSON.parse(localStorage.getItem('wa_ss_stars') || '{}') || {};
  } catch (e) {}
  if (level < 1) level = 1; if (level > MAX_LEVEL) level = MAX_LEVEL;
  if (unlocked < 1) unlocked = 1; if (unlocked > MAX_LEVEL) unlocked = MAX_LEVEL;
  if (level > unlocked) level = unlocked;

  var set = [], idx = 0, correct = 0, answered = false;

  function save() {
    try {
      localStorage.setItem('wa_ss_current', String(level));
      localStorage.setItem('wa_ss_unlocked', String(unlocked));
      localStorage.setItem('wa_ss_stars', JSON.stringify(starsMap));
    } catch (e) {}
  }
  function totalStars() { var t = 0; for (var k in starsMap) t += starsMap[k] || 0; return t; }
  function doneCount() { var t = 0; for (var k in starsMap) if (starsMap[k] > 0) t++; return t; }

  function renderMap() {
    mapEl.innerHTML = '';
    for (var n = 1; n <= MAX_LEVEL; n++) {
      (function (n) {
        var b = document.createElement('button');
        var st = starsMap[n] || 0;
        b.type = 'button';
        b.className = 'ss-lvl' + (n === level ? ' ss-cur' : '') + (st > 0 ? ' ss-done' : '');
        b.textContent = st > 0 ? n + ' ★'.repeat(st) : String(n);
        if (n > unlocked) { b.disabled = true; b.classList.add('ss-lock'); b.textContent = '🔒'; b.title = 'Level ' + n + ' — finish level ' + (n - 1) + ' to unlock'; }
        b.addEventListener('click', function () { if (n <= unlocked && n !== level) { level = n; save(); start(); } });
        mapEl.appendChild(b);
      })(n);
    }
    levelNowEl.textContent = level;
    noteEl.textContent = tierName(level) + ' · ' + doneCount() + ' of 100 levels completed';
    starsEl.textContent = totalStars() + ' ★';
  }

  function showMessage() {
    var sc = set[idx];
    answered = false;
    chEl.textContent = sc.c;
    fromEl.textContent = sc.f;
    textEl.textContent = sc.t;
    cardEl.classList.remove('ss-right', 'ss-wrong');
    whyEl.classList.add('hidden');
    btnScam.disabled = false; btnSafe.disabled = false;
    btnScam.classList.remove('ss-picked-right', 'ss-picked-wrong');
    btnSafe.classList.remove('ss-picked-right', 'ss-picked-wrong');
    roundEl.textContent = (idx + 1) + ' / ' + PER_LEVEL;
    correctEl.textContent = correct;
  }

  function answer(guess) {
    if (answered) return;
    answered = true;
    var sc = set[idx], right = (guess === sc.s);
    if (right) correct++;
    btnScam.disabled = true; btnSafe.disabled = true;
    var picked = guess === 1 ? btnScam : btnSafe;
    picked.classList.add(right ? 'ss-picked-right' : 'ss-picked-wrong');
    cardEl.classList.add(right ? 'ss-right' : 'ss-wrong');
    verdictEl.textContent = right ? (sc.s ? '✅ Correct — that was a SCAM.' : '✅ Correct — that one was SAFE.') : (sc.s ? '❌ Not quite — that was a SCAM.' : '❌ Not quite — that one was actually SAFE.');
    whyTextEl.textContent = sc.w;
    ruleEl.textContent = 'Golden rule: ' + sc.r;
    whyEl.classList.remove('hidden');
    correctEl.textContent = correct;
    nextBtn.textContent = idx === PER_LEVEL - 1 ? 'See my result →' : 'Next message →';
  }

  function finish() {
    var stars = correct === 5 ? 3 : (correct === PASS ? 2 : 0);
    var passed = correct >= PASS;
    if (passed) {
      if (stars > (starsMap[level] || 0)) starsMap[level] = stars;
      if (level === unlocked && unlocked < MAX_LEVEL) unlocked = level + 1;
    }
    save(); renderMap();
    doneTitle.textContent = passed ? (correct === 5 ? '🛡️ Perfect Shield!' : '🛡️ Scam Spotter!') : '🔍 Keep Practising';
    doneStats.textContent = 'You spotted ' + correct + ' of ' + PER_LEVEL + ' correctly on Level ' + level + '.' +
      (passed ? ' Level complete — ' + stars + ' star' + (stars === 1 ? '' : 's') + ' earned.' : ' You need ' + PASS + ' correct to pass. Read the golden rules and try again — every miss teaches your eyes.');
    nextLvlBtn.style.display = passed && level < MAX_LEVEL ? '' : 'none';
    doneEl.classList.remove('hidden');
  }

  function start() {
    set = pickFor(level); idx = 0; correct = 0;
    doneEl.classList.add('hidden');
    renderMap(); showMessage();
  }

  btnScam.addEventListener('click', function () { answer(1); });
  btnSafe.addEventListener('click', function () { answer(0); });
  nextBtn.addEventListener('click', function () { if (idx < PER_LEVEL - 1) { idx++; showMessage(); } else { finish(); } });
  againBtn.addEventListener('click', start);
  nextLvlBtn.addEventListener('click', function () { if (level < MAX_LEVEL) { level++; save(); start(); } });
  restartBtn.addEventListener('click', start);

  start();
})();
