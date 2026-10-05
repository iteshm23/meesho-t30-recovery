// ─────────────────────────────────────────────────────────────────────────────
// ONE order, ONE clock, used by every surface in the prototype.
// Every timestamp anywhere in the app derives from these constants.
// ─────────────────────────────────────────────────────────────────────────────

export const DAY = '14 May'

/** Minutes-since-midnight helpers. The whole app stores time as one number. */
export const hm = (h, m = 0) => h * 60 + m
export const fmtClock = (min) => {
  const t = ((min % 1440) + 1440) % 1440
  const h24 = Math.floor(t / 60), m = t % 60
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`
}
/** "9:41 AM" without the space-saving suffix, for dense ops tables. */
export const fmtShort = (min) => fmtClock(min).replace(' ', '')

export const T = {
  ORDER_PLACED:  { day: '12 May', min: hm(10, 24) },
  SHIPPED:       { day: '13 May', min: hm(19, 18) },
  OUT_FOR_DEL:   { day: DAY,      min: hm(8, 12)  },
  ATTEMPT_FAIL:  hm(9, 41),   // T+0   — rider marks "customer unavailable"
  NDR_LOGGED:    hm(9, 43),   // T+2   — reason code + integrity check
  OUTREACH:      hm(10, 11),  // T+30  — WhatsApp to the customer
  SMS_FALLBACK:  hm(10, 26),  // T+45  — no reply on WhatsApp
  VOICE_CALL:    hm(10, 41),  // T+60  — no reply on SMS, Vaani voice call
  LADDER_DEFAULT:hm(13, 41),  // T+4h  — no reply anywhere, hold at LMDC
}

export const ORDER = {
  id: '#MH7826352190',
  awb: 'VLM4471902883',
  product: "Men's Running Shoes",
  variant: 'Size 9',
  sized: true,              // ← matters: a sized SKU cannot be inventory-netted
  sealed: true,
  category: 'Footwear',
  price: 299,
  prepaidDiscount: 15,
  paymentMode: 'COD',
  customer: {
    name: 'Vinayak',
    phone: '+91 98XXXX4321',
    language: 'Hindi',
    address: 'C314, Hall 1, IIT Kanpur',
    locality: 'Kalyanpur, Kanpur',
    pincode: '208016',
  },
  rider: { name: 'Ramesh K.', id: 'VLM-KNP-2214', vehicle: 'UP78 BX 4412' },
  hub: { lmdc: 'LMDC Kalyanpur', sc: 'Kanpur Destination SC', ops: 'OPS · Kanpur' },
}

/** Signals the models read. Mirrors what Valmo would actually have on hand. */
export const SIGNALS = {
  cod: true,
  priorNdrCount: 1,
  addressConfidence: 'medium',   // GeoIndia H3 cell confidence
  attemptWindow: '10 AM – 6 PM', // standard route window
  slotConfirmed: false,
  highValue: false,              // ₹299 < ₹1,000 threshold
  festivePeak: false,
}

/** The failed attempt as the rider's device recorded it. Feeds #12 integrity. */
export const ATTEMPT_EVIDENCE = {
  gpsDistanceM: 12,       // distance from the geocoded door
  geofenceM: 50,
  dwellSeconds: 260,      // 4 min 20 s
  minDwellSeconds: 90,
  callPlaced: true,
  callDurationSeconds: 72,
  photoCaptured: true,
  markedAt: T.ATTEMPT_FAIL,
}

/** The same attempt, as a *faked* one would look. Used by the integrity scenario. */
export const FAKE_EVIDENCE = {
  gpsDistanceM: 340,
  geofenceM: 50,
  dwellSeconds: 12,
  minDwellSeconds: 90,
  callPlaced: false,
  callDurationSeconds: 0,
  photoCaptured: true,   // a photo alone proves nothing — any door will do
  markedAt: T.ATTEMPT_FAIL,
}

export const PICKUP_POINT = {
  name: 'Sharma Kirana',
  owner: 'Sharma ji',
  distanceKm: 0.6,
  walkMin: 8,
  openUntil: '10 PM',
  address: 'Shop 4, Kalyanpur Main Rd',
  holdHours: 48,
  otp: '4417',
}

/** Slot options the customer can tap. Index 0 is the main demo path. */
export const SLOTS = [
  { id: 's1', label: 'Today',    window: '6:00 PM – 8:00 PM',   short: '6 – 8 PM',   day: DAY, start: hm(18), end: hm(20), recommended: true },
  { id: 's2', label: 'Tomorrow', window: '10:00 AM – 12:00 PM', short: '10 AM – 12 PM', day: '15 May', start: hm(10) + 1440, end: hm(12) + 1440 },
  { id: 's3', label: 'Tomorrow', window: '6:00 PM – 8:00 PM',   short: '6 – 8 PM',   day: '15 May', start: hm(18) + 1440, end: hm(20) + 1440 },
]

/** Case-pack unit economics. Internal only — never shown on a customer screen. */
export const UNIT = {
  forward: 50,
  reverse: 120,
  ladderBlended: 40,
  whatsappPerNdr: 0.145,
  voicePerCall: 8,
  kiranaCod: 8,
  kiranaPrepaid: 18,
  holdAtLmdc: 21,
  netting: 5,
  backhaul: 30,
  liquidationHandling: 21,
  liquidationCapDiscount: 99,
  rackPerDay: 0.67,
  intentDecayPerDay: 0.0325,
}

export const SOURCE = {
  casePack: 'Case pack',
  deck: 'Our model (Round 2 deck)',
  demo: 'Demo model output',
  illustrative: 'Illustrative demo data',
}
