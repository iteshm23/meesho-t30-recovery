// ─────────────────────────────────────────────────────────────────────────────
// Intent understanding.
//
// TWO PATHS, and the difference is the point:
//
//  1. The customer TAPS a button in WhatsApp. Intent is then a fact, not a
//     prediction. `fromTap()` returns source:'rule', confidence 1.00. We do not
//     dress a button press up as machine learning.
//
//  2. The customer SPEAKS, on the Vaani voice fallback, in their own language.
//     That is where free text actually exists in this product — and where real
//     NLU earns its place. `fromUtterance()` classifies the transcript and
//     extracts a time window.
//
// The classifier is a transparent lexical scorer with softmax calibration. It
// returns the matched evidence so the hub can show WHY, not just WHAT.
// ─────────────────────────────────────────────────────────────────────────────

/** Below this, we do not act on the parse — a human confirms. */
export const CONFIDENCE_FLOOR = 0.70

export const INTENTS = {
  RESCHEDULE: 'RESCHEDULE',
  PICKUP: 'PICKUP',
  PAY_NOW: 'PAY_NOW',
  DECLINE: 'DECLINE',
  DISPUTE_ATTEMPT: 'DISPUTE_ATTEMPT',
  UNCLEAR: 'UNCLEAR',
}

/** Path 1 — a tap. Deterministic by construction. */
export function fromTap(choice, payload = {}) {
  return {
    intent: choice,
    confidence: 1.0,
    source: 'rule',
    sourceLabel: 'Tapped in WhatsApp — no inference needed',
    evidence: [],
    slot: payload.slot || null,
    raw: null,
  }
}

// Weighted lexicon. Hindi / Hinglish / English, as Vaani would hear it.
const LEX = {
  [INTENTS.RESCHEDULE]: [
    [/\b(shaam|sham|subah|dopahar|raat)\b/i, 1.4, 'time-of-day word'],
    [/\b(baje|bje)\b/i, 1.3, "'baje' — a clock time"],
    [/\b(ke baad|ke bad|after)\b/i, 0.8, 'window opener'],
    [/\b(ghar (pe|par)|home)\b/i, 1.1, 'will be at home'],
    [/\b(rahunga|rahungi|milunga|hounga|hun?ga|available)\b/i, 1.2, 'states availability'],
    [/\b(bhej|bhejo|bhej ?do|dobara|dubara|phir se|again|kal|tomorrow)\b/i, 1.0, 'asks to send again'],
  ],
  [INTENTS.PICKUP]: [
    [/\b(dukan|dukaan|dukane|shop|store|kirana)\b/i, 1.8, 'names a shop'],
    [/\b(rakh ?(do|wa|dijiye)|chhod ?do|drop)\b/i, 1.3, 'asks to leave it there'],
    [/\b(le lunga|le lungi|aa ?kar|pick ?up|collect)\b/i, 1.3, 'will collect it'],
    [/\b(paas|pass|nazdeek|nearby)\b/i, 0.7, 'nearby'],
  ],
  [INTENTS.PAY_NOW]: [
    [/\b(online|upi|phonepe|gpay|paytm|card)\b/i, 1.6, 'names a payment rail'],
    [/\b(abhi (pay|paise|bhugtan)|pay ?now|payment kar)\b/i, 1.5, 'offers to pay now'],
    [/\b(prepaid|advance)\b/i, 1.2, 'prepaid'],
    [/\b(pay|paise|bhugtan|bhugtaan)\b/i, 1.2, 'offers to pay'],
  ],
  [INTENTS.DECLINE]: [
    [/\b(nahi chahiye|nhi chahiye|nahi chaiye|mat bhejo|cancel|return kar)\b/i, 2.2, 'refuses the order'],
    [/\b(order (cancel|wapas)|wapas le)\b/i, 1.6, 'asks to cancel'],
    [/\b(zaroorat nahi|need nahi|dont want|do not want)\b/i, 1.6, 'no longer needs it'],
    [/\bcancel\b/i, 1.5, "says 'cancel'"],
  ],
  [INTENTS.DISPUTE_ATTEMPT]: [
    [/\b(koi (nahi|nhi) aaya|aaya hi nahi|nobody came|no ?one came)\b/i, 2.4, 'says nobody came'],
    [/\b(phone (nahi|nhi) aaya|call (nahi|nhi) aay?i|no call)\b/i, 1.5, 'no call received'],
    [/\b(ghar (pe|par) hi tha|ghar (pe|par) thi|i was home)\b/i, 1.6, 'was at home'],
    [/\b(jhoot|galat|false)\b/i, 1.2, 'disputes the record'],
  ],
}

