import React from 'react'
import { useDemo } from '../../demo/DemoContext.jsx'
import { PHASE } from '../../demo/machine.js'
import { ORDER, SLOTS, T, fmtClock } from '../../demo/scenario.js'

/**
 * SMS fallback. Same three choices, delivered on a channel that works when the
 * customer has no data. Tapping the link lands them back on the same decision.
 */
export default function Sms() {
  const { state, dispatch } = useDemo()
  const reached = [PHASE.SMS_SENT, PHASE.VOICE_CALLING].includes(state.phase) || state.contactLadder.some(c => c.channel === 'SMS')

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="shrink-0 border-b border-ink-200 px-4 pb-2.5 pt-1">
        <p className="text-[15px] font-bold text-ink-900">Messages</p>
        <p className="text-[11px] text-ink-400">VM-MEESHO</p>
      </div>
      <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto bg-ink-100/50 p-3">
        {!reached ? (
          <p className="pt-10 text-center text-[12px] text-ink-400">No messages</p>
        ) : (<>
          <p className="text-center text-[10.5px] font-semibold text-ink-400">{fmtClock(T.SMS_FALLBACK)}</p>
          <div className="animate-rise max-w-[88%] rounded-2xl rounded-tl-md bg-white px-3 py-2.5 shadow-sm ring-1 ring-ink-200">
            <p className="text-[13px] leading-snug text-ink-800">
              Meesho: We couldn’t deliver {ORDER.product} ({ORDER.variant}), order {ORDER.id}.
              Choose a new time, a nearby shop, or pay online — <span className="font-semibold text-violet-700">m.meesho.in/r/7826</span>
            </p>
            <p className="mt-1 text-[10px] text-ink-400">Sent because there was no reply on WhatsApp</p>
          </div>
          {state.phase === PHASE.SMS_SENT && (
            <button onClick={() => dispatch({ type: 'CUSTOMER_TAP', choice: 'RESCHEDULE', slot: SLOTS[0] })}
              className="w-full rounded-xl bg-pink-500 py-3 text-[14px] font-bold text-white active:scale-[.99]">
              Open link → pick {SLOTS[0].label}, {SLOTS[0].window}
            </button>
          )}
        </>)}
      </div>
    </div>
  )
}
