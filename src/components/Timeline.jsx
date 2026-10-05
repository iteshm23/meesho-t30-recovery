import React from 'react'
import { useDemo } from '../demo/DemoContext.jsx'
import { PHASE } from '../demo/machine.js'
import { T, fmtClock } from '../demo/scenario.js'
import { cx } from './ui.jsx'

/** The spine of the story: what happens in the first hours after a failed attempt. */
export default function Timeline() {
  const { state } = useDemo()
  const s = state
  const done = (p) => s.events.some(e => e.at >= p)

  const marks = [
    { t: 'T+0',  at: T.ATTEMPT_FAIL, label: 'Attempt failed',   on: true },
    { t: 'T+2',  at: T.NDR_LOGGED,   label: 'NDR + integrity',  on: s.phase !== PHASE.ATTEMPT_FAILED },
    { t: 'T+30', at: T.OUTREACH,     label: 'Customer reached', on: s.contactLadder.length > 0, hero: true },
    { t: '',     at: null,           label: 'Customer chooses', on: !!s.customerChoice },
    { t: '',     at: null,           label: 'Hub + rider updated', on: !!s.customerChoice },
    { t: '',     at: null,           label: 'Recovered', on: [PHASE.DELIVERED, PHASE.COLLECTED].includes(s.phase) },
  ]

  return (
    <div className="flex items-center gap-1">
      {marks.map((m, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className={cx('h-px w-4 shrink-0 transition-colors duration-500', m.on ? 'bg-pink-400' : 'bg-white/15')} />}
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={cx('grid h-4 w-4 place-items-center rounded-full transition-all duration-500',
              m.on ? (m.hero ? 'bg-pink-500 ring-4 ring-pink-500/25' : 'bg-pink-400') : 'bg-white/15')}>
              {m.on && <svg viewBox="0 0 24 24" className="h-2 w-2 text-white" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>}
            </span>
            <span className="flex flex-col leading-none">
              {m.t && <span className={cx('text-[9.5px] font-extrabold tracking-wide num', m.on ? 'text-pink-300' : 'text-white/30')}>{m.t}</span>}
              <span className={cx('whitespace-nowrap text-[10.5px] font-semibold', m.on ? 'text-white' : 'text-white/35', m.t && 'mt-0.5')}>{m.label}</span>
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}
