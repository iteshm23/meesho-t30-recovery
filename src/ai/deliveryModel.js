// ─────────────────────────────────────────────────────────────────────────────
// P(deliver) — delivery-probability model for the NEXT attempt on a parcel.
//
// Shape: logistic regression on 7 features. Coefficients below are ILLUSTRATIVE
// (chosen for the demo, not fitted on Meesho data) — every surface that renders
// a number from here labels it "Demo model output".
//
// The point of implementing it properly rather than hard-coding 0.23 is that the
// score MOVES when the parcel's situation moves, and we can show exactly which
// feature moved it. That is what the hub's "why" panel reads from.
// ─────────────────────────────────────────────────────────────────────────────

export const COEF = {
  intercept:        1.20,
  cod:             -0.85,
  priorNdr:        -0.70,   // per prior NDR, capped at 2
  addressMedium:   -0.25,
  addressLow:      -0.55,
  windowMismatch:  -0.60,   // route window vs the customer's known availability
  slotConfirmed:    1.45,   // customer picked this window themselves
  highValue:       -0.20,
  festivePeak:     -0.25,
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z))

/**
 * @returns {{p:number, logit:number, band:string, features:Array}}
 *   features[] carries each term's contribution to the logit, so the UI can
 *   explain the score instead of just asserting it.
 */
export function scoreDelivery(signals) {
  const f = []
  const push = (key, label, active, weight, detail) => {
    if (!active) return
    f.push({ key, label, weight, detail, contribution: weight })
  }

  push('cod', 'Cash on delivery', signals.cod, COEF.cod, 'COD fails 20% vs 5% prepaid')
  const priors = Math.min(signals.priorNdrCount || 0, 2)
  if (priors > 0) {
    f.push({
      key: 'priorNdr',
      label: `Previous failed attempt${priors > 1 ? 's' : ''} (${priors})`,
      weight: COEF.priorNdr * priors,
      detail: 'Repeat NDR on this customer / address',
      contribution: COEF.priorNdr * priors,
    })
  }
  push('addr', 'Address confidence: medium', signals.addressConfidence === 'medium', COEF.addressMedium, 'GeoIndia gives the H3 cell, not the door')
  push('addrLow', 'Address confidence: low', signals.addressConfidence === 'low', COEF.addressLow, 'Pincode-centroid fallback')
  push('window', 'Attempted outside known availability', !signals.slotConfirmed && signals.windowMismatch !== false, COEF.windowMismatch, `Route window ${signals.attemptWindow || '10 AM – 6 PM'}`)
  push('slot', 'Customer confirmed this slot', !!signals.slotConfirmed, COEF.slotConfirmed, 'Window chosen by the customer')
  push('value', 'High-value parcel', !!signals.highValue, COEF.highValue, 'Above ₹1,000')
  push('festive', 'Festive peak window', !!signals.festivePeak, COEF.festivePeak, 'Peak-season RTO distortion')

  const logit = f.reduce((s, x) => s + x.contribution, COEF.intercept)
  const p = sigmoid(logit)
  return { p, logit, band: band(p), features: f, intercept: COEF.intercept }
}

export function band(p) {
  if (p < 0.35) return 'LOW'
  if (p < 0.65) return 'MEDIUM'
  return 'HIGH'
}

export const bandTone = (b) =>
  b === 'LOW' ? 'bad' : b === 'MEDIUM' ? 'warn' : 'ok'

/** Signals as they stand AFTER the customer locks a slot. Drives the live re-score. */
export function withConfirmedSlot(signals) {
  return { ...signals, slotConfirmed: true }
}
