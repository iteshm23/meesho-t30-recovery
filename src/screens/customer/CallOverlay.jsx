import React, { useState, useEffect } from 'react'
import { useDemo } from '../../demo/DemoContext.jsx'
import { PHASE } from '../../demo/machine.js'
import { cx } from '../../components/ui.jsx'
import { MeeshoMark } from './bits.jsx'

/**
 * The Vaani voice fallback. This is the ONE place the customer produces free
 * text — because they are speaking, not typing. Picking an utterance below
 * stands in for the microphone; the NLU that parses it is real.
 */
const LINES = [
  { id: 'r', text: 'Haan bhai, shaam ko chhe baje ke baad ghar pe rahunga, tab bhej dena', gloss: 'I’ll be home after 6 in the evening' },
  { id: 'p', text: 'Dukaan pe rakhwa dijiye, main le lunga', gloss: 'Leave it at the shop, I’ll collect it' },
  { id: 'd', text: 'Mujhe ab nahi chahiye, cancel kar do', gloss: 'I don’t want it now, cancel it' },
  { id: 'f', text: 'Koi aaya hi nahi tha, main ghar pe hi tha', gloss: 'Nobody came, I was home' },
  { id: 'u', text: 'Haan theek hai dekh lenge', gloss: 'Yeah okay, we’ll see' },
]

export default function CallOverlay() {
  const { state, dispatch } = useDemo()
  const [stage, setStage] = useState('ringing')     // ringing → live → done
  const [typed, setTyped] = useState('')
  const [picked, setPicked] = useState(null)

  useEffect(() => { if (state.phase !== PHASE.VOICE_CALLING) { setStage('ringing'); setTyped(''); setPicked(null) } }, [state.phase])

  // Stream the transcript in, the way a live ASR would.
  useEffect(() => {
    if (!picked) return
    let i = 0
    const id = setInterval(() => {
      i += 2
      setTyped(picked.text.slice(0, i))
      if (i >= picked.text.length) {
        clearInterval(id)
        setTimeout(() => dispatch({ type: 'VOICE_ANSWER', utterance: picked.text }), 500)
      }
    }, 28)
    return () => clearInterval(id)
  }, [picked, dispatch])

  if (state.phase !== PHASE.VOICE_CALLING) return null

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-plum-900 via-plum-800 to-violet-900 text-white">
      {stage === 'ringing' ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="grid h-20 w-20 animate-ring place-items-center rounded-full bg-white shadow-pop"><MeeshoMark className="h-16 w-16" /></div>
          <p className="mt-5 text-[19px] font-bold">Meesho Delivery</p>
          <p className="mt-1 text-[13px] text-white/60">Incoming call · about your order</p>
          <p className="mt-0.5 text-[11px] text-white/40">Automated call in Hindi</p>
          <div className="mt-10 flex items-center gap-12">
            <button onClick={() => dispatch({ type: 'NO_ANSWER_VOICE' })} className="grid h-14 w-14 place-items-center rounded-full bg-bad-600 shadow-pop active:scale-95" aria-label="Decline">
              <svg viewBox="0 0 24 24" className="h-6 w-6 rotate-[135deg]" fill="currentColor"><path d="M6.5 3.5 9 9l-2 1.5a12 12 0 0 0 6.5 6.5L15 15l5.5 2.5v3A1.5 1.5 0 0 1 19 22 17 17 0 0 1 2 5a1.5 1.5 0 0 1 1.5-1.5h3Z" /></svg>
            </button>
            <button onClick={() => setStage('live')} className="grid h-14 w-14 place-items-center rounded-full bg-ok-600 shadow-pop active:scale-95" aria-label="Answer">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M6.5 3.5 9 9l-2 1.5a12 12 0 0 0 6.5 6.5L15 15l5.5 2.5v3A1.5 1.5 0 0 1 19 22 17 17 0 0 1 2 5a1.5 1.5 0 0 1 1.5-1.5h3Z" /></svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-white"><MeeshoMark className="h-9 w-9" /></div>
            <div className="flex-1">
              <p className="text-[15px] font-bold">Meesho Delivery</p>
              <p className="flex items-center gap-1.5 text-[11.5px] text-white/60">
                <span className="h-1.5 w-1.5 animate-pulsed rounded-full bg-ok-600" /> On call · Hindi
              </p>
            </div>
            <div className="flex h-6 items-end gap-[3px]">
              {[0, 1, 2, 3, 4].map(i => <span key={i} className="w-[3px] animate-bars rounded-full bg-white/70" style={{ height: 18, animationDelay: `${i * 110}ms` }} />)}
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Meesho says</p>
            <p className="mt-1 text-[13px] leading-snug text-white/90">
              “Namaste Vinayak ji. Aaj aapka order deliver nahi ho paya. Aap kab available rahenge? Ya nazdeeki dukaan se le sakte hain.”
            </p>
          </div>

          <div className="mt-3 min-h-[58px] rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">You say</p>
            <p className="mt-1 text-[13px] leading-snug text-white">
              {typed || <span className="text-white/35">Listening…</span>}
              {picked && typed.length < picked.text.length && <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulsed bg-white align-middle" />}
            </p>
          </div>

          {!picked && (
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto scroll-thin">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">Demo · choose what Vinayak says aloud</p>
              <div className="space-y-1.5">
                {LINES.map(l => (
                  <button key={l.id} onClick={() => setPicked(l)}
                    className="w-full rounded-lg bg-white/10 px-3 py-2 text-left ring-1 ring-white/10 transition hover:bg-white/20 active:scale-[.99]">
                    <span className="block text-[12.5px] font-medium leading-snug text-white">{l.text}</span>
                    <span className="block text-[10.5px] leading-snug text-white/45">{l.gloss}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {picked && typed.length >= picked.text.length && (
            <p className="mt-3 animate-rise text-center text-[12px] text-white/60">Understood — updating your delivery…</p>
          )}
        </div>
      )}
    </div>
  )
}
