import React, { useRef, useEffect, useState } from 'react'
import { cx, Pill, DemoTag, Section, Row, Bar } from '../../components/ui.jsx'
import { bandTone } from '../../ai/deliveryModel.js'
import { fmtClock, UNIT, ORDER } from '../../demo/scenario.js'

/* ── 1 · P(deliver): the number AND the reason for it ───────────────────── */
export function RiskPanel({ risk, resetKey = 0 }) {
  const prev = useRef(risk.p)
  const lastReset = useRef(resetKey)
  const [delta, setDelta] = useState(null)
  useEffect(() => {
    // A reset rewinds the score; that is not an improvement worth announcing.
    if (resetKey !== lastReset.current) { lastReset.current = resetKey; prev.current = risk.p; setDelta(null); return }
    if (Math.abs(risk.p - prev.current) > 0.02) {
      setDelta(prev.current)
      const t = setTimeout(() => setDelta(null), 4000)
      prev.current = risk.p
      return () => clearTimeout(t)
    }
    prev.current = risk.p
  }, [risk.p, resetKey])

  const tone = bandTone(risk.band)
  return (
    <Section title="Delivery probability" right={<DemoTag />}>
      <div className="flex items-end gap-3">
        <div>
          <p className={cx('text-[40px] font-extrabold leading-none num',
            tone === 'bad' ? 'text-bad-600' : tone === 'warn' ? 'text-warn-600' : 'text-ok-600')}>
            {risk.p.toFixed(2)}
          </p>
          <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">P(deliver) next attempt</p>
        </div>
        <div className="flex-1 pb-1">
          <div className="mb-1.5 flex items-center gap-2">
            <Pill tone={tone} dot>{risk.band}</Pill>
            {delta !== null && (
              <span className="animate-popin rounded-full bg-ok-100 px-2 py-0.5 text-[11px] font-bold text-ok-700 num">
                {delta.toFixed(2)} → {risk.p.toFixed(2)}
              </span>
            )}
          </div>
          <Bar value={risk.p} tone={tone} />
        </div>
      </div>

      <div className="mt-3 border-t border-ink-100 pt-2">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.07em] text-ink-400">What moved the score</p>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <span className="w-[112px] shrink-0 text-[11px] text-ink-400">Base rate</span>
            <span className="h-1.5 flex-1 rounded-full bg-ink-100" />
            <span className="w-9 shrink-0 text-right text-[11px] font-semibold text-ink-400 num">+{risk.intercept.toFixed(2)}</span>
          </li>
          {risk.features.map((f) => {
            const neg = f.contribution < 0
            const w = Math.min(100, Math.abs(f.contribution) / 1.5 * 100)
            return (
              <li key={f.key} className="flex items-center gap-2" title={f.detail}>
                <span className="w-[112px] shrink-0 truncate text-[11px] text-ink-600">{f.label}</span>
                <span className="relative h-1.5 flex-1 rounded-full bg-ink-100">
                  <span className={cx('absolute top-0 h-1.5 rounded-full transition-all duration-500', neg ? 'right-1/2 bg-bad-600' : 'left-1/2 bg-ok-600')} style={{ width: `${w / 2}%` }} />
                  <span className="absolute left-1/2 top-[-2px] h-[10px] w-px bg-ink-300" />
                </span>
                <span className={cx('w-9 shrink-0 text-right text-[11px] font-bold num', neg ? 'text-bad-600' : 'text-ok-600')}>
                  {f.contribution > 0 ? '+' : ''}{f.contribution.toFixed(2)}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-[10.5px] leading-snug text-ink-400">
          Logistic model · log-odds {risk.logit.toFixed(2)} → {risk.p.toFixed(2)}. Illustrative coefficients, not fitted on Meesho data.
        </p>
      </div>
    </Section>
  )
}

/* ── 2 · Attempt integrity (#12) ────────────────────────────────────────── */
export function IntegrityPanel({ ig, disputed, pending }) {
  if (pending) {
    return (
      <Section title="Attempt integrity" right={<Pill tone="neutral">Pending</Pill>}>
        <p className="py-7 text-center text-[12px] text-ink-400">Scoring the attempt at T+2…</p>
      </Section>
    )
  }
  return (
    <Section title="Attempt integrity" right={<Pill tone={ig.verified ? 'ok' : 'warn'} dot>{ig.status}</Pill>}>
      <ul className="space-y-1.5">
        {ig.checks.map((c) => (
          <li key={c.key} className="flex items-center gap-2">
            <span className={cx('grid h-4 w-4 shrink-0 place-items-center rounded-full', c.pass ? 'bg-ok-100 text-ok-700' : 'bg-bad-100 text-bad-700')}>
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                {c.pass ? <path d="m5 13 4 4L19 7" /> : <path d="M18 6 6 18M6 6l12 12" />}
              </svg>
            </span>
            <span className="flex-1 text-[11.5px] text-ink-600">{c.label}</span>
            <span className={cx('text-[11.5px] font-semibold num', c.pass ? 'text-ink-900' : 'text-bad-700')}>{c.value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex items-center justify-between border-t border-ink-100 pt-2">
        <span className="text-[10.5px] text-ink-400">Evidence score · rules, not a model</span>
        <span className="text-[11.5px] font-bold text-ink-900 num">{ig.score.toFixed(2)} · {ig.passedCount}/{ig.total}</span>
      </div>
      <p className={cx('mt-2 rounded-lg px-2.5 py-2 text-[11.5px] font-medium leading-snug', ig.verified ? 'bg-ok-100 text-ok-700' : 'bg-warn-100 text-warn-700')}>
        {ig.action}
      </p>
      {disputed && <p className="mt-1.5 text-[10.5px] leading-snug text-ink-500">Re-scored after the customer said nobody came. The reply audits the attempt.</p>}
    </Section>
  )
}

/* ── 3 · Contact ladder — WhatsApp → SMS → voice, and no further ────────── */
export function ContactPanel({ ladder, phase, replied }) {
  const rungs = [
    { key: 'WhatsApp', label: 'WhatsApp', cost: `₹${UNIT.whatsappPerNdr}`, note: 'Utility template · Hindi + English' },
    { key: 'SMS', label: 'SMS', cost: '₹0.12', note: 'Same three choices, works without data' },
    { key: 'Voice (Vaani)', label: 'Voice (Vaani)', cost: `₹${UNIT.voicePerCall}`, note: 'Riskiest 10% · customer’s own language' },
  ]
  const spent = ladder.reduce((s, c) => s + (c.cost || 0), 0)
  return (
    <Section title="Contact ladder" right={<span className="text-[11px] font-semibold text-ink-500 num">₹{spent.toFixed(2)} spent</span>}>
      <ol className="space-y-1.5">
        {rungs.map((r, i) => {
          const live = ladder.find((c) => c.channel === r.key)
          const state = live?.status
          const tone = state === 'replied' || state === 'answered' ? 'ok'
            : state === 'no response' || state === 'no answer' ? 'bad'
            : state === 'calling' ? 'warn' : state ? 'info' : 'idle'
          return (
            <li key={r.key} className="flex items-start gap-2">
              <span className="flex flex-col items-center">
                <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                  tone === 'ok' ? 'bg-ok-600 text-white' : tone === 'bad' ? 'bg-bad-600 text-white'
                  : tone === 'warn' ? 'bg-warn-600 text-white' : tone === 'info' ? 'bg-violet-600 text-white' : 'bg-ink-100 text-ink-400')}>{i + 1}</span>
                {i < 2 && <span className={cx('mt-0.5 h-4 w-px', state ? 'bg-ink-300' : 'bg-ink-200')} />}
              </span>
              <span className="min-w-0 flex-1 pb-0.5">
                <span className="flex items-baseline gap-2">
                  <span className={cx('text-[12px] font-bold', state ? 'text-ink-900' : 'text-ink-400')}>{r.label}</span>
                  <span className="text-[10.5px] text-ink-400 num">{r.cost}/parcel</span>
                  {live && <span className="ml-auto text-[10.5px] font-semibold text-ink-500 num">{fmtClock(live.at)}</span>}
                </span>
                <span className="block text-[10.5px] leading-snug text-ink-400">{r.note}</span>
                {state && <Pill className="mt-0.5" tone={tone === 'idle' ? 'neutral' : tone}>{state}</Pill>}
              </span>
            </li>
          )
        })}
      </ol>
      {phase === 'LADDER' && !replied && (
        <p className="mt-2 rounded-lg bg-ink-100 px-2.5 py-2 text-[11px] leading-snug text-ink-600">
          Ladder exhausted. No further messages are sent — the parcel moves to recovery instead.
        </p>
      )}
    </Section>
  )
}

/* ── 4 · The AI chain, stated explicitly: INPUT → MODEL → READING → ACTION ─ */
export function IntentPanel({ intent, choice, slot }) {
  if (!intent) {
    return (
      <Section title="Customer response">
        <p className="py-6 text-center text-[12px] text-ink-400">Waiting for the customer…</p>
      </Section>
    )
  }
  const isModel = intent.source === 'model'
  return (
    <Section title="Customer response → action" right={<DemoTag>{isModel ? 'Demo AI interpretation' : 'Deterministic'}</DemoTag>}>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch gap-1.5">
        <Step kicker="Input" tone="neutral">
          {isModel
            ? <p className="text-[11.5px] italic leading-snug text-ink-700">“{intent.raw}”</p>
            : <p className="text-[12.5px] font-bold text-ink-900">{labelFor(choice?.type)}</p>}
          <p className="mt-1 text-[10px] text-ink-400">via {choice?.via || 'Voice'}{choice ? ` · ${fmtClock(choice.at)}` : ''}</p>
        </Step>
        <Arrow />
        <Step kicker={isModel ? 'Model' : 'Rule'} tone="violet">
          <p className="text-[12px] font-bold text-violet-900">{isModel ? 'Vaani NLU' : 'Tap → intent'}</p>
          <p className="mt-1 text-[10px] leading-snug text-violet-900/70">
            {isModel ? 'Lexical scorer + softmax' : 'A button press is a fact, not a prediction — no model needed'}
          </p>
        </Step>
        <Arrow />
        <Step kicker="Reading" tone="pink">
          <p className="text-[12.5px] font-extrabold text-pink-600">{intent.intent}</p>
          {slot && <p className="mt-0.5 text-[11px] font-semibold text-ink-900">{slot.label} · {slot.window}</p>}
          <p className="mt-1 text-[10px] text-ink-500 num">confidence {intent.confidence.toFixed(2)}</p>
        </Step>
        <Arrow />
        <Step kicker="Action" tone="ok">
          <p className="text-[12px] font-bold text-ok-700">{actionFor(choice?.type || intent.intent)}</p>
          <p className="mt-1 text-[10px] leading-snug text-ink-500">Written to NIS · rider and customer notified</p>
        </Step>
      </div>

      {isModel && intent.evidence?.length > 0 && (
        <div className="mt-2.5 border-t border-ink-100 pt-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[.07em] text-ink-400">Phrases the model matched</p>
          <div className="flex flex-wrap gap-1">
            {intent.evidence.map((e, i) => (
              <span key={i} className="rounded bg-violet-50 px-1.5 py-0.5 text-[10.5px] text-violet-900 ring-1 ring-violet-100" title={e.why}>
                “{e.phrase}” <span className="text-violet-900/50 num">+{e.weight}</span>
              </span>
            ))}
            {intent.window?.evidence?.map((e, i) => (
              <span key={`w${i}`} className="rounded bg-pink-50 px-1.5 py-0.5 text-[10.5px] text-pink-600 ring-1 ring-pink-100">{e}</span>
            ))}
          </div>
          {intent.alternatives?.length > 0 && (
            <p className="mt-1.5 text-[10px] text-ink-400">
              Also considered: {intent.alternatives.map((a) => `${a.intent} ${a.confidence.toFixed(2)}`).join(' · ')}
            </p>
          )}
        </div>
      )}
      {intent.needsReview && (
        <p className="mt-2 rounded-lg bg-warn-100 px-2.5 py-2 text-[11.5px] font-medium text-warn-700">
          Below the 0.70 confidence floor — not acted on automatically. Routed to a human agent.
        </p>
      )}
    </Section>
  )
}

const labelFor = (t) => ({ RESCHEDULE: 'Tapped “Reschedule delivery”', PICKUP: 'Tapped “Collect from nearby store”', PAY_NOW: 'Tapped “Pay now & retry”', DECLINE: 'Tapped “I don’t want this order”' }[t] || 'Customer replied')
const actionFor = (t) => ({ RESCHEDULE: 'Slot locked in NIS', PICKUP: 'Divert to kirana', PAY_NOW: 'COD → prepaid', DECLINE: 'Stop contact · recovery ladder', DISPUTE_ATTEMPT: 'Re-queue · flag attempt' }[t] || 'Routed')

const Arrow = () => (
  <span className="grid place-items-center text-ink-300">
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12h15M14 7l5 5-5 5" /></svg>
  </span>
)
function Step({ kicker, tone, children }) {
  const bg = { neutral: 'bg-ink-100/70 ring-ink-200', violet: 'bg-violet-50 ring-violet-100', pink: 'bg-pink-50 ring-pink-100', ok: 'bg-ok-100/60 ring-ok-600/20' }[tone]
  return (
    <div className={cx('min-w-0 rounded-lg px-2.5 py-2 ring-1', bg)}>
      <p className="mb-1 text-[9px] font-bold uppercase tracking-[.1em] text-ink-400">{kicker}</p>
      {children}
    </div>
  )
}

/* ── 5 · System action checklist ────────────────────────────────────────── */
export function ActionPanel({ items }) {
  return (
    <Section title="System action">
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={cx('mt-[1px] grid h-4 w-4 shrink-0 place-items-center rounded-full',
              it.done ? 'bg-ok-600 text-white' : it.pending ? 'bg-warn-100 text-warn-700' : 'bg-ink-100 text-ink-300')}>
              {it.done
                ? <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
                : <span className={cx('h-1.5 w-1.5 rounded-full', it.pending ? 'animate-pulsed bg-warn-600' : 'bg-ink-300')} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cx('block text-[12px] font-semibold leading-snug', it.done ? 'text-ink-900' : 'text-ink-400')}>{it.label}</span>
              {it.detail && <span className="block text-[10.5px] leading-snug text-ink-500">{it.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/* ── 6 · Recovery ladder ────────────────────────────────────────────────── */
export function LadderPanel({ ladder }) {
  if (!ladder) return null
  return (
    <Section title="Recovery ladder" right={<DemoTag>Case-pack unit costs</DemoTag>}>
      <div className="mb-2 flex items-baseline gap-2">
        <Pill tone="info">Rung {ladder.rung.n}</Pill>
        <span className="text-[13px] font-bold text-ink-900">{ladder.rung.name}</span>
        <span className="ml-auto text-[13px] font-extrabold text-ok-700 num">₹{ladder.cost}</span>
      </div>
      <ol className="space-y-1">
        {ladder.steps.map((s) => (
          <li key={s.key} className="flex items-start gap-2">
            <span className={cx('mt-[2px] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full', s.ok ? 'bg-ok-600 text-white' : 'bg-ink-200 text-ink-500')}>
              <svg viewBox="0 0 24 24" className="h-2 w-2" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
                {s.ok ? <path d="m5 13 4 4L19 7" /> : <path d="M18 6 6 18M6 6l12 12" />}
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className={cx('text-[11.5px] font-semibold', s.ok ? 'text-ink-900' : 'text-ink-400')}>{s.key}</span>
              <span className="block text-[10.5px] leading-snug text-ink-500">{s.reason}</span>
            </span>
          </li>
        ))}
      </ol>
      {ladder.hold && (
        <div className="mt-2 rounded-lg bg-violet-50 px-2.5 py-2 ring-1 ring-violet-100">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-900/60">How long to hold before dropping a rung</p>
          <p className="mt-0.5 text-[11.5px] font-semibold text-violet-900 num">{ladder.hold.formula}</p>
          <p className="text-[10.5px] text-violet-900/70">Policy: hold {ladder.hold.days} day{ladder.hold.days === 1 ? '' : 's'} (cap {ladder.hold.cap}) · h = rack ₹{UNIT.rackPerDay} + intent decay {(UNIT.intentDecayPerDay * 100).toFixed(2)}%/day × ₹{UNIT.reverse}</p>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between rounded-lg bg-ok-100 px-2.5 py-2">
        <span className="text-[11px] font-semibold text-ok-700">Avoided reverse cost</span>
        <span className="text-[13px] font-extrabold text-ok-700 num">₹{ladder.saved} <span className="text-[10px] font-semibold opacity-70">of ₹{UNIT.reverse}</span></span>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-ink-400">₹120 reverse / ₹50 forward are case-pack unit costs. Rung costs are team assumptions from our Round 2 model, to be calibrated in pilot.</p>
    </Section>
  )
}

/* ── 7 · Event log ──────────────────────────────────────────────────────── */
export function TimelinePanel({ events, className }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.scrollTo({ top: 1e6, behavior: 'smooth' }) }, [events.length])
  const ACTOR = { system: ['bg-ink-900', 'SYS'], ai: ['bg-violet-700', 'AI'], customer: ['bg-pink-500', 'CUS'], rider: ['bg-amber-500', 'RDR'] }
  return (
    <Section title="Event log" tight className={cx('flex min-h-0 flex-col', className)}>
      <div ref={ref} className="scroll-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
        {events.map((e) => {
          const [bg, tag] = ACTOR[e.actor] || ACTOR.system
          return (
            <div key={e.id} className="animate-rise flex gap-2">
              <span className="w-[52px] shrink-0 pt-[1px] text-right text-[10px] font-semibold text-ink-400 num">{fmtClock(e.at)}</span>
              <span className={cx('mt-[1px] h-4 shrink-0 rounded px-1 text-[8.5px] font-bold leading-4 text-white', bg)}>{tag}</span>
              <span className="min-w-0 flex-1">
                <span className={cx('block text-[11.5px] font-semibold leading-snug',
                  e.tone === 'bad' ? 'text-bad-700' : e.tone === 'warn' ? 'text-warn-700' : e.tone === 'ok' ? 'text-ok-700' : 'text-ink-900')}>{e.title}</span>
                {e.detail && <span className="block text-[10.5px] leading-snug text-ink-500">{e.detail}</span>}
              </span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/* ── 8 · Today's queue — prioritisation as a working feature ────────────── */
export function QueuePanel({ rows, stats, pinned }) {
  const codAll = rows.filter((r) => r.cod).length
  const codTop = rows.slice(0, 15).filter((r) => r.cod).length
  return (
    <div className="flex min-h-0 flex-col gap-2.5">
      <div className="grid grid-cols-4 gap-2.5">
        <Kpi label="NDRs today" value={stats.total} sub="LMDC Kalyanpur" />
        <Kpi label="Resolved" value={stats.resolved} sub={`${Math.round(stats.resolved / stats.total * 100)}% of today`} tone="ok" />
        <Kpi label="Flagged attempts" value={stats.flagged} sub="Integrity check failed" tone="warn" />
        <Kpi label="Voice calls queued" value={stats.voiceQueued} sub="Riskiest 10% · ₹8 each" tone="info" />
      </div>
      <Section title="NDR queue — ranked by what an intervention is worth" tight className="flex min-h-0 flex-1 flex-col"
        right={<DemoTag>Demo model output</DemoTag>}>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-ink-200 text-[10px] uppercase tracking-wide text-ink-400">
                <th className="py-1.5 pl-3 font-bold">Order</th>
                <th className="font-bold">Customer</th>
                <th className="font-bold">Item</th>
                <th className="font-bold">Pay</th>
                <th className="text-right font-bold">P(deliver)</th>
                <th className="pl-2 font-bold">Attempt</th>
                <th className="font-bold">Status</th>
                <th className="pr-3 text-right font-bold">Priority</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ink-100 bg-pink-50/60">
                <td className="py-1.5 pl-3 text-[11px] font-bold text-pink-600 num">
                  <span className="mr-1 inline-block align-middle">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M14 2 9 7H5l-1 2 5 5-5 7 7-5 5 5 2-1v-4l5-5-5-5V2Z" /></svg>
                  </span>{pinned.id}</td>
                <td className="text-[11px] font-semibold text-ink-900">{pinned.customer}</td>
                <td className="text-[11px] text-ink-600">{pinned.product}</td>
                <td><Pill tone={pinned.cod ? 'warn' : 'ok'}>{pinned.cod ? 'COD' : 'Prepaid'}</Pill></td>
                <td className="text-right text-[11px] font-bold text-ink-900 num">{pinned.p.toFixed(2)}</td>
                <td className="pl-2"><Pill tone={pinned.integrity === 'VERIFIED' ? 'ok' : 'warn'}>{pinned.integrity}</Pill></td>
                <td><Pill tone="pink" dot>Open · T+30</Pill></td>
                <td className="pr-3 text-right text-[11px] font-bold text-pink-600 num">{pinned.priority.toFixed(0)}</td>
              </tr>
              {rows.slice(0, 14).map((r) => (
                <tr key={r.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-100/50">
                  <td className="py-1.5 pl-3 text-[11px] text-ink-500 num">{r.id}</td>
                  <td className="text-[11px] text-ink-700">{r.customer}</td>
                  <td className="text-[11px] text-ink-500">{r.product}</td>
                  <td><Pill tone={r.cod ? 'neutral' : 'neutral'}>{r.cod ? 'COD' : 'Prepaid'}</Pill></td>
                  <td className="text-right text-[11px] font-semibold text-ink-700 num">{r.p.toFixed(2)}</td>
                  <td className="pl-2">{r.integrity === 'FLAGGED' ? <Pill tone="warn">FLAGGED</Pill> : <span className="text-[11px] text-ink-300">—</span>}</td>
                  <td><span className="text-[11px] text-ink-500">{r.status}</span></td>
                  <td className="pr-3 text-right text-[11px] font-semibold text-ink-600 num">{r.priority.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-ink-100 px-3 py-1.5">
          <p className="text-[10px] text-ink-400">
            priority = (1 − P(deliver)) × ₹{UNIT.reverse} reverse × P(reach) · pinned row is the case you have open · showing 15 of {stats.total} · illustrative demo data
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-ink-500">
            COD is {Math.round(codAll / rows.length * 100)}% of today’s NDRs but {codTop} of the top 15 — the model points the ₹{UNIT.voicePerCall} voice budget at COD risk without anyone writing a COD rule.
          </p>
        </div>
      </Section>
    </div>
  )
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-ink-200">
      <p className="text-[10px] font-bold uppercase tracking-[.07em] text-ink-400">{label}</p>
      <p className={cx('mt-0.5 text-[26px] font-extrabold leading-none num',
        tone === 'ok' ? 'text-ok-600' : tone === 'warn' ? 'text-warn-600' : tone === 'info' ? 'text-violet-700' : 'text-ink-900')}>{value}</p>
      <p className="mt-0.5 text-[10.5px] text-ink-400">{sub}</p>
    </div>
  )
}
