import React, { useState, useMemo } from 'react'
import { useDemo } from '../../demo/DemoContext.jsx'
import { PHASE, risk, integrity, tPlus } from '../../demo/machine.js'
import { ORDER, T, DAY, fmtClock, UNIT } from '../../demo/scenario.js'
import { buildQueue, queueStats } from '../../ai/queue.js'
import { cx, Pill, Section, DemoTag } from '../../components/ui.jsx'
import { RiskPanel, IntegrityPanel, ContactPanel, IntentPanel, ActionPanel, LadderPanel, TimelinePanel, QueuePanel } from './panels.jsx'

const NAV = [
  ['Home', 'M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z'],
  ['NDR Recovery', 'M12 3v6l4-2M4 12a8 8 0 1 0 8-8M4 12H2m2 0 2.5 2.5'],
  ['Shipments', 'M3 8l9-5 9 5v8l-9 5-9-5V8Zm9-5v18M3 8l9 5 9-5'],
  ['Rider Management', 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 20a6 6 0 0 1 10-4.5'],
  ['NIS Routing', 'M5 5h4v4H5V5Zm10 10h4v4h-4v-4ZM9 7h3a3 3 0 0 1 3 3v5'],
  ['Kirana Network', 'M3 9.5 4.8 4h14.4L21 9.5M3 9.5h18M5 12v8h14v-8'],
  ['Reports', 'M4 20V9m5 11V4m5 16v-7m5 7V7'],
]

export default function HubConsole({ className, compact = false }) {
  const { state, dispatch } = useDemo()
  const [tab, setTab] = useState('ndr')
  const s = state
  const r = risk(s)
  const ig = integrity(s)
  const queue = useMemo(() => buildQueue(), [])
  const stats = useMemo(() => queueStats(queue), [queue])

  const pinned = {
    id: ORDER.id, customer: ORDER.customer.name, product: ORDER.product,
    cod: s.paymentMode === 'COD', p: r.p, integrity: ig.status,
    priority: (1 - r.p) * UNIT.reverse * 0.78,
  }

  const resolved = ![PHASE.ATTEMPT_FAILED, PHASE.NDR_LOGGED, PHASE.OUTREACH_SENT, PHASE.SMS_SENT, PHASE.VOICE_CALLING].includes(s.phase)
  const actions = [
    { label: 'NDR logged with reason code', detail: 'Customer unavailable · attempt 1', done: s.phase !== PHASE.ATTEMPT_FAILED },
    { label: s.phase === PHASE.ATTEMPT_FAILED ? 'Attempt integrity check' : `Attempt integrity: ${ig.status}`,
      detail: s.phase === PHASE.ATTEMPT_FAILED ? 'Runs at T+2' : `${ig.passedCount}/${ig.total} checks`,
      done: s.phase !== PHASE.ATTEMPT_FAILED },
    { label: 'Customer reached', detail: s.contactLadder.length ? `${s.contactLadder[s.contactLadder.length - 1].channel} · ${fmtClock(s.contactLadder[s.contactLadder.length - 1].at)}` : 'Not yet', done: s.contactLadder.length > 0 },
    { label: resolveLabel(s), detail: resolveDetail(s), done: resolved, pending: !resolved && s.contactLadder.length > 0 },
    { label: 'Sent to NIS for re-routing', detail: 'Route and stop window updated', done: resolved && !s.declined },
    { label: 'Rider notified', detail: s.rider.status === 'ASSIGNED' ? 'New stop window pushed' : s.rider.status === 'STOOD_DOWN' ? 'Stood down' : s.rider.status === 'DIVERT_KIRANA' ? 'Divert to kirana' : '—', done: resolved },
    { label: 'Customer notified', detail: 'Confirmation sent on WhatsApp', done: resolved },
  ]

  const statusPill = statusFor(s)

  return (
    <div className={cx('flex min-h-0 overflow-hidden rounded-2xl bg-white shadow-phone ring-1 ring-ink-900/10', className)}>
      {/* Left rail */}
      <nav className={cx('flex shrink-0 flex-col bg-plum-900 py-3 text-white', compact ? 'w-[52px] items-center' : 'w-[168px]')}>
        {compact ? (
          <p className="pb-4 text-[15px] font-extrabold tracking-tight">V</p>
        ) : (
          <div className="px-4 pb-4">
            <p className="text-[17px] font-extrabold tracking-tight">VALMO</p>
            <p className="text-[9.5px] font-semibold uppercase tracking-[.14em] text-white/40">Operations</p>
          </div>
        )}
        <ul className={cx('flex-1 space-y-0.5', compact ? 'w-full px-2' : 'px-2')}>
          {NAV.map(([label, d], i) => (
            <li key={label}>
              <span title={compact ? label : undefined}
                className={cx('flex items-center gap-2 rounded-lg text-[11.5px] font-semibold',
                  compact ? 'justify-center py-2' : 'px-2.5 py-[7px]',
                  i === 1 ? 'bg-pink-500 text-white shadow-sm' : 'text-white/55 hover:bg-white/5')}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
                {!compact && label}
              </span>
            </li>
          ))}
        </ul>
        {!compact && (
          <div className="mt-3 border-t border-white/10 px-4 pt-3">
            <p className="text-[10px] text-white/40">{ORDER.hub.lmdc}</p>
            <p className="text-[10px] text-white/40">{DAY} · {fmtClock(s.clock)}</p>
          </div>
        )}
      </nav>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col bg-ink-100/60">
        {/* Top bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-ink-200 bg-white px-4 py-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg bg-ink-100 px-2.5 py-1.5 text-[11.5px] text-ink-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
            Search by Order ID, AWB or phone number
          </div>
          <span className="relative text-ink-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7ZM10.5 20a2 2 0 0 0 3 0" strokeLinecap="round" /></svg>
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-pink-500" />
          </span>
          <span className="flex items-center gap-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-violet-800 text-[10px] font-bold text-white">A</span>
            <span className="text-[11.5px] font-semibold text-ink-700">{ORDER.hub.ops}</span>
          </span>
        </div>

        {/* NDR header */}
        <div className="shrink-0 border-b border-ink-200 bg-white px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[17px] font-extrabold tracking-tight text-ink-900">NDR {ORDER.id}</h1>
            <Pill tone={statusPill.tone} dot>{statusPill.label}</Pill>
            <span className="ml-auto flex items-center gap-3 text-[11px] text-ink-500">
              <Stamp label="Attempt failed" value={fmtClock(T.ATTEMPT_FAIL)} />
              <Stamp label="Customer reached" value={s.contactLadder.length ? fmtClock(T.OUTREACH) : '—'} tone={s.contactLadder.length ? 'ok' : null} />
              <Stamp label="Elapsed" value={tPlus(s)} tone="pink" />
            </span>
          </div>
          <p className="mt-1 text-[11px] text-ink-500">
            {ORDER.customer.name} · {ORDER.customer.address}, {ORDER.customer.locality} – {ORDER.customer.pincode} · {ORDER.product} {ORDER.variant} · ₹{ORDER.price} {s.paymentMode}
            {s.paymentMode === 'PREPAID' && <span className="ml-1.5 rounded bg-ok-100 px-1.5 py-0.5 text-[10px] font-bold text-ok-700">PAID ONLINE</span>}
          </p>
          <div className="mt-2 flex gap-1">
            {[['ndr', 'This NDR'], ['queue', `Today's queue (${stats.total})`]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={cx('rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition',
                  tab === k ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-100')}>{l}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
          {tab === 'ndr' ? (
            compact ? (
              <div className="flex min-h-full flex-col gap-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <RiskPanel risk={r} resetKey={s.events.length === 1 ? 1 : 0} />
                  <IntegrityPanel ig={ig} disputed={s.disputed} pending={s.phase === PHASE.ATTEMPT_FAILED} />
                </div>
                <IntentPanel intent={s.aiIntent} choice={s.customerChoice} slot={s.slot} />
                {s.ladder && <LadderPanel ladder={s.ladder} />}
                <div className="grid grid-cols-2 gap-2.5">
                  <ContactPanel ladder={s.contactLadder} phase={s.phase} replied={!!s.customerChoice} />
                  <ActionPanel items={actions} />
                </div>
                <TimelinePanel events={s.events} className="min-h-[150px] flex-1" />
              </div>
            ) : (
            <div className="grid min-h-full grid-cols-12 gap-2.5">
              {/* Work area */}
              <div className="col-span-9 flex flex-col gap-2.5">
                <div className="grid grid-cols-3 gap-2.5">
                  <RiskPanel risk={r} resetKey={s.events.length === 1 ? 1 : 0} />
                  <IntegrityPanel ig={ig} disputed={s.disputed} pending={s.phase === PHASE.ATTEMPT_FAILED} />
                  <ContactPanel ladder={s.contactLadder} phase={s.phase} replied={!!s.customerChoice} />
                </div>
                <IntentPanel intent={s.aiIntent} choice={s.customerChoice} slot={s.slot} />
                {s.ladder && <LadderPanel ladder={s.ladder} />}

                {/* Operational value, internal only, labelled */}
                <Section title="Outcome vs doing nothing" right={<DemoTag>Case assumption · internal view only</DemoTag>}>
                  <div className="grid grid-cols-4 gap-2.5">
                    <Econ label="Today without T+30" value="Blind re-attempt" sub={`then reverse at ₹${UNIT.reverse}`} />
                    <Econ label="This parcel now" value={outcomeLabel(s)} sub={outcomeSub(s)} tone="ok" />
                    <Econ label="Reverse cost avoided" value={savedFor(s)} sub="if this parcel closes as it stands" tone="ok" />
                    <Econ label="Channel cost so far" value={`₹${s.contactLadder.reduce((a, c) => a + (c.cost || 0), 0).toFixed(2)}`} sub="WhatsApp ₹0.145 · voice ₹8" />
                  </div>
                  <p className="mt-2 text-[10px] leading-snug text-ink-400">
                    <b className="text-ink-500">Why 30 minutes:</b> an NDR re-attempted within 1–2 days returns 22% of the time; after 5+ days it returns 35% (Shipway FY25).
                    Intent decays, so the cheapest minute to reach someone is the first one.
                  </p>
                  <p className="mt-1 text-[10px] leading-snug text-ink-400">
                    ₹50 forward / ₹120 reverse are case-pack unit costs. These figures are for the ops view only and never appear in the customer app.
                  </p>
                </Section>
              </div>

              {/* Live rail */}
              <div className="col-span-3 flex min-h-0 flex-col gap-2.5">
                <ActionPanel items={actions} />
                <TimelinePanel events={s.events} className="min-h-[220px] flex-1" />
              </div>
            </div>
            )
          ) : (
            <QueuePanel rows={queue} stats={stats} pinned={pinned} />
          )}
        </div>
      </div>
    </div>
  )
}

const Stamp = ({ label, value, tone }) => (
  <span className="flex flex-col items-end leading-tight">
    <span className="text-[9px] font-bold uppercase tracking-wide text-ink-400">{label}</span>
    <span className={cx('text-[12px] font-bold num', tone === 'ok' ? 'text-ok-700' : tone === 'pink' ? 'text-pink-600' : 'text-ink-900')}>{value}</span>
  </span>
)
const Econ = ({ label, value, sub, tone }) => (
  <div className="rounded-lg bg-ink-100/60 px-3 py-2">
    <p className="text-[9.5px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
    <p className={cx('mt-0.5 text-[14px] font-extrabold leading-tight', tone === 'ok' ? 'text-ok-700' : 'text-ink-900')}>{value}</p>
    <p className="text-[10px] leading-snug text-ink-500">{sub}</p>
  </div>
)

function statusFor(s) {
  switch (s.phase) {
    case PHASE.ATTEMPT_FAILED: return { tone: 'bad', label: 'Open · attempt failed' }
    case PHASE.NDR_LOGGED: return { tone: 'warn', label: 'Open · scoring attempt' }
    case PHASE.OUTREACH_SENT: return { tone: 'pink', label: 'T+30 in progress' }
    case PHASE.SMS_SENT: return { tone: 'warn', label: 'Escalated to SMS' }
    case PHASE.VOICE_CALLING: return { tone: 'warn', label: 'Voice call in progress' }
    case PHASE.RESOLVED: return { tone: 'ok', label: 'Resolved · awaiting delivery' }
    case PHASE.RIDER_ON_WAY: return { tone: 'info', label: 'Rider on the way' }
    case PHASE.RIDER_ARRIVED: return { tone: 'info', label: 'Rider at the address' }
    case PHASE.PICKUP_READY: return { tone: 'ok', label: 'Diverted to kirana' }
    case PHASE.DELIVERED: return { tone: 'ok', label: 'Closed · delivered' }
    case PHASE.COLLECTED: return { tone: 'ok', label: 'Closed · collected' }
    case PHASE.SLOT_MISSED: return { tone: 'warn', label: 'Second failure · on the ladder' }
    case PHASE.LADDER: return { tone: 'warn', label: 'On the recovery ladder' }
    default: return { tone: 'neutral', label: 'Closed' }
  }
}
const resolveLabel = (s) => s.customerChoice ? `Customer chose: ${s.customerChoice.type.replace('_', ' ').toLowerCase()}` : 'Awaiting customer choice'
const resolveDetail = (s) => {
  const c = s.customerChoice
  if (!c) return 'Three options open'
  if (c.type === 'RESCHEDULE') return `${c.payload.label} · ${c.payload.window}`
  if (c.type === 'PICKUP') return `${c.payload.name} · 48-hour window`
  if (c.type === 'PAY_NOW') return `₹${c.payload.amount} paid online`
  return 'No further contact'
}
function outcomeLabel(s) {
  if (s.phase === PHASE.DELIVERED) return 'Delivered'
  if (s.phase === PHASE.COLLECTED) return 'Collected at kirana'
  if (s.phase === PHASE.PICKUP_READY) return 'Kirana · rung 2'
  if (s.customerChoice?.type === 'RESCHEDULE') return 'Confirmed slot'
  if (s.customerChoice?.type === 'PAY_NOW') return 'Prepaid + slot'
  if (s.ladder) return `Rung ${s.ladder.rung.n}`
  return 'In progress'
}
function outcomeSub(s) {
  if (s.slot) return `P(deliver) ${risk(s).p.toFixed(2)} vs 0.23 blind`
  if (s.ladder) return s.ladder.rung.name
  return 'awaiting customer'
}
function savedFor(s) {
  if ([PHASE.DELIVERED, PHASE.COLLECTED].includes(s.phase)) return `₹${UNIT.reverse}`
  if (s.ladder) return `₹${s.ladder.saved}`
  if (s.customerChoice) return `up to ₹${UNIT.reverse}`
  return '—'
}
