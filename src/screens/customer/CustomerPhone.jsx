import React, { useState, useEffect } from 'react'
import { useDemo } from '../../demo/DemoContext.jsx'
import { PHASE } from '../../demo/machine.js'
import { PhoneFrame, StatusBar, cx, Toast } from '../../components/ui.jsx'
import WhatsApp from './WhatsApp.jsx'
import Sms from './Sms.jsx'
import Tracking from './Tracking.jsx'
import CallOverlay from './CallOverlay.jsx'

const TABS = [
  { id: 'wa', label: 'WhatsApp' },
  { id: 'sms', label: 'SMS' },
  { id: 'app', label: 'Meesho' },
]

export default function CustomerPhone({ className }) {
  const { state } = useDemo()
  const [tab, setTab] = useState('wa')

  // The channel ladder drives the phone: when we escalate, the phone follows.
  useEffect(() => { if (state.phase === PHASE.SMS_SENT) setTab('sms') }, [state.phase])
  useEffect(() => { if (state.phase === PHASE.OUTREACH_SENT) setTab('wa') }, [state.phase])
  useEffect(() => {
    if ([PHASE.DELIVERED, PHASE.COLLECTED, PHASE.SLOT_MISSED].includes(state.phase)) setTab('app')
  }, [state.phase])

  const unseen = state.phase === PHASE.SMS_SENT && tab !== 'sms'

  return (
    <PhoneFrame className={className} label="Customer" sub="Vinayak · Kanpur">
      <StatusBar dark={tab === 'wa'} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {tab === 'wa' && <WhatsApp />}
        {tab === 'sms' && <Sms />}
        {tab === 'app' && <Tracking />}
        <CallOverlay />
        <Toast toast={state.toast} />
      </div>
      <div className="flex shrink-0 items-center gap-1 border-t border-ink-200 bg-white px-2 py-1.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cx('relative flex-1 rounded-md py-1.5 text-[11px] font-semibold transition',
              tab === t.id ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-100')}>
            {t.label}
            {t.id === 'sms' && unseen && <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-pink-500" />}
          </button>
        ))}
      </div>
    </PhoneFrame>
  )
}
