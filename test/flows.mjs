// State-machine flow tests. Run with: npm test
// These exercise every branch headlessly — no browser, no DOM.
import * as M from '../src/demo/machine.js'
import { SLOTS } from '../src/demo/scenario.js'

let fails = 0
const chk = (name, cond, extra='') => { console.log(`${cond?'  PASS':'  FAIL'}  ${name} ${extra}`); if(!cond) fails++ }

function fresh(){ let s=M.initialState(); s=M.reducer(s,{type:'LOG_NDR'}); s=M.reducer(s,{type:'SEND_WHATSAPP'}); return s }
const r=(s,a)=>M.reducer(s,a)

console.log('\nTEST B — Pickup')
let s=fresh(); s=r(s,{type:'CUSTOMER_TAP',choice:'PICKUP'})
chk('phase PICKUP_READY', s.phase===M.PHASE.PICKUP_READY, s.phase)
chk('rider diverted', s.rider.status==='DIVERT_KIRANA')
chk('rider cannot start', !M.can(s,'RIDER_START'))
s=r(s,{type:'COLLECT'}); chk('collected', s.phase===M.PHASE.COLLECTED)
chk('terminal → no more taps', !M.can(s,'CUSTOMER_TAP'))

console.log('\nTEST C — Pay now')
s=fresh(); s=r(s,{type:'CUSTOMER_TAP',choice:'PAY_NOW'})
chk('COD → prepaid', s.paymentMode==='PREPAID', s.paymentMode)
chk('amount 284', s.amountPaid===284, '₹'+s.amountPaid)
chk('risk improves', M.risk(s).p>0.7, M.risk(s).p.toFixed(2))
chk('slot auto-booked', !!s.slot)

console.log('\nTEST D — No response ladder')
s=fresh(); s=r(s,{type:'NO_REPLY_WA'})
chk('SMS sent', s.phase===M.PHASE.SMS_SENT && s.contactLadder[1].channel==='SMS')
s=r(s,{type:'NO_REPLY_SMS'})
chk('voice queued', s.phase===M.PHASE.VOICE_CALLING && s.contactLadder[2].channel.startsWith('Voice'))
s=r(s,{type:'NO_ANSWER_VOICE'})
chk('ladder entered', s.phase===M.PHASE.LADDER)
chk('no infinite messaging', s.contactLadder.length===3, s.contactLadder.length+' rungs')
chk('hold days computed', s.ladder.hold.days>=0, s.ladder.hold.days+'d · '+s.ladder.rung.name)

console.log('\nTEST D2 — Voice answered, Hinglish NLU')
s=fresh(); s=r(s,{type:'NO_REPLY_WA'}); s=r(s,{type:'NO_REPLY_SMS'})
s=r(s,{type:'VOICE_ANSWER',utterance:'shaam ko chhe baje ke baad ghar pe rahunga'})
chk('NLU → RESCHEDULE', s.aiIntent.intent==='RESCHEDULE', s.aiIntent.confidence.toFixed(2))
chk('slot extracted 6-8 PM', s.slot?.window==='6:00 PM – 8:00 PM', s.slot?.window)
chk('source is model', s.aiIntent.source==='model')

console.log('\nTEST E — Customer declines')
s=fresh(); s=r(s,{type:'CUSTOMER_TAP',choice:'DECLINE'})
chk('declined', s.declined && s.phase===M.PHASE.LADDER)
chk('no reschedule offered', !M.can(s,'RESCHEDULE'))
chk('rider stood down', s.rider.status==='STOOD_DOWN')
chk('not routed to kirana', s.ladder.rung.key!=='KIRANA', s.ladder.rung.name)

console.log('\nTEST F — Customer changes slot / reschedule cap')
s=fresh(); s=r(s,{type:'CUSTOMER_TAP',choice:'RESCHEDULE',slot:SLOTS[0]})
chk('1st reschedule ok', s.rescheduleCount===1)
chk('2nd reschedule blocked', !M.can(s,'RESCHEDULE'))
chk('offered list drops reschedule', !M.offeredChoices(s).choices.includes('RESCHEDULE'))

console.log('\nTEST G — Rider cannot deliver, per reason')
for (const [reason, expect] of [['ADDRESS',M.PHASE.LADDER],['REFUSED',M.PHASE.LADDER],['VEHICLE',M.PHASE.RESOLVED],['UNAVAILABLE',M.PHASE.SLOT_MISSED]]) {
  let t=fresh(); t=r(t,{type:'CUSTOMER_TAP',choice:'RESCHEDULE',slot:SLOTS[0]})
  t=r(t,{type:'SET_CLOCK',clock:1040}); t=r(t,{type:'RIDER_START'}); t=r(t,{type:'RIDER_CANT',reason})
  chk(`${reason} → ${expect}`, t.phase===expect, t.phase + (t.ladder?` (${t.ladder.rung.name})`:''))
}

