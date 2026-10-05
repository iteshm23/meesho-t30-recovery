import React from 'react'
import { cx } from '../../components/ui.jsx'
import { fmtClock } from '../../demo/scenario.js'

export function MeeshoMark({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="20" fill="#F43397" />
      <path d="M11 27V16.5c0-2.5 1.9-4.3 4.3-4.3 1.7 0 3.1.9 3.9 2.3.8-1.4 2.2-2.3 3.9-2.3 2.4 0 4.3 1.8 4.3 4.3V27h-3.3v-9.8c0-.9-.6-1.5-1.4-1.5s-1.5.6-1.5 1.5V27h-3.3v-9.8c0-.9-.6-1.5-1.4-1.5s-1.4.6-1.4 1.5V27H11Z" fill="#fff" />
    </svg>
  )
}

export function Tick({ read }) {
  return (
    <svg viewBox="0 0 18 12" className={cx('h-3 w-[18px]', read ? 'text-[#53BDEB]' : 'text-ink-400')} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6.6 4.2 9.8 10.4 2.2" /><path d="M7.4 9.2 8 9.8 14.2 2.2" />
    </svg>
  )
}

/** Incoming (Meesho) bubble. */
export function In({ children, at, className }) {
  return (
    <div className="animate-rise flex justify-start">
      <div className={cx('relative max-w-[86%] rounded-lg rounded-tl-none bg-white px-2.5 pb-4 pt-2 shadow-sm bubble-tail-l', className)}>
        {children}
        <span className="absolute bottom-1 right-2.5 text-[10px] text-ink-400 num">{fmtClock(at)}</span>
      </div>
    </div>
  )
}

/** Outgoing (customer) bubble. */
export function Out({ children, at }) {
  return (
    <div className="animate-rise flex justify-end">
      <div className="relative max-w-[82%] rounded-lg rounded-tr-none bg-wa-out px-2.5 pb-4 pt-2 shadow-sm bubble-tail-r">
        <p className="text-[13.5px] leading-snug text-ink-900">{children}</p>
        <span className="absolute bottom-1 right-2 flex items-center gap-1 text-[10px] text-ink-400 num">{fmtClock(at)} <Tick read /></span>
      </div>
    </div>
  )
}

/** The big, unmissable choice buttons. No hyperlinks, no typing. */
export function Choice({ icon, title, sub, onClick, disabled, tone = 'default' }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cx('group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:scale-[.99] disabled:opacity-40',
        tone === 'default' && 'bg-white ring-1 ring-ink-200 hover:ring-pink-400 hover:bg-pink-50',
        tone === 'quiet' && 'bg-transparent ring-1 ring-ink-200 hover:bg-ink-100')}>
      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-lg', tone === 'quiet' ? 'bg-ink-100 text-ink-500' : 'bg-pink-100 text-pink-600')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={cx('block text-[14px] font-bold leading-tight', tone === 'quiet' ? 'text-ink-600' : 'text-ink-900')}>{title}</span>
        {sub && <span className="mt-0.5 block text-[11.5px] leading-tight text-ink-500">{sub}</span>}
      </span>
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-300" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
    </button>
  )
}

/** Product strip reused across WhatsApp, SMS and tracking. */
export function ProductStrip({ order, compact }) {
  return (
    <div className={cx('flex items-center gap-2.5 rounded-lg bg-ink-100/70 p-2', compact && 'p-1.5')}>
      <ShoeThumb className={compact ? 'h-9 w-9' : 'h-11 w-11'} />
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-bold leading-tight text-ink-900">{order.product}</p>
        <p className="text-[11px] leading-tight text-ink-500">{order.variant} · ₹{order.price}</p>
        <p className="mt-0.5 text-[10px] leading-tight text-ink-400 num">Order {order.id}</p>
      </div>
    </div>
  )
}

export function ShoeThumb({ className = 'h-11 w-11' }) {
  return (
    <div className={cx('grid shrink-0 place-items-center overflow-hidden rounded-md bg-gradient-to-br from-ink-200 to-ink-100 ring-1 ring-ink-200', className)}>
      <svg viewBox="0 0 48 32" className="h-[72%] w-[72%]" aria-hidden>
        <path d="M4 22c0-3 1-7 3-9s5-2 7 0l4 4 7-3c3-1 6 0 9 2l9 5c2 1 3 2 3 4v2H6c-1.2 0-2-.8-2-2v-3Z" fill="#2B2B33" />
        <path d="M4 25h42v2.5c0 1.4-1.1 2.5-2.5 2.5h-37C5.1 30 4 28.9 4 27.5V25Z" fill="#F43397" />
        <path d="m18 17 5 3M22 14l5 3M26 12l5 3" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity=".85" />
      </svg>
    </div>
  )
}

export const Ico = {
  calendar: <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" style={{height:18,width:18}} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>,
  store:    <svg viewBox="0 0 24 24" style={{height:18,width:18}} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5 4.8 4h14.4L21 9.5M3 9.5h18M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v8h14v-8" /></svg>,
  card:     <svg viewBox="0 0 24 24" style={{height:18,width:18}} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6 15h3" /></svg>,
  close:    <svg viewBox="0 0 24 24" style={{height:18,width:18}} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  clock:    <svg viewBox="0 0 24 24" style={{height:18,width:18}} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
}
