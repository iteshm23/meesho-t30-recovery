import React from 'react'

export const cx = (...a) => a.filter(Boolean).join(' ')

const TONE = {
  ok:      'bg-ok-100 text-ok-700',
  warn:    'bg-warn-100 text-warn-700',
  bad:     'bg-bad-100 text-bad-700',
  info:    'bg-violet-100 text-violet-800',
  pink:    'bg-pink-100 text-pink-600',
  neutral: 'bg-ink-100 text-ink-700',
}

export function Pill({ tone = 'neutral', children, className, dot }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5', TONE[tone], className)}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', tone === 'ok' ? 'bg-ok-600' : tone === 'bad' ? 'bg-bad-600' : tone === 'warn' ? 'bg-warn-600' : 'bg-violet-600')} />}
      {children}
    </span>
  )
}

/** The label that keeps us honest: anything modelled says so, right next to the number. */
export function DemoTag({ children = 'Demo model output', className }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-ink-400 ring-1 ring-inset ring-ink-200', className)}>
      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg>
      {children}
    </span>
  )
}

export function Section({ title, right, children, className, tight }) {
  return (
    <section className={cx('rounded-xl bg-white ring-1 ring-ink-200/80', className)}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-2 border-b border-ink-100 px-3 py-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[.07em] text-ink-500">{title}</h3>
          {right}
        </header>
      )}
      <div className={tight ? '' : 'p-3'}>{children}</div>
    </section>
  )
}

export function Row({ label, value, tone, mono }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className="text-[12px] text-ink-500">{label}</span>
      <span className={cx('text-[12px] font-semibold', mono && 'num', tone === 'ok' && 'text-ok-700', tone === 'bad' && 'text-bad-700', tone === 'warn' && 'text-warn-700', !tone && 'text-ink-900')}>{value}</span>
    </div>
  )
}

export function Btn({ variant = 'primary', size = 'md', className, children, ...p }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100'
  const sizes = { sm: 'px-2.5 py-1.5 text-[12px]', md: 'px-3.5 py-2 text-[13px]', lg: 'px-4 py-3 text-[15px]' }
  const kinds = {
    primary: 'bg-pink-500 text-white hover:bg-pink-600 shadow-sm',
    violet:  'bg-violet-800 text-white hover:bg-violet-900 shadow-sm',
    ghost:   'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-100',
    dark:    'bg-ink-900 text-white hover:bg-ink-700',
    ok:      'bg-ok-600 text-white hover:bg-ok-700',
    danger:  'bg-white text-bad-700 ring-1 ring-bad-100 hover:bg-bad-100',
  }
  return <button className={cx(base, sizes[size], kinds[variant], className)} {...p}>{children}</button>
}

/** A realistic phone body. Screen content scrolls inside; the frame never does. */
export function PhoneFrame({ children, label, sub, className, tone = 'plum' }) {
  return (
    <div className={cx('flex min-h-0 flex-col', className)}>
      {label && (
        <div className="mb-2 flex items-baseline gap-2 px-1">
          <h2 className="text-[12px] font-bold uppercase tracking-[.08em] text-white/90">{label}</h2>
          {sub && <span className="text-[11px] text-white/50">{sub}</span>}
        </div>
      )}
      <div className="relative min-h-0 flex-1 rounded-[2rem] bg-ink-900 p-[7px] shadow-phone ring-1 ring-white/10">
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.6rem] bg-white">
          <div className="pointer-events-none absolute left-1/2 top-1.5 z-30 h-[18px] w-[86px] -translate-x-1/2 rounded-full bg-ink-900" />
          {children}
        </div>
      </div>
    </div>
  )
}

export function StatusBar({ dark, carrier = '4G' }) {
  return (
    <div className={cx('flex shrink-0 items-center justify-between px-5 pb-1 pt-[7px] text-[11px] font-semibold num', dark ? 'text-white' : 'text-ink-900')}>
      <span>5:42</span>
      <span className="flex items-center gap-1">
        <span className="text-[10px]">{carrier}</span>
        <svg viewBox="0 0 24 14" className="h-2.5 w-4" fill="currentColor"><rect x="0" y="9" width="3" height="5" rx="1" /><rect x="5" y="6" width="3" height="8" rx="1" /><rect x="10" y="3" width="3" height="11" rx="1" /><rect x="15" y="0" width="3" height="14" rx="1" opacity=".4" /></svg>
        <svg viewBox="0 0 26 12" className="h-2.5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="20" height="10" rx="2.5" /><rect x="2.5" y="2.5" width="12" height="7" rx="1.5" fill="currentColor" stroke="none" /><path d="M23 4.5v3" strokeLinecap="round" /></svg>
      </span>
    </div>
  )
}

export function Toast({ toast }) {
  if (!toast) return null
  const tone = toast.tone === 'warn' ? 'bg-warn-600' : toast.tone === 'bad' ? 'bg-bad-600' : 'bg-ink-900'
  return (
    <div key={toast.id} className={cx('animate-popin pointer-events-none absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg px-3 py-2 text-[12px] font-medium text-white shadow-pop', tone)}>
      {toast.message}
    </div>
  )
}

/** A short "the system is working" beat. Not decoration — it marks where latency is real. */
export function Thinking({ label }) {
  return (
    <div className="flex items-center gap-2 text-[12px] font-medium text-violet-800">
      <span className="relative flex h-3.5 w-3.5">
        <span className="absolute inset-0 animate-pulsed rounded-full bg-violet-600/30" />
        <span className="absolute inset-[3px] rounded-full bg-violet-600" />
      </span>
      {label}
    </div>
  )
}

export function Bar({ value, tone = 'violet', className }) {
  const colour = { violet: 'bg-violet-600', ok: 'bg-ok-600', bad: 'bg-bad-600', warn: 'bg-warn-600', pink: 'bg-pink-500' }[tone]
  return (
    <div className={cx('h-1.5 overflow-hidden rounded-full bg-ink-100', className)}>
      <div className={cx('h-full rounded-full transition-[width] duration-700', colour)} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  )
}
