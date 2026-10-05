// ─────────────────────────────────────────────────────────────────────────────
// The one state machine. Customer, hub, rider and tracking are four VIEWS of
// this object — none of them holds private state, and none of them can reach a
// state the others disagree with.
//
// Every transition is guarded. `can()` is used by the reducer AND by the UI, so
// a disallowed action is a disabled button, never a thrown error or a silent
// impossible state.
// ─────────────────────────────────────────────────────────────────────────────

import { T, SIGNALS, ATTEMPT_EVIDENCE, FAKE_EVIDENCE, ORDER, SLOTS, PICKUP_POINT, UNIT } from './scenario.js'
import { scoreDelivery, withConfirmedSlot } from '../ai/deliveryModel.js'
import { scoreIntegrity } from '../ai/integrity.js'
import { chooseRung, holdDays } from '../ai/ladder.js'
import { fromTap, fromUtterance, matchSlot, INTENTS } from '../ai/intent.js'

export const PHASE = {
  ATTEMPT_FAILED: 'ATTEMPT_FAILED',
  NDR_LOGGED: 'NDR_LOGGED',
  OUTREACH_SENT: 'OUTREACH_SENT',
  SMS_SENT: 'SMS_SENT',
  VOICE_CALLING: 'VOICE_CALLING',
  RESOLVED: 'RESOLVED',
  RIDER_ON_WAY: 'RIDER_ON_WAY',
  RIDER_ARRIVED: 'RIDER_ARRIVED',
  DELIVERED: 'DELIVERED',
  PICKUP_READY: 'PICKUP_READY',
  COLLECTED: 'COLLECTED',
  SLOT_MISSED: 'SLOT_MISSED',
  LADDER: 'LADDER',
  CLOSED: 'CLOSED',
}

/** Terminal phases — nothing may be scheduled, paid for or re-attempted after these. */
const TERMINAL = [PHASE.DELIVERED, PHASE.COLLECTED, PHASE.CLOSED]
export const isTerminal = (s) => TERMINAL.includes(s.phase)

export const MAX_RESCHEDULES = 1

export function initialState() {
  return {
    clock: T.ATTEMPT_FAIL,
    phase: PHASE.ATTEMPT_FAILED,
    attemptEvidence: ATTEMPT_EVIDENCE,
    signals: { ...SIGNALS },
    attempts: 1,
    contactLadder: [],
    customerChoice: null,
    aiIntent: null,
    slot: null,
    rescheduleCount: 0,
    paymentMode: ORDER.paymentMode,
    amountPaid: 0,
    pickup: null,
    declined: false,
    disputed: false,
    rider: { status: 'IDLE', cantDeliverReason: null },
    addressIssue: false,
    ladder: null,
    events: [ev(T.ATTEMPT_FAIL, 'rider', 'Delivery attempt failed', 'Rider marked: customer unavailable', 'bad')],
    toast: null,
  }
}

function ev(at, actor, title, detail, tone = 'neutral') {
  return { id: `${at}-${title}-${Math.random().toString(36).slice(2, 7)}`, at, actor, title, detail, tone }
}

// ── Guards ───────────────────────────────────────────────────────────────────
export function can(s, action) {
  switch (action) {
    case 'LOG_NDR':        return s.phase === PHASE.ATTEMPT_FAILED
    case 'SEND_WHATSAPP':  return s.phase === PHASE.NDR_LOGGED
    case 'CUSTOMER_TAP':
      // Only while an outreach channel is open and nothing is settled yet.
      return [PHASE.OUTREACH_SENT, PHASE.SMS_SENT].includes(s.phase) && !isTerminal(s)
    case 'RESCHEDULE':
      return can(s, 'CUSTOMER_TAP') && s.rescheduleCount < MAX_RESCHEDULES
    case 'NO_REPLY_WA':    return s.phase === PHASE.OUTREACH_SENT
    case 'NO_REPLY_SMS':   return s.phase === PHASE.SMS_SENT
    case 'VOICE_ANSWER':   return s.phase === PHASE.VOICE_CALLING
    case 'RIDER_START':
      // A rider may only set off for a parcel that has been rescheduled to a
      // slot, and not before the slot is within reach.
      return s.phase === PHASE.RESOLVED && s.customerChoice?.type === 'RESCHEDULE'
             && s.rider.status === 'ASSIGNED' && s.clock >= (s.slot?.start ?? Infinity) - 45
    case 'RIDER_ARRIVE':   return s.phase === PHASE.RIDER_ON_WAY
    case 'RIDER_DELIVER':
      // Never before arriving, and never outside the window the customer chose.
      return s.phase === PHASE.RIDER_ARRIVED && s.clock >= (s.slot?.start ?? 0)
    case 'RIDER_CANT':     return [PHASE.RIDER_ON_WAY, PHASE.RIDER_ARRIVED].includes(s.phase)
    case 'COLLECT':        return s.phase === PHASE.PICKUP_READY
    case 'MISS_SLOT':      return [PHASE.RIDER_ON_WAY, PHASE.RIDER_ARRIVED].includes(s.phase)
    default: return false
  }
}