console.log('\nTEST H — Suspicious attempt')
s=M.initialState(); s=r(s,{type:'SET_EVIDENCE',fake:true}); s=r(s,{type:'LOG_NDR'})
chk('flagged', M.integrity(s).status==='FLAGGED', M.integrity(s).passedCount+'/4 checks')
s=r(s,{type:'SEND_WHATSAPP'})
chk('asks did the rider come', M.offeredChoices(s).askedAboutVisit)
chk('voice at T+45 for flagged', M.offeredChoices(s).voiceAtT45)

console.log('\nTEST H2 — Customer disputes on voice → flags attempt')
s=fresh(); s=r(s,{type:'NO_REPLY_WA'}); s=r(s,{type:'NO_REPLY_SMS'})
s=r(s,{type:'VOICE_ANSWER',utterance:'koi aaya hi nahi tha, main ghar pe hi tha'})
chk('disputed', s.disputed)
chk('attempt re-scored FLAGGED', M.integrity(s).status==='FLAGGED')

console.log('\nTEST I — Misses the rescheduled slot')
s=fresh(); s=r(s,{type:'CUSTOMER_TAP',choice:'RESCHEDULE',slot:SLOTS[0]})
s=r(s,{type:'SET_CLOCK',clock:1040}); s=r(s,{type:'RIDER_START'}); s=r(s,{type:'MISS_SLOT'})
chk('SLOT_MISSED', s.phase===M.PHASE.SLOT_MISSED)
chk('no 2nd reschedule', !M.can(s,'RESCHEDULE'))
chk('routed to kirana rung 2', s.ladder.rung.n===2, s.ladder.rung.name)

console.log('\nTEST — Impossible states rejected')
s=fresh(); s=r(s,{type:'CUSTOMER_TAP',choice:'RESCHEDULE',slot:SLOTS[0]})
let before=s.phase; s=r(s,{type:'RIDER_DELIVER'})
chk('cannot deliver before starting', s.phase===before, s.phase)
s=r(s,{type:'SET_CLOCK',clock:1040}); s=r(s,{type:'RIDER_START'}); s=r(s,{type:'RIDER_ARRIVE'}); s=r(s,{type:'RIDER_DELIVER'})
const after=s.phase; s=r(s,{type:'CUSTOMER_TAP',choice:'PAY_NOW'})
chk('cannot pay after delivery', s.phase===after && s.paymentMode==='COD')
s=r(s,{type:'CUSTOMER_TAP',choice:'PICKUP'})
chk('cannot pick up after delivery', s.phase===after)
s=r(s,{type:'RIDER_START'}); chk('cannot restart after delivery', s.phase===after)

console.log('\nTEST K — Reset')
s=r(s,{type:'RESET'})
chk('back to T+0', s.phase===M.PHASE.ATTEMPT_FAILED && s.clock===581 && s.events.length===1)

console.log('\nTEST G2 — each "can\'t deliver" reason routes somewhere different')
{
  const seen = new Map()
  for (const reason of ['ADDRESS','REFUSED','VEHICLE','UNAVAILABLE','OTHER']) {
    let t=fresh(); t=r(t,{type:'CUSTOMER_TAP',choice:'RESCHEDULE',slot:SLOTS[0]})
    t=r(t,{type:'SET_CLOCK',clock:1040}); t=r(t,{type:'RIDER_START'}); t=r(t,{type:'RIDER_CANT',reason})
    seen.set(reason, `${t.phase}/${t.ladder?.rung?.n ?? '-'}`)
  }
  chk('address keeps the customer reachable (rung 2, not backhaul)', seen.get('ADDRESS').endsWith('/2'), seen.get('ADDRESS'))
  chk('refusal goes to backhaul (rung 4)', seen.get('REFUSED').endsWith('/4'), seen.get('REFUSED'))
  chk('outcomes are not all identical', new Set(seen.values()).size >= 3, [...seen.values()].join(' '))
}

console.log('\nTEST — rider is never told to collect cash off-route')
{
  let t=fresh(); t=r(t,{type:'CUSTOMER_TAP',choice:'PICKUP'})
  chk('kirana divert', t.rider.status==='DIVERT_KIRANA')
  let u=fresh(); u=r(u,{type:'CUSTOMER_TAP',choice:'DECLINE'})
  chk('declined stands the rider down', u.rider.status==='STOOD_DOWN')
}

console.log(fails===0 ? '\n✅ ALL FLOWS PASS\n' : `\n❌ ${fails} FAILURES\n`)
process.exit(fails?1:0)
