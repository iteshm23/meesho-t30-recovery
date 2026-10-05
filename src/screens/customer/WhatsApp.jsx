import React, { useState, useEffect, useRef } from 'react'
import { useDemo } from '../../demo/DemoContext.jsx'
import { PHASE, offeredChoices, integrity } from '../../demo/machine.js'
import { ORDER, SLOTS, PICKUP_POINT, T, fmtClock } from '../../demo/scenario.js'
import { cx, Thinking } from '../../components/ui.jsx'
import { In, Out, Choice, ProductStrip, MeeshoMark, Ico } from './bits.jsx'

export default function WhatsApp() {
  const { state, dispatch, busy } = useDemo()
  const [sheet, setSheet] = useState(null)   // 'slots' | 'pickup' | 'pay' | 'decline'
  const feed = useRef(null)

  const sent = state.phase !== PHASE.ATTEMPT_FAILED && state.phase !== PHASE.NDR_LOGGED
  const choice = state.customerChoice
  const offered = offeredChoices(state)
  const flagged = integrity(state).status === 'FLAGGED'
  const open = [PHASE.OUTREACH_SENT, PHASE.SMS_SENT].includes(state.phase)

  // Scroll AFTER the new bubble or sheet has been laid out, otherwise we scroll
  // to the old height and the newest content stays below the fold.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => feed.current?.scrollTo({ top: 1e6, behavior: 'smooth' })))
    return () => cancelAnimationFrame(id)
  }, [state.events.length, sheet, busy, state.phase])
  useEffect(() => { if (!open) setSheet(null) }, [open])

  const tap = (choiceKey, slot) => { setSheet(null); dispatch({ type: 'CUSTOMER_TAP', choice: choiceKey, slot }) }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="shrink-0 bg-[#111B21] px-3 pb-2.5 pt-1 text-white">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-white/80" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18 9 12l6-6" /></svg>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white"><MeeshoMark className="h-7 w-7" /></div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[14px] font-semibold leading-tight">Meesho
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#25D366]" fill="currentColor"><path d="M12 2 9.8 4.4 6.6 4l-.5 3.2L3 8.6l1.4 2.9L3 14.4l3.1 1.4.5 3.2 3.2-.4L12 21l2.2-2.4 3.2.4.5-3.2 3.1-1.4-1.4-2.9L21 8.6l-3.1-1.4-.5-3.2-3.2.4Z" /><path d="m10.6 14.6-2.3-2.3 1.1-1.1 1.2 1.2 3.4-3.4 1.1 1.1Z" fill="#111B21" /></svg>
            </p>
            <p className="text-[10.5px] leading-tight text-white/55">Business Account</p>
          </div>
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-white/80" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6.5 3.5 9 9l-2 1.5a12 12 0 0 0 6.5 6.5L15 15l5.5 2.5v3A1.5 1.5 0 0 1 19 22 17 17 0 0 1 2 5a1.5 1.5 0 0 1 1.5-1.5h3Z" /></svg>
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-white/80" fill="currentColor"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
        </div>
      </div>

      {/* Chat */}
      <div ref={feed} className="wa-wall scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-3">
        <div className="flex justify-center">
          <span className="rounded-md bg-[#FFF3C7]/90 px-2.5 py-1 text-[10.5px] text-ink-600 shadow-sm">Messages about your order · Meesho never asks for your PIN or OTP</span>
        </div>

        {!sent && (
          <div className="flex justify-center pt-6">
            <span className="rounded-full bg-black/25 px-3 py-1.5 text-[11px] font-medium text-white">Waiting for the recovery message…</span>
          </div>
        )}

        {sent && (
          <>
            <In at={T.OUTREACH} className="w-[86%]">
              <p className="text-[13.5px] font-semibold leading-snug text-ink-900">Hi {ORDER.customer.name} 👋</p>
              <p className="mt-1 text-[13px] leading-snug text-ink-700">
                We couldn’t deliver your order today — no one was available at <span className="font-semibold text-ink-900">{ORDER.customer.address}</span>.
              </p>
              <div className="mt-2"><ProductStrip order={ORDER} /></div>
              <p className="mt-2 text-[13px] font-semibold leading-snug text-ink-900">What would you like to do?</p>
              <p className="text-[12px] leading-snug text-ink-500">Your parcel is still nearby. Choose one and we’ll take care of it.</p>
            </In>

            {/* Quick replies — large, obvious, no typing anywhere */}
            {open && !sheet && (
              <div className="animate-rise space-y-1.5 pl-1 pr-3 pt-0.5">
                {offered.choices.includes('RESCHEDULE') && (
                  <Choice icon={Ico.calendar} title="Reschedule delivery" sub="Pick a time that suits you" onClick={() => setSheet('slots')} />
                )}
                {offered.choices.includes('PICKUP') && (
                  <Choice icon={Ico.store} title="Collect from nearby store" sub={`${PICKUP_POINT.name} · ${PICKUP_POINT.distanceKm} km away`} onClick={() => setSheet('pickup')} />
                )}
                {offered.choices.includes('PAY_NOW') && (
                  <Choice icon={Ico.card} title={`Pay now & retry`} sub={`Save ₹${ORDER.prepaidDiscount} · pay ₹${ORDER.price - ORDER.prepaidDiscount}`} onClick={() => setSheet('pay')} />
                )}
                <Choice icon={Ico.close} tone="quiet" title="I don’t want this order" sub="We’ll stop messaging you" onClick={() => setSheet('decline')} />
                {flagged && (
                  <div className="mt-2 rounded-xl bg-white p-3 ring-1 ring-warn-100">
                    <p className="text-[12.5px] font-bold text-ink-900">One quick question</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink-600">Did our delivery partner come to your address today?</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button onClick={() => dispatch({ type: 'TOAST', message: 'Thanks — attempt confirmed', tone: 'neutral' })} className="rounded-lg bg-ink-100 py-2 text-[13px] font-semibold text-ink-700 active:scale-[.98]">Yes, they came</button>
                      <button onClick={() => dispatch({ type: 'TOAST', message: 'Thanks — we’re checking this attempt', tone: 'warn' })} className="rounded-lg bg-warn-100 py-2 text-[13px] font-semibold text-warn-700 active:scale-[.98]">No, nobody came</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Sheets: one decision at a time ── */}
            {sheet === 'slots' && (
              <Panel title="When should we deliver?" onBack={() => setSheet(null)}>
                {SLOTS.map((s) => (
                  <button key={s.id} onClick={() => tap('RESCHEDULE', s)}
                    className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-3 text-left ring-1 ring-ink-200 transition hover:bg-pink-50 hover:ring-pink-400 active:scale-[.99]">
                    <span>
                      <span className="block text-[14px] font-bold text-ink-900">{s.label}</span>
                      <span className="block text-[12.5px] text-ink-500">{s.window}</span>
                    </span>
                    {s.recommended && <span className="rounded-full bg-ok-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ok-700">Soonest</span>}
                  </button>
                ))}
                <p className="px-1 pt-1 text-[11px] text-ink-400">You can change this once.</p>
              </Panel>
            )}

            {sheet === 'pickup' && (
              <Panel title="Collect from a nearby shop" onBack={() => setSheet(null)}>
                <div className="rounded-xl bg-white p-3 ring-1 ring-ink-200">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-600">{Ico.store}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold leading-tight text-ink-900">{PICKUP_POINT.name}</p>
                      <p className="text-[12px] leading-tight text-ink-500">{PICKUP_POINT.address}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Tag>{PICKUP_POINT.distanceKm} km away</Tag>
                        <Tag>{PICKUP_POINT.walkMin} min walk</Tag>
                        <Tag>Open until {PICKUP_POINT.openUntil}</Tag>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2.5 rounded-lg bg-ink-100 px-2.5 py-2 text-[11.5px] leading-snug text-ink-600">
                    Ready in about 2 hours. Show the OTP we send you and pay ₹{ORDER.price} at the shop.
                  </p>
                  <button onClick={() => tap('PICKUP')} className="mt-2.5 w-full rounded-xl bg-pink-500 py-3 text-[15px] font-bold text-white active:scale-[.99]">Choose this shop</button>
                </div>
              </Panel>
            )}

            {sheet === 'pay' && (
              <Panel title="Pay now and we’ll retry today" onBack={() => setSheet(null)}>
                <div className="rounded-xl bg-white p-3 ring-1 ring-ink-200">
                  <Line label="Order amount" value={`₹${ORDER.price}`} />
                  <Line label="Pay online and save" value={`− ₹${ORDER.prepaidDiscount}`} tone="ok" />
                  <div className="my-2 border-t border-dashed border-ink-200" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-bold text-ink-900">You pay</span>
                    <span className="text-[20px] font-extrabold text-ink-900 num">₹{ORDER.price - ORDER.prepaidDiscount}</span>
                  </div>
                  <button onClick={() => tap('PAY_NOW')} className="mt-3 w-full rounded-xl bg-pink-500 py-3 text-[15px] font-bold text-white active:scale-[.99]">
                    Pay ₹{ORDER.price - ORDER.prepaidDiscount}
                  </button>
                  <p className="mt-2 text-center text-[10.5px] text-ink-400">UPI · Cards · Wallets</p>
                </div>
              </Panel>
            )}

            {sheet === 'decline' && (
              <Panel title="Cancel this order?" onBack={() => setSheet(null)}>
                <div className="rounded-xl bg-white p-3 ring-1 ring-ink-200">
                  <p className="text-[13px] leading-snug text-ink-700">We’ll stop trying to deliver and stop messaging you about it. You won’t be charged.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => setSheet(null)} className="rounded-xl bg-ink-100 py-2.5 text-[14px] font-bold text-ink-700 active:scale-[.99]">Keep it</button>
                    <button onClick={() => tap('DECLINE')} className="rounded-xl bg-bad-600 py-2.5 text-[14px] font-bold text-white active:scale-[.99]">Yes, cancel</button>
                  </div>
                </div>
              </Panel>
            )}

            {/* ── Outcomes ── */}
            {choice?.type === 'RESCHEDULE' && (<>
              <Out at={choice.at}>{choice.payload.label}, {choice.payload.window}</Out>
              <In at={choice.at + 1}>
                <p className="text-[13.5px] font-bold text-ok-700">Delivery rescheduled ✅</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-700">
                  We’ll deliver <b className="text-ink-900">{choice.payload.label.toLowerCase()} between {choice.payload.window}</b> at {ORDER.customer.address}.
                </p>
                <p className="mt-1 text-[12px] leading-snug text-ink-500">You’ll get a message before the rider leaves.</p>
              </In>
            </>)}

            {choice?.type === 'PICKUP' && (<>
              <Out at={choice.at}>Collect from nearby store</Out>
              <In at={choice.at + 1}>
                <p className="text-[13.5px] font-bold text-ok-700">Pickup confirmed ✅</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-700">Collect from <b className="text-ink-900">{PICKUP_POINT.name}</b>, {PICKUP_POINT.address}.</p>
                <div className="mt-2 rounded-lg bg-ok-100 px-2.5 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ok-700">Your pickup code</p>
                  <p className="text-[22px] font-extrabold tracking-[.2em] text-ok-700 num">{PICKUP_POINT.otp}</p>
                </div>
                <p className="mt-1.5 text-[12px] leading-snug text-ink-500">Ready by {fmtClock(choice.at + 120)}. Please collect within {PICKUP_POINT.holdHours} hours.</p>
              </In>
            </>)}

            {choice?.type === 'PAY_NOW' && (<>
              <Out at={choice.at}>Pay now & retry</Out>
              <In at={choice.at + 1}>
                <p className="text-[13.5px] font-bold text-ok-700">Payment successful ✅</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-700">₹{choice.payload.amount} paid. You saved ₹{choice.payload.saved}.</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-700">We’ll re-attempt delivery <b className="text-ink-900">today, 6:00 PM – 8:00 PM</b>.</p>
              </In>
            </>)}

            {choice?.type === 'DECLINE' && (<>
              <Out at={choice.at}>I don’t want this order</Out>
              <In at={choice.at + 1}>
                <p className="text-[13.5px] font-bold text-ink-900">Order cancelled</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-700">You won’t be charged and we won’t message you about this order again.</p>
              </In>
            </>)}

            {state.phase === PHASE.DELIVERED && (
              <In at={state.clock}>
                <p className="text-[13.5px] font-bold text-ok-700">Delivered ✅</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-700">Your order was delivered at {fmtClock(state.clock)}. Thanks, {ORDER.customer.name}!</p>
              </In>
            )}
            {state.phase === PHASE.COLLECTED && (
              <In at={state.clock}>
                <p className="text-[13.5px] font-bold text-ok-700">Collected ✅</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-700">Picked up from {PICKUP_POINT.name}. Thanks!</p>
              </In>
            )}
            {(state.phase === PHASE.SLOT_MISSED || (state.phase === PHASE.LADDER && state.ladder?.rung?.key === 'KIRANA')) && (
              <In at={state.clock}>
                <p className="text-[13.5px] font-bold text-ink-900">
                  {state.addressIssue ? 'We couldn’t find your address' : 'We missed you again'}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-ink-700">
                  Your parcel is waiting at <b>{PICKUP_POINT.name}</b>, {PICKUP_POINT.distanceKm} km away. Collect it within {PICKUP_POINT.holdHours} hours with code <b className="num">{PICKUP_POINT.otp}</b>.
                </p>
                {state.addressIssue && <p className="mt-1 text-[12px] leading-snug text-ink-500">We’ll call you shortly to correct the address for next time.</p>}
              </In>
            )}
          </>
        )}

        {busy && <div className="flex justify-start pl-1"><div className="rounded-lg bg-white px-2.5 py-2 shadow-sm"><Thinking label={busy} /></div></div>}
        <div className="h-1" />
      </div>

      {/* Composer — present for realism, deliberately not the way this works */}
      <div className="flex shrink-0 items-center gap-2 bg-[#F0F2F5] px-2 py-2">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 text-[13px] text-ink-400 ring-1 ring-ink-200">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 10h.01M15 10h.01" strokeLinecap="round" /></svg>
          Message
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-wa-green text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" /><path d="M18 11a1 1 0 1 1 2 0 8 8 0 0 1-7 7.94V21h-2v-2.06A8 8 0 0 1 4 11a1 1 0 1 1 2 0 6 6 0 0 0 12 0Z" /></svg>
        </span>
      </div>
    </div>
  )
}

function Panel({ title, onBack, children }) {
  return (
    <div className="animate-slidein rounded-xl bg-ink-100/95 p-2.5 shadow-sm ring-1 ring-ink-200 backdrop-blur">
      <div className="mb-2 flex items-center gap-2">
        <button onClick={onBack} className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink-500 ring-1 ring-ink-200">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18 9 12l6-6" /></svg>
        </button>
        <p className="text-[12.5px] font-bold text-ink-900">{title}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
const Tag = ({ children }) => <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-semibold text-ink-600">{children}</span>
const Line = ({ label, value, tone }) => (
  <div className="flex items-baseline justify-between py-0.5">
    <span className="text-[13px] text-ink-600">{label}</span>
    <span className={cx('text-[13px] font-semibold num', tone === 'ok' ? 'text-ok-700' : 'text-ink-900')}>{value}</span>
  </div>
)
