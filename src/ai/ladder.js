// ─────────────────────────────────────────────────────────────────────────────
// Solution #14 — the recovery ladder.
//
// Reverse logistics is the DEFAULT today. The ladder makes it the last resort:
// five rungs, each of which has to earn its place against ₹120 of reverse cost.
//
// Two real pieces of maths live here:
//   1. chooseRung()  — the eligibility tree (deck, Recovery slide)
//   2. holdDays()    — how long to hold before giving up:
//                      days = (p·S − c) / h
//      where S = reverse cost avoided, c = re-attempt cost,
//      h = daily holding cost = rack + intent decay × parcel value.
//
// Unit costs are case-pack / team assumptions from the Round 2 deck, labelled
// as such everywhere they surface.
// ─────────────────────────────────────────────────────────────────────────────

import { UNIT } from '../demo/scenario.js'

export const RUNGS = [
  { n: 1, key: 'HOLD',        name: 'Hold at LMDC, retry locally',        cost: UNIT.holdAtLmdc,  runsOn: 'LMDC + NIS' },
  { n: 2, key: 'KIRANA',      name: 'Kirana collect, 48-hour window',     cost: UNIT.kiranaCod,   runsOn: 'Valmo partner network' },
  { n: 3, key: 'NETTING',     name: 'Inventory netting, credit the seller',cost: UNIT.netting,    runsOn: 'Seller ledger + order routing' },
  { n: 4, key: 'BACKHAUL',    name: 'Backhaul on existing outbound trucks',cost: UNIT.backhaul,   runsOn: 'Line-haul schedule' },
  { n: 5, key: 'LIQUIDATION', name: 'PRISM local liquidation',            cost: UNIT.liquidationHandling, runsOn: 'PRISM feed' },
  { n: 6, key: 'REVERSE',     name: 'Full reverse',                       cost: UNIT.reverse,     runsOn: 'Reverse logistics' },
]

export const rungByKey = (k) => RUNGS.find((r) => r.key === k)

/** Daily cost of holding a parcel: rack space + the intent that decays while it sits. */
export function holdingCostPerDay(parcelValue = UNIT.reverse) {
  return UNIT.rackPerDay + UNIT.intentDecayPerDay * parcelValue
}

/**
 * How many days it is worth holding, given P(deliver).
 * Policy caps it at 3 days by default, 6 when the model is confident.
 */
export function holdDays(p) {
  const S = UNIT.reverse
  const c = UNIT.holdAtLmdc
  const h = holdingCostPerDay()
  const raw = (p * S - c) / h
  const cap = p >= 0.40 ? 6 : 3
  return {
    raw,
    days: Math.max(0, Math.min(Math.round(raw), cap)),
    cap,
    S, c, h,
    formula: `(${p.toFixed(2)} × ₹${S} − ₹${c}) ÷ ₹${h.toFixed(2)} = ${raw.toFixed(1)} days`,
  }
}

/**
 * Walk the eligibility tree. Returns the chosen rung AND every rung we ruled
 * out with the reason, so the hub can show the whole decision, not the verdict.
 */
export function chooseRung(ctx) {
  const steps = []
  const decide = (key, ok, reason) => { steps.push({ key, ok, reason }); return ok }

  // Rung 1 is "hold AND retry". Once the one-reschedule budget is spent there
  // is no retry left to hold for, so the parcel drops to collection instead.
  if (decide('HOLD', !!(ctx.reachable && ctx.wantsIt && ctx.canRetryLocally),
      !ctx.reachable ? 'No response on any channel'
        : !ctx.wantsIt ? 'Customer declined the order'
        : !ctx.canRetryLocally ? 'Reschedule limit reached — no re-attempt left to hold for'
        : 'Customer is reachable and still wants the parcel'))
    return done('HOLD', steps, ctx)

  // Collection needs a customer who is BOTH reachable and still wants the parcel.
  // Someone who said "I don't want it" will never walk to the shop.
  if (decide('KIRANA', !!(ctx.kiranaWithinM && ctx.kiranaWithinM <= 600 && ctx.reachable && ctx.wantsIt),
      !ctx.reachable ? 'Needs a reachable customer to collect'
        : !ctx.wantsIt ? 'Customer declined — collection is not an option'
        : ctx.kiranaWithinM <= 600 ? `Partner ${ctx.kiranaWithinM} m away, inside the 600 m rule`
        : `Nearest partner ${ctx.kiranaWithinM} m away, outside 600 m`))
    return done('KIRANA', steps, ctx)

  if (decide('NETTING', !!(ctx.sealed && !ctx.sized && ctx.nearbyDemand3d),
      ctx.sized ? 'Sized SKU — a size 9 cannot be netted against another order'
        : !ctx.sealed ? 'Parcel not sealed'
        : ctx.nearbyDemand3d ? 'Nearby order for the same SKU within 3 days' : 'No nearby demand in 3 days'))
    return done('NETTING', steps, ctx)

  if (decide('LIQUIDATION', !!(!ctx.sized && ctx.resaleDiscount <= UNIT.liquidationCapDiscount && ctx.resaleLikely),
      ctx.sized ? 'Sized SKU — PRISM liquidation needs a non-sized unit'
        : ctx.resaleDiscount > UNIT.liquidationCapDiscount ? `Discount ₹${ctx.resaleDiscount} above the ₹${UNIT.liquidationCapDiscount} cap`
        : 'No local resale match'))
    return done('LIQUIDATION', steps, ctx)

  if (decide('BACKHAUL', !!ctx.backhaulSlot,
      ctx.backhaulSlot ? `Rides the ${ctx.backhaulSlot} outbound truck's empty return leg` : 'No outbound truck on this lane'))
    return done('BACKHAUL', steps, ctx)

  steps.push({ key: 'REVERSE', ok: true, reason: 'No rung qualifies — full reverse' })
  return done('REVERSE', steps, ctx)
}

function done(key, steps, ctx) {
  const rung = rungByKey(key)
  const cost = key === 'KIRANA' && !ctx.cod ? UNIT.kiranaPrepaid : rung.cost
  return {
    rung,
    cost,
    saved: Math.max(0, UNIT.reverse - cost),
    steps,
    breakEvenSuccess: cost / (cost + UNIT.reverse),
  }
}