// ── Derived selectors — every screen reads these, nobody recomputes ──────────
export const tPlus = (s) => {
  const d = s.clock - T.ATTEMPT_FAIL
  if (d < 60) return `T+${d}`
  const h = Math.floor(d / 60), m = d % 60
  return m ? `T+${h}h ${m}m` : `T+${h}h`
}

export const risk = (s) =>
  scoreDelivery(s.slot ? withConfirmedSlot(s.signals) : s.signals)

export const integrity = (s) => scoreIntegrity(s.attemptEvidence)

/** Which choices this customer is offered — straight from the deck's table. */
export function offeredChoices(s) {
  const flagged = integrity(s).status === 'FLAGGED'
  const out = []
  if (s.rescheduleCount < MAX_RESCHEDULES) out.push('RESCHEDULE')
  out.push('PICKUP')
  if (s.paymentMode === 'COD') out.push('PAY_NOW')
  return { choices: out, askedAboutVisit: flagged, voiceAtT45: flagged }
}

export function ladderContext(s) {
  return {
    reachable: !!s.customerChoice || s.phase !== PHASE.LADDER,
    wantsIt: !s.declined,
    canRetryLocally: s.rescheduleCount < MAX_RESCHEDULES,
    kiranaWithinM: 600,
    sized: ORDER.sized,
    sealed: ORDER.sealed,
    nearbyDemand3d: false,
    resaleDiscount: 60,
    resaleLikely: true,
    backhaulSlot: '10:40 PM',
    cod: s.paymentMode === 'COD',
  }
}