const NUM = {
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, panch: 5, paanch: 5,
  chhe: 6, chhay: 6, che: 6, chh: 6, saat: 7, sat: 7, aath: 8, ath: 8,
  nau: 9, no: 9, das: 10, gyarah: 11, baarah: 12, barah: 12,
}

/** Pull a clock window out of free speech. Returns 24h minutes or null. */
export function extractWindow(text) {
  const t = text.toLowerCase()
  let hour = null, evidence = []

  const digit = t.match(/\b(\d{1,2})\s*(?:baje|bje|o'?clock|:00)?\b/)
  for (const [w, n] of Object.entries(NUM)) {
    if (new RegExp(`\\b${w}\\b`).test(t)) { hour = n; evidence.push(`"${w}" → ${n}`); break }
  }
  if (hour === null && digit && /baje|bje|o'?clock|pm|am/.test(t)) {
    hour = parseInt(digit[1], 10); evidence.push(`"${digit[1]}" → ${hour}`)
  }
  if (hour === null) return null

  let daypart = null
  if (/\b(shaam|sham|evening)\b/.test(t)) daypart = 'evening'
  else if (/\b(subah|morning)\b/.test(t)) daypart = 'morning'
  else if (/\b(dopahar|afternoon)\b/.test(t)) daypart = 'afternoon'
  else if (/\b(raat|night)\b/.test(t)) daypart = 'night'
  else if (/\bpm\b/.test(t)) daypart = 'evening'
  else if (/\bam\b/.test(t)) daypart = 'morning'

  let h24 = hour
  if ((daypart === 'evening' || daypart === 'afternoon' || daypart === 'night') && hour < 12) h24 = hour + 12
  if (daypart === 'morning' && hour === 12) h24 = 0
  if (daypart) evidence.push(`"${daypart}" → ${h24}:00`)

  const tomorrow = /\b(kal|tomorrow)\b/.test(t)
  if (tomorrow) evidence.push('"kal" → next day')
  const onwards = /\b(ke baad|ke bad|after|onwards|se)\b/.test(t)

  return { startHour: h24, endHour: Math.min(h24 + 2, 22), tomorrow, onwards, evidence }
}

/** Path 2 — free speech. Lexical scoring + softmax calibration. */
export function fromUtterance(text) {
  const scores = {}
  const evidence = {}

  for (const [intent, patterns] of Object.entries(LEX)) {
    let s = 0
    const hits = []
    for (const [re, w, why] of patterns) {
      const m = text.match(re)
      if (m) { s += w; hits.push({ phrase: m[0], weight: w, why }) }
    }
    scores[intent] = s
    evidence[intent] = hits
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [topIntent, topScore] = entries[0]

  if (topScore < 1.0) {
    return {
      intent: INTENTS.UNCLEAR, confidence: 0, source: 'model',
      sourceLabel: 'Vaani NLU · demo model', evidence: [], slot: null, raw: text,
      needsReview: true, alternatives: [],
    }
  }

  // Softmax over intent scores → a calibrated confidence rather than a raw sum.
  const TEMP = 1.25
  const exps = entries.map(([k, v]) => [k, Math.exp(v / TEMP)])
  const Z = exps.reduce((s, [, v]) => s + v, 0)
  const probs = Object.fromEntries(exps.map(([k, v]) => [k, v / Z]))

  const win = topIntent === INTENTS.RESCHEDULE ? extractWindow(text) : null

  return {
    intent: topIntent,
    confidence: probs[topIntent],
    source: 'model',
    sourceLabel: 'Vaani NLU · demo model',
    evidence: evidence[topIntent],
    window: win,
    slot: null,
    raw: text,
    needsReview: probs[topIntent] < CONFIDENCE_FLOOR,
    alternatives: entries.slice(1, 3).filter(([, v]) => v > 0).map(([k]) => ({ intent: k, confidence: probs[k] })),
  }
}

/** Snap an extracted window onto the slots we can actually operate. */
export function matchSlot(window, slots) {
  if (!window) return null
  const targetDay = window.tomorrow ? 1 : 0
  let best = null, bestGap = Infinity
  slots.forEach((s, i) => {
    const sDay = s.start >= 1440 ? 1 : 0
    if (sDay !== targetDay) return
    const gap = Math.abs(s.start % 1440 - window.startHour * 60)
    if (gap < bestGap) { bestGap = gap; best = s }
  })
  return bestGap <= 120 ? best : null
}
