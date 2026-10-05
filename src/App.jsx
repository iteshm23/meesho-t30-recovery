import React, { useState, useEffect } from 'react'
import { DemoProvider, useDemo } from './demo/DemoContext.jsx'
import { PHASE } from './demo/machine.js'
import { DAY, fmtClock } from './demo/scenario.js'
import { cx } from './components/ui.jsx'
import Timeline from './components/Timeline.jsx'
import DemoBar from './components/DemoBar.jsx'
import CustomerPhone from './screens/customer/CustomerPhone.jsx'
import HubConsole from './screens/hub/HubConsole.jsx'
import RiderApp from './screens/rider/RiderApp.jsx'

const VIEWS = [
  { id: 'stage', label: 'All three' },
  { id: 'customer', label: 'Customer' },
  { id: 'hub', label: 'Hub' },
  { id: 'rider', label: 'Rider' },
]

export default function App() {
  return <DemoProvider><Shell /></DemoProvider>
}

/** The three-up stage needs real width. Below this we show one surface instead
 *  of three squeezed ones — a crushed console reads worse than a single clear one. */
const STAGE_MIN = 1180
function useRoomForStage() {
  const [ok, setOk] = useState(() => typeof window === 'undefined' || window.innerWidth >= STAGE_MIN)
  useEffect(() => {
    const on = () => setOk(window.innerWidth >= STAGE_MIN)
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return ok
}

function Shell() {
  const { state, next, reset } = useDemo()
  const [view, setView] = useState('stage')
  const [bar, setBar] = useState(true)
  const roomForStage = useRoomForStage()

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight') { e.preventDefault(); next() }
      if (e.key.toLowerCase() === 'r') reset()
      const i = parseInt(e.key, 10)
      if (i >= 1 && i <= 4) setView(VIEWS[i - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, reset])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-plum-900 via-plum-800 to-violet-900">
      {/* Masthead */}
      <header className="flex shrink-0 items-center gap-4 px-5 py-2.5">
        <div className="shrink-0">
          <h1 className="flex items-baseline gap-2 text-[17px] font-extrabold leading-none tracking-tight text-white">
            T+30 NDR Recovery
            <span className="rounded bg-pink-500 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">Prototype</span>
          </h1>
          <p className="mt-1 text-[10px] text-white/35">Meesho DICE 3.0 · House Targaryen · solution #13</p>
        </div>

        <div className="mx-auto hidden min-w-0 flex-col items-center gap-1.5 xl:flex">
          <p className="hidden whitespace-nowrap text-[11px] font-medium text-white/55 wide:block">
            A failed attempt becomes a return Meesho pays for.
            <span className="text-white/80"> T+30 reaches the customer first.</span>
          </p>
          <Timeline />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <div className="text-right leading-tight">
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-white/35">Demo clock</p>
            <p className="text-[14px] font-extrabold text-white num">{DAY} · {fmtClock(state.clock)}</p>
          </div>
          <div className="flex gap-0.5 rounded-lg bg-white/8 p-0.5 ring-1 ring-white/10">
            {VIEWS.map((v) => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={cx('rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold transition',
                  view === v.id ? 'bg-white text-plum-900 shadow-sm' : 'text-white/60 hover:text-white')}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stage */}
      <main className="min-h-0 flex-1 px-4 pb-3">
        {view === 'stage' && !roomForStage && (
          <div className="flex h-full min-h-0 flex-col items-center gap-3">
            <p className="rounded-lg bg-white/8 px-3 py-1.5 text-[11.5px] text-white/60 ring-1 ring-white/10">
              Widen the window to {STAGE_MIN}px to see all three side by side — or use the tabs above.
            </p>
            <HubConsole className="min-h-0 w-full flex-1" compact />
          </div>
        )}
        {view === 'stage' && roomForStage && (
          <div className="flex h-full min-h-0 gap-3">
            <CustomerPhone className="w-[clamp(258px,20vw,312px)] shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="mb-2 flex items-baseline gap-2 px-1">
                <h2 className="text-[12px] font-bold uppercase tracking-[.08em] text-white/90">Valmo hub</h2>
                <span className="text-[11px] text-white/50">NDR recovery console · Kanpur</span>
              </div>
              <HubConsole className="min-h-0 flex-1" compact />
            </div>
            <RiderApp className="w-[clamp(258px,20vw,312px)] shrink-0" />
          </div>
        )}
        {view === 'customer' && (
          <div className="flex h-full min-h-0 items-stretch justify-center gap-6">
            <CustomerPhone className="w-[380px]" />
            <div className="hidden max-w-sm flex-col justify-center lg:flex">
              <Note title="One decision at a time"
                body="Large buttons, no menus, no typing. The customer taps once and the rest of the system reacts." />
              <Note title="Three real choices"
                body="Reschedule, collect nearby, or pay now — plus a way to say no. Every one of them changes what the hub and the rider see." />
              <Note title="Free text only where it is spoken"
                body="If WhatsApp and SMS go unanswered, Vaani calls in Hindi. That is the one place the customer speaks freely — and the one place NLU earns its keep." />
            </div>
          </div>
        )}
        {view === 'hub' && <HubConsole className="h-full min-h-0" />}
        {view === 'rider' && (
          <div className="flex h-full min-h-0 items-stretch justify-center gap-6">
            <RiderApp className="w-[380px]" />
            <div className="hidden max-w-sm flex-col justify-center lg:flex">
              <Note title="What, where, when, what next"
                body="No probability, no model output, no charts. A rider in a Tier-3 city needs the time, the door and one obvious button." />
              <Note title="No delivering before you have gone"
                body="“Mark as Delivered” does not exist until the rider has started and reached the address inside the customer's slot." />
              <Note title="Failures are not all the same"
                body="“Can't deliver” asks why, and each reason routes somewhere different — NDR, address verification, refusal handling or a re-assign." />
            </div>
          </div>
        )}
      </main>

      <DemoBar open={bar} onToggle={() => setBar((b) => !b)} />
    </div>
  )
}

const Note = ({ title, body }) => (
  <div className="mb-4 border-l-2 border-pink-500/60 pl-3">
    <p className="text-[13px] font-bold text-white">{title}</p>
    <p className="mt-1 text-[12px] leading-relaxed text-white/55">{body}</p>
  </div>
)
