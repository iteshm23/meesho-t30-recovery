import React, { useState } from 'react'
import { useDemo } from '../../demo/DemoContext.jsx'
import { PHASE, can } from '../../demo/machine.js'
import { ORDER, PICKUP_POINT, fmtClock } from '../../demo/scenario.js'
import { PhoneFrame, StatusBar, cx, Toast } from '../../components/ui.jsx'
import { MeeshoMark, ShoeThumb } from '../customer/bits.jsx'

/**
 * Rider app. Deliberately austere: no probability, no model output, no charts.
 * It answers four questions — what, where, when, what do I do now.
 */
export default function RiderApp({ className }) {
  const { state, dispatch } = useDemo()
  const [sheet, setSheet] = useState(null)      // 'cant' | 'confirm'
  const s = state

  const banner = bannerFor(s)
  const canStart = can(s, 'RIDER_START')
  const canDeliver = can(s, 'RIDER_DELIVER')
  const slotStart = s.slot ? fmtClock(s.slot.start) : null
  const settled = [PHASE.DELIVERED, PHASE.COLLECTED].includes(s.phase)
  // The rider collects cash only when they are the one handing the parcel over.
  // On a kirana divert the shop takes it; on a cancellation nobody does.
  const handover = s.rider.status === 'DIVERT_KIRANA' || s.phase === PHASE.PICKUP_READY
  const offRoute = s.rider.status === 'STOOD_DOWN' || s.declined
  const noCash = handover || offRoute

  return (
    <PhoneFrame className={className} label="Rider" sub={`${ORDER.rider.name} · ${ORDER.hub.lmdc}`}>
      <StatusBar />
      <div className="relative flex min-h-0 flex-1 flex-col bg-ink-100/50">
        {/* Header */}
        <div className="shrink-0 bg-white px-3 pb-2 pt-1">
          <div className="flex items-center gap-2">
            <MeeshoMark className="h-6 w-6" />
            <p className="flex-1 text-[15px] font-bold text-ink-900">My Deliveries</p>
            <span className="flex items-center gap-1.5 rounded-full bg-ok-100 px-2.5 py-1 text-[11px] font-bold text-ok-700">
              <span className="h-1.5 w-1.5 rounded-full bg-ok-600" />Online
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {[['Today', 12, true], ['Upcoming', 5], ['Done', 9]].map(([l, n, active]) => (
              <span key={l} className={cx('rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                active ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-500')}>{l} ({n})</span>
            ))}
          </div>
        </div>

        <div className="scroll-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
          {/* Status banner — the one thing that changed since the failed attempt */}
          <div className={cx('animate-popin flex items-start gap-2.5 rounded-xl p-3 ring-1', banner.bg, banner.ring)}>
            <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg', banner.chip)}>{banner.icon}</span>
            <div className="min-w-0 flex-1">
              <p className={cx('text-[12px] font-bold uppercase tracking-wide', banner.fg)}>{banner.kicker}</p>
              <p className="mt-0.5 text-[17px] font-extrabold leading-tight text-ink-900">{banner.title}</p>
              {banner.sub && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-600">{banner.sub}</p>}
            </div>
          </div>

          {/* The parcel */}
          <div className="rounded-xl bg-white p-3 ring-1 ring-ink-200">
            <div className="flex items-center gap-3">
              <ShoeThumb className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold leading-tight text-ink-900">{ORDER.product}</p>
                <p className="text-[12.5px] text-ink-500">{ORDER.variant}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase text-ink-400">
                  {noCash ? 'Do not collect' : settled ? 'Collected' : s.paymentMode === 'PREPAID' ? 'Prepaid' : 'Collect'}
                </p>
                <p className={cx('text-[17px] font-extrabold num',
                  noCash ? 'text-amber-600' : (s.paymentMode === 'PREPAID' || settled) ? 'text-ok-700' : 'text-ink-900')}>
                  {noCash || s.paymentMode === 'PREPAID' ? '₹0' : `₹${ORDER.price}`}
                </p>
              </div>
            </div>
            {handover && (
              <p className="mt-2 rounded-lg bg-amber-100 px-2.5 py-1.5 text-[12px] font-semibold text-amber-600">
                The shop collects ₹{ORDER.price} from the customer — you take nothing
              </p>
            )}
            {s.paymentMode === 'PREPAID' && !settled && !noCash && (
              <p className="mt-2 rounded-lg bg-ok-100 px-2.5 py-1.5 text-[12px] font-semibold text-ok-700">Already paid online — do not collect cash</p>
            )}
          </div>

          {/* Where + who */}
          <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-ink-200">
            <div className="flex items-start gap-2.5">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></svg>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold leading-snug text-ink-900">{ORDER.customer.address}</p>
                <p className="text-[12.5px] leading-snug text-ink-500">{ORDER.customer.locality} – {ORDER.customer.pincode}</p>
              </div>
              <BigAction label="Map" onClick={() => dispatch({ type: 'TOAST', message: 'Opening navigation…' })}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 7.5 9 4.5l6 3 6-3v12l-6 3-6-3-6 3v-12Z" /><path d="M9 4.5v12M15 7.5v12" /></svg>
              </BigAction>
            </div>
            <div className="flex items-center gap-2.5 border-t border-ink-100 pt-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-400" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" /></svg>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold leading-tight text-ink-900">{ORDER.customer.name}</p>
                <p className="text-[12px] leading-tight text-ink-500 num">{ORDER.customer.phone}</p>
              </div>
              <BigAction label="Call" tone="ok" onClick={() => dispatch({ type: 'TOAST', message: 'Calling customer…' })}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M6.5 3.5 9 9l-2 1.5a12 12 0 0 0 6.5 6.5L15 15l5.5 2.5v3A1.5 1.5 0 0 1 19 22 17 17 0 0 1 2 5a1.5 1.5 0 0 1 1.5-1.5h3Z" /></svg>
              </BigAction>
            </div>
          </div>

          {/* The one line of context the rider actually needs */}
          {banner.note && (
            <div className="flex items-start gap-2.5 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-600/15">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.3A8.4 8.4 0 1 1 21 11.5Z" /></svg>
              <p className="text-[13px] font-semibold leading-snug text-violet-900">{banner.note}</p>
            </div>
          )}

          <div className="h-1" />
        </div>

        {/* Actions — one obvious next move, always */}
        <div className="shrink-0 space-y-2 border-t border-ink-200 bg-white p-2.5">
          {s.phase === PHASE.RESOLVED && s.customerChoice?.type !== 'PICKUP' && (<>
            <PrimaryBtn disabled={!canStart} onClick={() => dispatch({ type: 'RIDER_START' })}
              title="Start Delivery" sub={canStart ? 'I’m on my way' : `Slot starts at ${slotStart}`} />
            <SecondaryBtn onClick={() => setSheet('cant')} label="Can’t deliver?" />
          </>)}

          {s.phase === PHASE.RIDER_ON_WAY && (<>
            <PrimaryBtn onClick={() => dispatch({ type: 'RIDER_ARRIVE' })} title="I’ve reached" sub="Mark arrival at the address" tone="violet" />
            <SecondaryBtn onClick={() => setSheet('cant')} label="Can’t deliver?" />
          </>)}

          {s.phase === PHASE.RIDER_ARRIVED && (<>
            <PrimaryBtn disabled={!canDeliver} onClick={() => setSheet('confirm')}
              title="Mark as Delivered" sub={canDeliver ? (s.paymentMode === 'PREPAID' ? 'Prepaid — no cash' : `Collect ₹${ORDER.price}`) : `Not before ${slotStart}`} tone="ok" />
            <SecondaryBtn onClick={() => setSheet('cant')} label="Can’t deliver?" />
          </>)}

          {[PHASE.ATTEMPT_FAILED, PHASE.NDR_LOGGED, PHASE.OUTREACH_SENT, PHASE.SMS_SENT, PHASE.VOICE_CALLING].includes(s.phase) && (
            <div className="rounded-xl bg-ink-100 px-3 py-3 text-center">
              <p className="text-[13px] font-semibold text-ink-600">Nothing to do on this parcel yet</p>
              <p className="mt-0.5 text-[11.5px] text-ink-400">Meesho is checking with the customer</p>
            </div>
          )}

          {[PHASE.DELIVERED, PHASE.COLLECTED].includes(s.phase) && (
            <div className="rounded-xl bg-ok-100 px-3 py-3 text-center">
              <p className="text-[14px] font-bold text-ok-700">{s.phase === PHASE.DELIVERED ? 'Delivered' : 'Collected by customer'}</p>
              <p className="mt-0.5 text-[11.5px] text-ok-700/80">{fmtClock(s.clock)} · payment settled</p>
            </div>
          )}

          {[PHASE.LADDER, PHASE.SLOT_MISSED, PHASE.CLOSED, PHASE.PICKUP_READY].includes(s.phase) && (
            <div className="rounded-xl bg-amber-100 px-3 py-3 text-center">
              <p className="text-[13.5px] font-bold text-amber-600">Parcel taken off your route</p>
              <p className="mt-0.5 text-[11.5px] text-ink-600">{offRouteNote(s)}</p>
            </div>
          )}
        </div>

        {/* Can't deliver — reasons route to different places */}
        {sheet === 'cant' && (
          <Sheet title="Why can’t you deliver?" onClose={() => setSheet(null)}>
            {[
              ['UNAVAILABLE', 'Customer not available', 'Nobody at the address'],
              ['ADDRESS', 'Address problem', 'Can’t find it / wrong address'],
              ['REFUSED', 'Customer refused', 'They don’t want the parcel'],
              ['VEHICLE', 'Vehicle problem', 'Breakdown, no fuel, accident'],
              ['OTHER', 'Something else', 'Hub will call you'],
            ].map(([k, t, sub]) => (
              <button key={k} onClick={() => { setSheet(null); dispatch({ type: 'RIDER_CANT', reason: k }) }}
                className="w-full rounded-xl bg-white px-3 py-3 text-left ring-1 ring-ink-200 transition hover:ring-pink-400 active:scale-[.99]">
                <p className="text-[14.5px] font-bold text-ink-900">{t}</p>
                <p className="text-[12px] text-ink-500">{sub}</p>
              </button>
            ))}
          </Sheet>
        )}

        {sheet === 'confirm' && (
          <Sheet title="Confirm delivery completed?" onClose={() => setSheet(null)}>
            <div className="rounded-xl bg-white p-3 ring-1 ring-ink-200">
              <p className="text-[13px] leading-snug text-ink-600">
                {s.paymentMode === 'PREPAID'
                  ? 'This order is already paid. Hand over the parcel only.'
                  : `Have you collected ₹${ORDER.price} in cash from ${ORDER.customer.name}?`}
              </p>
            </div>
            <button onClick={() => { setSheet(null); dispatch({ type: 'RIDER_DELIVER' }) }}
              className="w-full rounded-xl bg-ok-600 py-3.5 text-[16px] font-extrabold text-white active:scale-[.99]">Yes, delivered</button>
            <button onClick={() => setSheet(null)}
              className="w-full rounded-xl bg-ink-100 py-3 text-[15px] font-bold text-ink-700 active:scale-[.99]">Cancel</button>
          </Sheet>
        )}
        <Toast toast={s.toast} />
      </div>
    </PhoneFrame>
  )
}

/* ── pieces ── */
function PrimaryBtn({ title, sub, onClick, disabled, tone = 'violet' }) {
  const bg = disabled ? 'bg-ink-200 text-ink-400' : tone === 'ok' ? 'bg-ok-600 text-white' : 'bg-violet-800 text-white'
  return (
    <button onClick={onClick} disabled={disabled} className={cx('w-full rounded-xl px-4 py-3 text-center transition active:scale-[.99] disabled:active:scale-100', bg)}>
      <span className="flex items-center justify-center gap-2 text-[16px] font-extrabold leading-tight">
        {!disabled && <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M3 11 21 3l-8 18-2-7-8-3Z" /></svg>}
        {title}
      </span>
      {sub && <span className="mt-0.5 block text-[11.5px] font-medium opacity-80">{sub}</span>}
    </button>
  )
}
const SecondaryBtn = ({ onClick, label }) => (
  <button onClick={onClick} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[14px] font-bold text-bad-700 ring-1 ring-bad-100 active:scale-[.99]">
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2h.01" /></svg>
    {label}
  </button>
)
const BigAction = ({ children, label, onClick, tone }) => (
  <button onClick={onClick} className={cx('grid h-11 w-14 shrink-0 place-items-center rounded-lg text-[10px] font-bold active:scale-95',
    tone === 'ok' ? 'bg-ok-100 text-ok-700' : 'bg-violet-100 text-violet-800')}>
    <span className="flex flex-col items-center gap-0.5">{children}<span>{label}</span></span>
  </button>
)
function Sheet({ title, onClose, children }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-ink-900/45" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="animate-slidein space-y-2 rounded-t-2xl bg-ink-100 p-3 pb-4">
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-ink-300" />
        <p className="px-1 pb-1 text-[15px] font-extrabold text-ink-900">{title}</p>
        {children}
      </div>
    </div>
  )
}

function bannerFor(s) {
  const base = { bg: 'bg-white', ring: 'ring-ink-200', chip: 'bg-ink-100 text-ink-500', fg: 'text-ink-500' }
  const clock = <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" style={{ height: 18, width: 18 }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  const warn = <svg viewBox="0 0 24 24" style={{ height: 18, width: 18 }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 3 2 20h20L12 3Z" /><path d="M12 9v5M12 17.2h.01" /></svg>

  if (s.phase === PHASE.DELIVERED) return { ...base, bg: 'bg-ok-100', ring: 'ring-ok-600/20', chip: 'bg-ok-600 text-white', fg: 'text-ok-700', kicker: 'Completed', title: 'Delivered', sub: `at ${fmtClock(s.clock)}`, icon: clock }
  if (s.phase === PHASE.PICKUP_READY || s.rider.status === 'DIVERT_KIRANA')
    return { ...base, bg: 'bg-amber-100', ring: 'ring-amber-600/25', chip: 'bg-amber-600 text-white', fg: 'text-amber-600', kicker: 'Diverted', title: `Drop at ${PICKUP_POINT.name}`, sub: `${PICKUP_POINT.address} · customer will collect`, icon: warn, note: 'Hand over to the shop and scan. Do not collect cash.' }
  if (s.phase === PHASE.SLOT_MISSED)
    return { ...base, bg: 'bg-warn-100', ring: 'ring-warn-600/25', chip: 'bg-warn-600 text-white', fg: 'text-warn-700', kicker: 'Second attempt failed', title: 'Parcel goes to the shop', sub: `Drop at ${PICKUP_POINT.name} on your way back`, icon: warn }
  if (s.phase === PHASE.LADDER || s.phase === PHASE.CLOSED)
    return { ...base, kicker: 'Stood down', title: s.declined ? 'Customer cancelled' : 'Taken off your route', sub: 'Return this parcel to the hub', icon: warn }
  if (s.phase === PHASE.RIDER_ON_WAY)
    return { ...base, bg: 'bg-violet-100', ring: 'ring-violet-600/20', chip: 'bg-violet-800 text-white', fg: 'text-violet-800', kicker: 'On the way', title: s.slot ? `Deliver by ${fmtClock(s.slot.end)}` : 'On the way', sub: 'Customer has been notified', icon: clock, note: 'Customer is expecting you between 6:00 PM and 8:00 PM.' }
  if (s.phase === PHASE.RIDER_ARRIVED)
    return { ...base, bg: 'bg-violet-100', ring: 'ring-violet-600/20', chip: 'bg-violet-800 text-white', fg: 'text-violet-800', kicker: 'At the address', title: 'Hand over the parcel', sub: s.paymentMode === 'PREPAID' ? 'Already paid' : `Collect ₹${ORDER.price} in cash`, icon: clock }
  if (s.phase === PHASE.RESOLVED && s.customerChoice?.type === 'PAY_NOW')
    return { ...base, bg: 'bg-ok-100', ring: 'ring-ok-600/20', chip: 'bg-ok-600 text-white', fg: 'text-ok-700', kicker: 'Customer paid online', title: 'Deliver between 6:00 PM – 8:00 PM', sub: 'No cash to collect', icon: clock, note: 'Customer will be available between 6:00 PM and 8:00 PM.' }
  if (s.phase === PHASE.RESOLVED && s.slot)
    return { ...base, bg: 'bg-pink-50', ring: 'ring-pink-400/30', chip: 'bg-pink-500 text-white', fg: 'text-pink-600', kicker: 'Rescheduled by customer', title: `Deliver between ${s.slot.window}`, sub: `${s.slot.label} · chosen by the customer`, icon: clock, note: 'Customer will be available between 6:00 PM and 8:00 PM.' }
  return { ...base, bg: 'bg-bad-100', ring: 'ring-bad-600/20', chip: 'bg-bad-600 text-white', fg: 'text-bad-700', kicker: 'Attempt failed', title: 'Customer not available', sub: `Marked at ${fmtClock(581)} · waiting for an update`, icon: warn }
}

function offRouteNote(s) {
  if (s.phase === PHASE.PICKUP_READY) return `Customer will collect from ${PICKUP_POINT.name}`
  if (s.phase === PHASE.SLOT_MISSED) return `Drop at ${PICKUP_POINT.name} · 48-hour window`
  if (s.declined) return 'Customer cancelled — return to hub'
  return s.ladder?.rung ? `Recovery ladder · ${s.ladder.rung.name}` : 'Return to hub'
}
