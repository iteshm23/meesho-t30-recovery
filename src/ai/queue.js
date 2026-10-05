// ─────────────────────────────────────────────────────────────────────────────
// Today's NDR queue, ranked by where an intervention is actually worth making.
//
//   priority = (1 − P(deliver)) × ₹reverse × P(reach the customer)
//
// i.e. how much reverse cost is at risk, discounted by how likely we are to be
// able to do anything about it. An unreachable customer with a doomed parcel
// is worth less of our ₹8 voice budget than a reachable one.
//
// The queue is generated from a seeded PRNG so it is identical on every reload
// — a demo must not reshuffle between runs.
// ─────────────────────────────────────────────────────────────────────────────

import { scoreDelivery } from './deliveryModel.js'
import { scoreIntegrity } from './integrity.js'
import { UNIT, ORDER } from '../demo/scenario.js'

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PRODUCTS = [
  ['Cotton Kurti Set', 'Size M', 449, false], ['Steel Lunch Box', '3 Pc', 289, false],
  ['Wall Clock', 'Round', 349, false], ['Bluetooth Earbuds', 'Black', 699, false],
  ['Kids School Bag', '18 in', 529, false], ['Bedsheet Double', 'Floral', 399, false],
  ['Running Shoes', 'Size 8', 299, true], ['Saree Georgette', 'Maroon', 649, false],
  ['Kitchen Rack', '2 Tier', 459, false], ['Mobile Cover', 'Clear', 149, false],
]
const AREAS = ['Kalyanpur', 'Govind Nagar', 'Swaroop Nagar', 'Barra', 'Kidwai Nagar', 'Panki', 'Shyam Nagar', 'Naubasta']
const NAMES = ['Anjali', 'Ramesh', 'Sunita', 'Imran', 'Pooja', 'Dinesh', 'Kavita', 'Rohit', 'Meena', 'Sanjay', 'Priya', 'Arun']

export function buildQueue(seed = 20260514) {
  const rnd = mulberry32(seed)
  const rows = []

  for (let i = 0; i < 47; i++) {
    const [product, variant, price, sized] = PRODUCTS[Math.floor(rnd() * PRODUCTS.length)]
    const cod = rnd() < 0.8
    const priorNdrCount = rnd() < 0.25 ? 1 : 0
    const addressConfidence = rnd() < 0.2 ? 'low' : rnd() < 0.55 ? 'medium' : 'high'
    const { p, band } = scoreDelivery({
      cod, priorNdrCount, addressConfidence, slotConfirmed: false,
      highValue: price > 1000, festivePeak: false,
    })

    // Reachability: phone verified + app-active + answered us before.
    const reach = Math.min(0.95, 0.35 + (rnd() * 0.6))

    // 3 flagged attempts today — seeded at fixed indices so the count is stable.
    const flagged = [6, 19, 33].includes(i)
    const integrity = scoreIntegrity(flagged
      ? { gpsDistanceM: 180 + Math.floor(rnd() * 400), geofenceM: 50, dwellSeconds: 8 + Math.floor(rnd() * 30), minDwellSeconds: 90, callPlaced: false, callDurationSeconds: 0, photoCaptured: true }
      : { gpsDistanceM: 4 + Math.floor(rnd() * 40), geofenceM: 50, dwellSeconds: 120 + Math.floor(rnd() * 240), minDwellSeconds: 90, callPlaced: true, callDurationSeconds: 40 + Math.floor(rnd() * 90), photoCaptured: true })

    rows.push({
      id: `#MH${78260000 + Math.floor(rnd() * 99999)}`,
      customer: NAMES[Math.floor(rnd() * NAMES.length)],
      area: AREAS[Math.floor(rnd() * AREAS.length)],
      product, variant, price, sized, cod,
      p, band, reach,
      integrity: integrity.status,
      priority: (1 - p) * UNIT.reverse * reach,
      status: rnd() < 0.45 ? 'Resolved' : rnd() < 0.7 ? 'Awaiting reply' : 'Open',
    })
  }

  rows.sort((a, b) => b.priority - a.priority)
  return rows
}

/** The riskiest 10% get the ₹8 Vaani voice call — the rest get WhatsApp only. */
export function voiceEligible(rows) {
  return Math.max(1, Math.round(rows.length * 0.10))
}

export function queueStats(rows) {
  const voice = voiceEligible(rows)
  return {
    total: rows.length,
    flagged: rows.filter((r) => r.integrity === 'FLAGGED').length,
    voiceQueued: voice,
    resolved: rows.filter((r) => r.status === 'Resolved').length,
    // Channel cost for the whole day's NDR batch, at deck unit rates.
    channelCost: rows.length * UNIT.whatsappPerNdr + voice * UNIT.voicePerCall,
  }
}