// ── Reducer ──────────────────────────────────────────────────────────────────
export function reducer(s, a) {
  switch (a.type) {

    case 'RESET': return initialState()

    case 'SET_EVIDENCE':
      return { ...s, attemptEvidence: a.fake ? FAKE_EVIDENCE : ATTEMPT_EVIDENCE }

    case 'ADVANCE':
      return { ...s, clock: s.clock + a.minutes }

    case 'SET_CLOCK':
      return { ...s, clock: Math.max(s.clock, a.clock) }

    case 'TOAST':
      return { ...s, toast: a.message ? { message: a.message, tone: a.tone || 'neutral', id: Math.random() } : null }

    // ── T+2 · NDR logged, attempt scored ──────────────────────────────────
    case 'LOG_NDR': {
      if (!can(s, 'LOG_NDR')) return s
      const ig = scoreIntegrity(s.attemptEvidence)
      return {
        ...s,
        clock: Math.max(s.clock, T.NDR_LOGGED),
        phase: PHASE.NDR_LOGGED,
        events: [...s.events,
          ev(T.NDR_LOGGED, 'system', 'NDR logged', 'Reason code: customer unavailable'),
          ev(T.NDR_LOGGED, 'ai', `Attempt integrity: ${ig.status}`,
             `${ig.passedCount} of ${ig.total} checks passed · ${ig.action}`,
             ig.verified ? 'ok' : 'warn'),
        ],
      }
    }

    // ── T+30 · WhatsApp goes out ──────────────────────────────────────────
    case 'SEND_WHATSAPP': {
      if (!can(s, 'SEND_WHATSAPP')) return s
      return {
        ...s,
        clock: Math.max(s.clock, T.OUTREACH),
        phase: PHASE.OUTREACH_SENT,
        contactLadder: [{ channel: 'WhatsApp', at: T.OUTREACH, status: 'delivered', cost: UNIT.whatsappPerNdr }],
        events: [...s.events, ev(T.OUTREACH, 'system', 'Customer reached on WhatsApp', 'Three choices sent · utility template', 'ok')],
      }
    }

    // ── Customer taps a choice ────────────────────────────────────────────
    case 'CUSTOMER_TAP': {
      if (!can(s, 'CUSTOMER_TAP')) return s
      const via = s.phase === PHASE.SMS_SENT ? 'SMS link' : 'WhatsApp'
      const at = s.clock

      if (a.choice === 'RESCHEDULE') {
        if (!can(s, 'RESCHEDULE')) return { ...s, toast: { message: 'Only one reschedule is allowed per order.', tone: 'warn', id: Math.random() } }
        const slot = a.slot
        const parsed = fromTap('RESCHEDULE', { slot })
        return {
          ...s, phase: PHASE.RESOLVED, slot,
          customerChoice: { type: 'RESCHEDULE', payload: slot, at, via },
          aiIntent: parsed,
          rescheduleCount: s.rescheduleCount + 1,
          rider: { ...s.rider, status: 'ASSIGNED' },
          contactLadder: markReplied(s.contactLadder, at),
          events: [...s.events,
            ev(at, 'customer', 'Customer chose: reschedule', `${slot.label} · ${slot.window}`, 'ok'),
            ev(at, 'ai', 'Intent: RESCHEDULE', 'Tapped — deterministic, no inference'),
            ev(at + 1, 'system', 'Slot locked and sent to NIS', 'Rider notified · customer confirmed', 'ok'),
          ],
        }
      }

      if (a.choice === 'PICKUP') {
        // Collection at a kirana is rung 2 of the recovery ladder — show it as such.
        const pick = chooseRung({ ...ladderContext(s), reachable: true, wantsIt: true, canRetryLocally: false })
        return {
          ...s, phase: PHASE.PICKUP_READY,
          ladder: { ...pick, reason: 'Customer chose to collect nearby', hold: null },
          pickup: { ...PICKUP_POINT, readyAt: at + 120 },
          customerChoice: { type: 'PICKUP', payload: PICKUP_POINT, at, via },
          aiIntent: fromTap('PICKUP'),
          rider: { ...s.rider, status: 'DIVERT_KIRANA' },
          contactLadder: markReplied(s.contactLadder, at),
          events: [...s.events,
            ev(at, 'customer', 'Customer chose: collect nearby', `${PICKUP_POINT.name} · ${PICKUP_POINT.distanceKm} km`, 'ok'),
            ev(at, 'ai', 'Intent: PICKUP', 'Tapped — deterministic, no inference'),
            ev(at + 1, 'system', 'Parcel diverted to kirana', `Rung 2 · ₹${UNIT.kiranaCod} · 48-hour window`, 'ok'),
          ],
        }
      }

      if (a.choice === 'PAY_NOW') {
        const amount = ORDER.price - ORDER.prepaidDiscount
        return {
          ...s, phase: PHASE.RESOLVED,
          paymentMode: 'PREPAID', amountPaid: amount,
          signals: { ...s.signals, cod: false },
          slot: SLOTS[0],
          customerChoice: { type: 'PAY_NOW', payload: { amount, saved: ORDER.prepaidDiscount }, at, via },
          aiIntent: fromTap('PAY_NOW'),
          rescheduleCount: s.rescheduleCount,
          rider: { ...s.rider, status: 'ASSIGNED' },
          contactLadder: markReplied(s.contactLadder, at),
          events: [...s.events,
            ev(at, 'customer', 'Customer paid online', `₹${amount} paid · ₹${ORDER.prepaidDiscount} saved`, 'ok'),
            ev(at, 'ai', 'Intent: PAY_NOW', 'Tapped — deterministic, no inference'),
            ev(at + 1, 'system', 'COD → prepaid', 'Re-attempt booked for today, 6–8 PM', 'ok'),
          ],
        }
      }

      if (a.choice === 'DECLINE') {
        const ctx = { ...ladderContext(s), reachable: true, wantsIt: false }
        const pick = chooseRung(ctx)
        return {
          ...s, phase: PHASE.LADDER, declined: true,
          customerChoice: { type: 'DECLINE', payload: null, at, via },
          aiIntent: fromTap('DECLINE'),
          ladder: { ...pick, reason: 'Customer no longer wants the order', hold: null },
          rider: { ...s.rider, status: 'STOOD_DOWN' },
          contactLadder: markReplied(s.contactLadder, at),
          events: [...s.events,
            ev(at, 'customer', "Customer: I don't want it", 'Order declined', 'warn'),
            ev(at, 'ai', 'Intent: DECLINE', 'Tapped — deterministic, no inference'),
            ev(at + 1, 'system', 'All further contact stopped', 'No re-attempt, no reminders', 'warn'),
            ev(at + 2, 'system', `Recovery ladder → rung ${pick.rung.n}`, `${pick.rung.name} · ₹${pick.cost} vs ₹${UNIT.reverse} reverse`, 'ok'),
          ],
        }
      }
      return s
    }

    // ── Fallback channel ladder ───────────────────────────────────────────
    case 'NO_REPLY_WA': {
      if (!can(s, 'NO_REPLY_WA')) return s
      const at = T.SMS_FALLBACK
      return {
        ...s, clock: Math.max(s.clock, at), phase: PHASE.SMS_SENT,
        contactLadder: [
          { ...s.contactLadder[0], status: 'no response' },
          { channel: 'SMS', at, status: 'delivered', cost: 0.12 },
        ],
        events: [...s.events,
          ev(at, 'system', 'No reply on WhatsApp', 'Escalated to SMS with the same three choices', 'warn'),
        ],
      }
    }

    case 'NO_REPLY_SMS': {
      if (!can(s, 'NO_REPLY_SMS')) return s
      const at = T.VOICE_CALL
      return {
        ...s, clock: Math.max(s.clock, at), phase: PHASE.VOICE_CALLING,
        contactLadder: [
          s.contactLadder[0],
          { ...s.contactLadder[1], status: 'no response' },
          { channel: 'Voice (Vaani)', at, status: 'calling', cost: UNIT.voicePerCall },
        ],
        events: [...s.events,
          ev(at, 'system', 'No reply on SMS', 'Automated voice call placed — Vaani, in Hindi', 'warn'),
        ],
      }
    }

    // ── The customer SPEAKS — the one place free text exists ──────────────
    case 'VOICE_ANSWER': {
      if (!can(s, 'VOICE_ANSWER')) return s
      const at = s.clock
      const parsed = fromUtterance(a.utterance)
      const ladder = [...s.contactLadder]
      ladder[2] = { ...ladder[2], status: 'answered' }

      const base = {
        ...s, contactLadder: ladder, aiIntent: parsed,
        events: [...s.events,
          ev(at, 'customer', 'Customer answered the call', `"${a.utterance}"`, 'ok'),
          ev(at, 'ai', `Vaani NLU → ${parsed.intent}`,
             `Confidence ${parsed.confidence.toFixed(2)}${parsed.needsReview ? ' · below floor, sent to ops' : ''}`,
             parsed.needsReview ? 'warn' : 'ok'),
        ],
      }

      if (parsed.needsReview) {
        return { ...base, toast: { message: 'Low confidence — routed to a human agent', tone: 'warn', id: Math.random() } }
      }

      if (parsed.intent === INTENTS.RESCHEDULE) {
        const slot = matchSlot(parsed.window, SLOTS) || SLOTS[0]
        if (s.rescheduleCount >= MAX_RESCHEDULES) return base
        return {
          ...base, phase: PHASE.RESOLVED, slot,
          rescheduleCount: s.rescheduleCount + 1,
          customerChoice: { type: 'RESCHEDULE', payload: slot, at, via: 'Voice' },
          rider: { ...s.rider, status: 'ASSIGNED' },
          events: [...base.events, ev(at + 1, 'system', 'Slot locked and sent to NIS', `${slot.label} · ${slot.window}`, 'ok')],
        }
      }
      if (parsed.intent === INTENTS.PICKUP) {
        const pickK = chooseRung({ ...ladderContext(s), reachable: true, wantsIt: true, canRetryLocally: false })
        return {
          ...base, phase: PHASE.PICKUP_READY, pickup: { ...PICKUP_POINT, readyAt: at + 120 },
          ladder: { ...pickK, reason: 'Customer chose to collect nearby', hold: null },
          customerChoice: { type: 'PICKUP', payload: PICKUP_POINT, at, via: 'Voice' },
          rider: { ...s.rider, status: 'DIVERT_KIRANA' },
          events: [...base.events, ev(at + 1, 'system', 'Parcel diverted to kirana', `${PICKUP_POINT.name} · 48-hour window`, 'ok')],
        }
      }
      if (parsed.intent === INTENTS.DECLINE) {
        const pick = chooseRung({ ...ladderContext(s), reachable: true, wantsIt: false })
        return {
          ...base, phase: PHASE.LADDER, declined: true,
          customerChoice: { type: 'DECLINE', payload: null, at, via: 'Voice' },
          ladder: { ...pick, reason: 'Customer declined on the voice call', hold: null },
          rider: { ...s.rider, status: 'STOOD_DOWN' },
          events: [...base.events,
            ev(at + 1, 'system', 'All further contact stopped', 'No re-attempt, no reminders', 'warn'),
            ev(at + 2, 'system', `Recovery ladder → rung ${pick.rung.n}`, pick.rung.name, 'ok')],
        }
      }
      if (parsed.intent === INTENTS.DISPUTE_ATTEMPT) {
        return {
          ...base, disputed: true, attemptEvidence: FAKE_EVIDENCE,
          events: [...base.events,
            ev(at + 1, 'system', 'Customer disputes the attempt', 'Attempt re-scored with the customer statement', 'warn'),
            ev(at + 2, 'ai', 'Attempt integrity: FLAGGED', 'Re-queued for tomorrow · no rider penalty · hub review', 'warn')],
          toast: { message: 'Attempt flagged — the customer’s reply audits the rider', tone: 'warn', id: Math.random() },
        }
      }
      return base
    }

    case 'NO_ANSWER_VOICE': {
      if (s.phase !== PHASE.VOICE_CALLING) return s
      const at = T.LADDER_DEFAULT
      const pick = chooseRung({ ...ladderContext(s), reachable: false, wantsIt: false })
      const hold = holdDays(risk(s).p)
      const ladder = [...s.contactLadder]
      ladder[2] = { ...ladder[2], status: 'no answer' }
      return {
        ...s, clock: Math.max(s.clock, at), phase: PHASE.LADDER,
        contactLadder: ladder,
        ladder: { ...pick, reason: 'No response on any channel', hold },
        rider: { ...s.rider, status: 'STOOD_DOWN' },
        events: [...s.events,
          ev(at, 'system', 'No response on any channel', 'Contact ladder exhausted — no further messages', 'warn'),
          ev(at, 'ai', `Recovery ladder → rung ${pick.rung.n}`,
             `${pick.rung.name} · hold ${hold.days} days · ₹${pick.cost} vs ₹${UNIT.reverse}`, 'ok')],
      }
    }

    // ── Rider ─────────────────────────────────────────────────────────────
    case 'RIDER_START': {
      if (!can(s, 'RIDER_START')) return s
      const at = s.clock
      return {
        ...s, phase: PHASE.RIDER_ON_WAY, rider: { ...s.rider, status: 'ON_THE_WAY' },
        events: [...s.events,
          ev(at, 'rider', 'Rider started delivery', 'Navigation started · customer notified', 'ok')],
      }
    }

    case 'RIDER_ARRIVE': {
      if (!can(s, 'RIDER_ARRIVE')) return s
      const at = Math.max(s.clock, (s.slot?.start ?? s.clock) + 8)
      return {
        ...s, clock: at, phase: PHASE.RIDER_ARRIVED, rider: { ...s.rider, status: 'ARRIVED' },
        events: [...s.events, ev(at, 'rider', 'Rider reached the address', 'Inside the chosen window', 'ok')],
      }
    }

    case 'RIDER_DELIVER': {
      if (!can(s, 'RIDER_DELIVER')) return s
      const at = s.clock
      const saved = UNIT.reverse
      return {
        ...s, phase: PHASE.DELIVERED, rider: { ...s.rider, status: 'DONE' },
        events: [...s.events,
          ev(at, 'rider', 'Delivered', `${s.paymentMode === 'PREPAID' ? 'Prepaid' : `₹${ORDER.price} collected in cash`}`, 'ok'),
          ev(at, 'system', 'NDR closed — recovered', `Reverse trip avoided · ₹${saved} (case-pack unit cost)`, 'ok')],
      }
    }

    case 'RIDER_CANT': {
      if (!can(s, 'RIDER_CANT')) return s
      const at = s.clock
      const reason = a.reason
      const routes = {
        UNAVAILABLE: { phase: PHASE.SLOT_MISSED, title: 'Customer unavailable again', detail: 'Second failure — reschedule limit reached' },
        ADDRESS:     { phase: PHASE.LADDER,      title: 'Address could not be found', detail: 'Routed to address verification · ₹8 Vaani call to confirm the door' },
        REFUSED:     { phase: PHASE.LADDER,      title: 'Customer refused the parcel',  detail: 'Refusal handling · no further contact' },
        VEHICLE:     { phase: PHASE.RESOLVED,    title: 'Rider vehicle issue',          detail: 'Parcel reassigned to another rider — same slot held' },
        OTHER:       { phase: PHASE.LADDER,      title: 'Other reason',                 detail: 'Sent to hub for manual review' },
      }
      const r = routes[reason] || routes.OTHER

      if (reason === 'VEHICLE') {
        return {
          ...s, phase: PHASE.RESOLVED, rider: { status: 'ASSIGNED', cantDeliverReason: reason },
          events: [...s.events, ev(at, 'rider', r.title, r.detail, 'warn')],
          toast: { message: 'Reassigned to another rider — the slot is unchanged', tone: 'neutral', id: Math.random() },
        }
      }
      if (reason === 'UNAVAILABLE') return reducer({ ...s, rider: { ...s.rider, cantDeliverReason: reason } }, { type: 'MISS_SLOT' })

      const declined = reason === 'REFUSED'
      // An address problem is a problem with the DOOR, not with the customer —
      // they stay reachable and still want the parcel, so the ladder keeps the
      // collection rung open and we queue a ₹8 call to fix the address (#9).
      const stillWants = !declined
      const pick = chooseRung({ ...ladderContext(s), reachable: true, wantsIt: stillWants })
      const extra = reason === 'ADDRESS'
        ? [ev(at + 1, 'system', 'Address verification queued',
             `₹${UNIT.voicePerCall} Vaani call to confirm the door · GeoIndia cell flagged for correction`, 'warn')]
        : []
      return {
        ...s, phase: PHASE.LADDER, declined, attempts: s.attempts + 1,
        addressIssue: reason === 'ADDRESS',
        rider: { status: 'STOOD_DOWN', cantDeliverReason: reason },
        ladder: { ...pick, reason: r.title, hold: holdDays(risk(s).p) },
        events: [...s.events,
          ev(at, 'rider', r.title, r.detail, 'warn'),
          ...extra,
          ev(at + 2, 'ai', `Recovery ladder → rung ${pick.rung.n}`, `${pick.rung.name} · ₹${pick.cost}`, 'ok')],
      }
    }

    // ── The customer misses the slot they chose ───────────────────────────
    case 'MISS_SLOT': {
      if (!can(s, 'MISS_SLOT') && s.phase !== PHASE.RESOLVED) return s
      const at = Math.max(s.clock, (s.slot?.end ?? s.clock))
      const pick = chooseRung({ ...ladderContext(s), reachable: true, wantsIt: true })
      const hold = holdDays(risk(s).p)
      return {
        ...s, clock: at, phase: PHASE.SLOT_MISSED, attempts: s.attempts + 1,
        rider: { ...s.rider, status: 'STOOD_DOWN' },
        ladder: { ...pick, reason: 'Missed the rescheduled slot', hold },
        events: [...s.events,
          ev(at, 'rider', 'Second attempt failed', 'Customer not available in the chosen slot', 'bad'),
          ev(at, 'system', 'Reschedule limit reached', 'One reschedule per order — no further slots offered', 'warn'),
          ev(at + 1, 'ai', `Recovery ladder → rung ${pick.rung.n}`,
             `${pick.rung.name} · collect within 48 h, then rungs 3–5`, 'ok')],
      }
    }

    case 'COLLECT': {
      if (!can(s, 'COLLECT')) return s
      const at = s.clock
      return {
        ...s, phase: PHASE.COLLECTED,
        events: [...s.events,
          ev(at, 'customer', 'Collected from Sharma Kirana', `OTP ${PICKUP_POINT.otp} verified · ₹${ORDER.price} paid`, 'ok'),
          ev(at, 'system', 'NDR closed — recovered at rung 2', `₹${UNIT.kiranaCod} vs ₹${UNIT.reverse} reverse`, 'ok')],
      }
    }

    case 'CLOSE_LADDER': {
      if (s.phase !== PHASE.LADDER && s.phase !== PHASE.SLOT_MISSED) return s
      return {
        ...s, phase: PHASE.CLOSED,
        events: [...s.events, ev(s.clock, 'system', 'Parcel closed on the ladder',
          `${s.ladder?.rung?.name ?? 'Recovery ladder'} · ₹${s.ladder?.cost ?? UNIT.ladderBlended} recovered cost`, 'ok')],
      }
    }

    default: return s
  }
}

function markReplied(ladder, at) {
  if (!ladder.length) return ladder
  const copy = [...ladder]
  const idx = copy.findIndex((c) => c.status === 'delivered' || c.status === 'calling')
  if (idx >= 0) copy[idx] = { ...copy[idx], status: 'replied', repliedAt: at }
  return copy
}
