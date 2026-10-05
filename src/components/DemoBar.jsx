import React from 'react'
import { useDemo, SCENARIOS } from '../demo/DemoContext.jsx'
import { cx, Btn } from './ui.jsx'

export default function DemoBar({ open, onToggle }) {
  const { next, reset, jump, nextStep, scriptDone, state } = useDemo()
  const closed = ['DELIVERED', 'COLLECTED', 'CLOSED'].includes(state.phase)

  return (
    <div className="shrink-0">
      {open && (
        <div className="flex items-center gap-2 border-t border-white/10 bg-plum-900/80 px-4 py-2 backdrop-blur">
          <span className="text-[9.5px] font-bold uppercase tracking-[.12em] text-white/35">Jump to</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SCENARIOS).map(([k, v]) => (
              <button key={k} onClick={() => jump(k)}
                className="rounded-md bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white">
                {v.name}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[10px] text-white/30">→ next step · R reset · 1–4 switch view</span>
        </div>
      )}
      <div className="flex items-center gap-3 border-t border-white/10 bg-plum-900 px-4 py-2">
        <button onClick={onToggle} className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-semibold text-white/45 hover:text-white">
          <svg viewBox="0 0 24 24" className={cx('h-3 w-3 transition-transform', open && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m6 15 6-6 6 6" /></svg>
          Demo controls
        </button>
        <div className="h-4 w-px bg-white/10" />
        <Btn size="sm" variant="ghost" onClick={reset} className="!bg-white/8 !text-white/70 !ring-white/10 hover:!bg-white/15">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" /></svg>
          Reset demo
        </Btn>
        <div className="flex-1" />
        {!scriptDone && nextStep && (
          <span className="hidden text-right leading-tight lg:block">
            <span className="block text-[9.5px] font-bold uppercase tracking-wider text-white/35">Next</span>
            <span className="block text-[11.5px] font-semibold text-white/80">{nextStep.hint}</span>
          </span>
        )}
        <Btn size="sm" onClick={next} disabled={scriptDone}>
          {scriptDone ? (closed ? 'Demo complete' : 'Carry on on screen') : nextStep?.label}
          {!scriptDone && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12h14M13 7l5 5-5 5" /></svg>}
        </Btn>
      </div>
    </div>
  )
}
