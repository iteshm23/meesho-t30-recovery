import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect, useRef } from 'react'
import { reducer, initialState, PHASE, can } from './machine.js'
import { SLOTS, T } from './scenario.js'

const Ctx = createContext(null)
export const useDemo = () => useContext(Ctx)

/**
 * The scripted happy path. Each step carries `applies()`, so the Next button is
 * derived from the CURRENT state rather than a counter — the presenter can drive
 * the screens by hand and the button stays correct.
 */
export const SCRIPT = [
  { label: 'Log the NDR',          hint: 'T+2 · reason code + attempt integrity', action: { type: 'LOG_NDR' },
    applies: (s) => can(s, 'LOG_NDR') },
  { label: 'Reach the customer',   hint: 'T+30 · WhatsApp with three choices',    action: { type: 'SEND_WHATSAPP' },
    applies: (s) => can(s, 'SEND_WHATSAPP') },
  { label: 'Customer reschedules', hint: 'Taps “Today, 6–8 PM”',                  action: { type: 'CUSTOMER_TAP', choice: 'RESCHEDULE', slot: SLOTS[0] },
    applies: (s) => can(s, 'RESCHEDULE') },
  { label: 'Jump to 5:20 PM',      hint: 'Rider can now set off',                 action: { type: 'SET_CLOCK', clock: 17 * 60 + 20 },
    applies: (s) => s.phase === PHASE.RESOLVED && !!s.slot && s.clock < s.slot.start - 45 },
  { label: 'Rider starts',         hint: 'On the way · customer notified',        action: { type: 'RIDER_START' },
    applies: (s) => can(s, 'RIDER_START') },
  { label: 'Rider arrives',        hint: 'Inside the chosen window',              action: { type: 'RIDER_ARRIVE' },
    applies: (s) => can(s, 'RIDER_ARRIVE') },
  { label: 'Delivered',            hint: 'NDR closed — recovered',                action: { type: 'RIDER_DELIVER' },
    applies: (s) => s.phase === PHASE.RIDER_ARRIVED },
]

/** One-click jumps for Q&A. Each replays a clean sequence from reset. */
export const SCENARIOS = {
  reschedule: { name: 'Reschedule', seq: [{ type: 'LOG_NDR' }, { type: 'SEND_WHATSAPP' }] },
  pickup:     { name: 'Collect nearby', seq: [{ type: 'LOG_NDR' }, { type: 'SEND_WHATSAPP' }, { type: 'CUSTOMER_TAP', choice: 'PICKUP' }] },
  paynow:     { name: 'Pay now & retry', seq: [{ type: 'LOG_NDR' }, { type: 'SEND_WHATSAPP' }, { type: 'CUSTOMER_TAP', choice: 'PAY_NOW' }] },
  silence:    { name: 'No response', seq: [{ type: 'LOG_NDR' }, { type: 'SEND_WHATSAPP' }, { type: 'NO_REPLY_WA' }, { type: 'NO_REPLY_SMS' }] },
  decline:    { name: "Doesn't want it", seq: [{ type: 'LOG_NDR' }, { type: 'SEND_WHATSAPP' }, { type: 'CUSTOMER_TAP', choice: 'DECLINE' }] },
  missed:     { name: 'Misses the slot', seq: [{ type: 'LOG_NDR' }, { type: 'SEND_WHATSAPP' }, { type: 'CUSTOMER_TAP', choice: 'RESCHEDULE', slot: SLOTS[0] }, { type: 'SET_CLOCK', clock: 1040 }, { type: 'RIDER_START' }, { type: 'MISS_SLOT' }] },
  fake:       { name: 'Fake attempt', seq: [{ type: 'SET_EVIDENCE', fake: true }, { type: 'LOG_NDR' }, { type: 'SEND_WHATSAPP' }] },
}

export function DemoProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [busy, setBusy] = React.useState(null)   // label of an in-flight "AI thinking" beat
  const timers = useRef([])

  // Derived, not counted: whichever scripted step the current state allows.
  const stepIndex = SCRIPT.findIndex((x) => x.applies(state))
  const nextStep = stepIndex >= 0 ? SCRIPT[stepIndex] : null

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => () => clearTimers(), [])

  /** Dispatch with an optional short "system is working" beat, so state changes read. */
  const run = useCallback((action, { thinking = null, delay = 0 } = {}) => {
    if (thinking) {
      setBusy(thinking)
      const t = setTimeout(() => { setBusy(null); dispatch(action) }, delay || 850)
      timers.current.push(t)
    } else dispatch(action)
  }, [])

  const next = useCallback(() => {
    // Ignore a second press while a step is mid-flight, otherwise the next step
    // would be computed from state the in-flight dispatch has not reached yet.
    if (busy || !nextStep) return
    run(nextStep.action, nextStep.action.type === 'SEND_WHATSAPP'
      ? { thinking: 'Composing the recovery message…', delay: 700 } : {})
  }, [nextStep, run, busy])

  const reset = useCallback(() => { clearTimers(); setBusy(null); dispatch({ type: 'RESET' }) }, [])

  const jump = useCallback((key) => {
    clearTimers(); setBusy(null)
    dispatch({ type: 'RESET' })
    const seq = SCENARIOS[key]?.seq || []
    seq.forEach((a, i) => { const t = setTimeout(() => dispatch(a), 40 * (i + 1)); timers.current.push(t) })
  }, [])

  const value = useMemo(() => ({
    state, dispatch, run, busy, setBusy, next, reset, jump,
    scriptDone: !nextStep,
    nextStep,
    can: (a) => can(state, a),
  }), [state, busy, nextStep, run, next, reset, jump])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
