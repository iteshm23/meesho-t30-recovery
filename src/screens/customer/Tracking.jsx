import React from 'react'
import { useDemo } from '../../demo/DemoContext.jsx'
import { PHASE } from '../../demo/machine.js'
import { ORDER, T, DAY, fmtClock, PICKUP_POINT } from '../../demo/scenario.js'
import { cx } from '../../components/ui.jsx'
import { MeeshoMark, ShoeThumb } from './bits.jsx'

/**
 * The Meesho app's order tracking. Customer-facing only — no probability, no
 * confidence, no hub metrics, no rupee economics. Just where the parcel is.
 */
export default function Tracking() {
  const { state } = useDemo()
  const s = state
  const c = s.customerChoice

  const steps = [
    { title: 'Order placed',      at: `${ORDER.id.slice(0, 0)}${T.ORDER_PLACED.day}, ${fmtClock(T.ORDER_PLACED.min)}`, done: true },
    { title: 'Shipped',           at: `${T.SHIPPED.day}, ${fmtClock(T.SHIPPED.min)}`, done: true },
    { title: 'Out for delivery',  at: `${DAY}, ${fmtClock(T.OUT_FOR_DEL.min)}`, done: true },
    { title: 'Delivery attempt failed', at: `${DAY}, ${fmtClock(T.ATTEMPT_FAIL)}`, sub: 'Nobody was available at the address', tone: 'bad', done: true },
  ]

  if (s.phase !== PHASE.ATTEMPT_FAILED && s.phase !== PHASE.NDR_LOGGED)
    steps.push({ title: 'We got in touch', at: `${DAY}, ${fmtClock(T.OUTREACH)}`, sub: 'Sent you options on WhatsApp', tone: 'info', done: true })

  if (c?.type === 'RESCHEDULE')
    steps.push({ title: 'Delivery rescheduled', at: `${DAY}, ${fmtClock(c.at)}`, sub: `New time: ${c.payload.label}, ${c.payload.window}`, tone: 'ok', done: true })
  if (c?.type === 'PAY_NOW')
    steps.push({ title: 'Paid online', at: `${DAY}, ${fmtClock(c.at)}`, sub: `₹${c.payload.amount} paid · re-attempt today, 6–8 PM`, tone: 'ok', done: true })
  if (c?.type === 'PICKUP')
    steps.push({ title: 'Ready to collect', at: `${DAY}, ${fmtClock(c.at + 120)}`, sub: `${PICKUP_POINT.name} · code ${PICKUP_POINT.otp}`, tone: 'ok', done: true })
  if (c?.type === 'DECLINE')
    steps.push({ title: 'Order cancelled', at: `${DAY}, ${fmtClock(c.at)}`, sub: 'You won’t be charged', tone: 'bad', done: true })

  if (s.phase === PHASE.RIDER_ON_WAY || s.phase === PHASE.RIDER_ARRIVED)
    steps.push({ title: 'Rider is on the way', at: `${DAY}, ${fmtClock(s.clock)}`, sub: `${ORDER.rider.name} · arriving in your slot`, tone: 'info', done: true, live: true })
  if (s.phase === PHASE.SLOT_MISSED)
    steps.push({ title: 'We missed you again', at: `${DAY}, ${fmtClock(s.clock)}`, sub: `Waiting at ${PICKUP_POINT.name} · collect with code ${PICKUP_POINT.otp}`, tone: 'warn', done: true })
  if (s.phase === PHASE.DELIVERED)
    steps.push({ title: 'Delivered', at: `${DAY}, ${fmtClock(s.clock)}`, tone: 'ok', done: true })
  if (s.phase === PHASE.COLLECTED)
    steps.push({ title: 'Collected from the shop', at: `${DAY}, ${fmtClock(s.clock)}`, tone: 'ok', done: true })
  if (s.phase === PHASE.LADDER || s.phase === PHASE.CLOSED)
    steps.push({ title: 'Order closed', at: `${DAY}, ${fmtClock(s.clock)}`, sub: s.declined ? 'Cancelled at your request' : 'We couldn’t reach you', tone: 'neutral', done: true })

  const hero = heroFor(s)

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ink-100/40">
      <div className="shrink-0 bg-white px-4 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-700" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18 9 12l6-6" /></svg>
          <MeeshoMark className="h-6 w-6" />
          <p className="flex-1 text-[15px] font-bold text-ink-900">Order details</p>
          <span className="rounded-full bg-ink-100 px-2 py-1 text-[11px] font-semibold text-ink-600">Help</span>
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
        {hero && (
          <div className={cx('animate-popin rounded-xl p-3 ring-1', hero.ring, hero.bg)}>
            <p className={cx('text-[14px] font-bold', hero.fg)}>{hero.title}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-600">{hero.sub}</p>
          </div>
        )}

        <div className="rounded-xl bg-white p-3 ring-1 ring-ink-200">
          <div className="flex items-center gap-3">
            <ShoeThumb className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold text-ink-900">{ORDER.product}</p>
              <p className="text-[12px] text-ink-500">{ORDER.variant} · ₹{ORDER.price}{state.paymentMode === 'PREPAID' && <span className="ml-1.5 rounded bg-ok-100 px-1.5 py-0.5 text-[10px] font-bold text-ok-700">PAID</span>}</p>
              <p className="mt-0.5 text-[10.5px] text-ink-400 num">Order {ORDER.id}</p>
            </div>
          </div>
          <p className="mt-2.5 border-t border-ink-100 pt-2 text-[11.5px] leading-snug text-ink-500">
            <span className="font-semibold text-ink-700">Deliver to</span> · {ORDER.customer.name}, {ORDER.customer.address}, {ORDER.customer.locality} – {ORDER.customer.pincode}
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 ring-1 ring-ink-200">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[.07em] text-ink-500">Tracking</p>
          <ol className="relative">
            {steps.map((st, i) => (
              <li key={i} className="relative flex gap-3 pb-3.5 last:pb-0">
                {i < steps.length - 1 && <span className="absolute left-[7px] top-4 h-full w-[2px] bg-ink-200" />}
                <span className={cx('relative z-10 mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full ring-2 ring-white',
                  st.tone === 'bad' ? 'bg-bad-600' : st.tone === 'warn' ? 'bg-warn-600' : st.tone === 'info' ? 'bg-violet-600' : 'bg-ok-600')}>
                  {st.live
                    ? <span className="h-1.5 w-1.5 animate-pulsed rounded-full bg-white" />
                    : <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        {st.tone === 'bad' ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="m5 13 4 4L19 7" />}
                      </svg>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-tight text-ink-900">{st.title}</span>
                  <span className="block text-[11px] leading-tight text-ink-400 num">{st.at}</span>
                  {st.sub && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-600">{st.sub}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="px-1 pb-1 text-center text-[10px] text-ink-400">Need help? Chat with us on WhatsApp</p>
      </div>
    </div>
  )
}

function heroFor(s) {
  const c = s.customerChoice
  if (s.phase === PHASE.DELIVERED) return { title: 'Delivered successfully', sub: `Handed over at ${fmtClock(s.clock)}. Hope you like it!`, bg: 'bg-ok-100', ring: 'ring-ok-600/20', fg: 'text-ok-700' }
  if (s.phase === PHASE.COLLECTED) return { title: 'Collected', sub: `Picked up from ${PICKUP_POINT.name}.`, bg: 'bg-ok-100', ring: 'ring-ok-600/20', fg: 'text-ok-700' }
  if (s.phase === PHASE.RIDER_ON_WAY) return { title: 'Rider is on the way', sub: `${ORDER.rider.name} will reach you in your chosen slot.`, bg: 'bg-violet-100', ring: 'ring-violet-600/20', fg: 'text-violet-800' }
  if (s.phase === PHASE.RIDER_ARRIVED) return { title: 'Rider has reached your address', sub: 'Please collect your parcel.', bg: 'bg-violet-100', ring: 'ring-violet-600/20', fg: 'text-violet-800' }
  if (s.phase === PHASE.PICKUP_READY) return { title: 'Ready to collect', sub: `${PICKUP_POINT.name}, ${PICKUP_POINT.distanceKm} km away. Code ${PICKUP_POINT.otp}.`, bg: 'bg-amber-100', ring: 'ring-amber-600/20', fg: 'text-amber-600' }
  if (s.phase === PHASE.SLOT_MISSED) return { title: 'Waiting at a shop near you', sub: `${PICKUP_POINT.name} · collect within ${PICKUP_POINT.holdHours} hours with code ${PICKUP_POINT.otp}.`, bg: 'bg-warn-100', ring: 'ring-warn-600/25', fg: 'text-warn-700' }
  if (s.declined) return { title: 'Order cancelled', sub: 'You won’t be charged.', bg: 'bg-ink-100', ring: 'ring-ink-200', fg: 'text-ink-700' }
  if (s.phase === PHASE.LADDER || s.phase === PHASE.CLOSED) return { title: 'We couldn’t complete this delivery', sub: 'Your order has been closed. You haven’t been charged.', bg: 'bg-ink-100', ring: 'ring-ink-200', fg: 'text-ink-700' }
  if (c?.type === 'RESCHEDULE') return { title: `Arriving ${c.payload.label.toLowerCase()}, ${c.payload.window}`, sub: 'We’ll message you before the rider leaves.', bg: 'bg-pink-50', ring: 'ring-pink-400/25', fg: 'text-pink-600' }
  if (s.phase === PHASE.ATTEMPT_FAILED || s.phase === PHASE.NDR_LOGGED) return { title: 'Delivery attempt failed', sub: 'We’ll contact you shortly with options.', bg: 'bg-bad-100', ring: 'ring-bad-600/20', fg: 'text-bad-700' }
  return { title: 'Choose how you’d like your order', sub: 'Check WhatsApp — we’ve sent you three options.', bg: 'bg-violet-100', ring: 'ring-violet-600/20', fg: 'text-violet-800' }
}
