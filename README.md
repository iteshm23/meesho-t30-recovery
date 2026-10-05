# T+30 NDR Recovery — working prototype

Meesho DICE Challenge 3.0 · House Targaryen · Solution #13

**Live: https://meesho-t30-recovery.vercel.app** · source: https://github.com/iteshm23/meesho-t30-recovery

> Best viewed at 1440×900 or wider. Press `→` to step through the demo, `R` to reset.

A failed delivery attempt today becomes a blind second attempt and then an RTO.
This prototype shows the alternative: within 30 minutes of the failure, reach the
customer, give them three real choices, turn the choice into an operational
action, and push it to the hub and the rider — on one shared state machine.

---

## Run it

```bash
cd t30-prototype && npm install && npm run dev
```

Open **http://localhost:5180**. No backend, no API keys, no network calls.

```bash
npm run build && npm run preview   # production build
npm test                           # 47 state-machine flow assertions, no browser needed
```

### Presenting

| Key | Does |
|---|---|
| `→` | Next step in the scripted demo |
| `R` | Reset |
| `1` `2` `3` `4` | All three · Customer · Hub · Rider |

The bottom bar has **Reset demo**, the **Next step** button, and a **Jump to**
row for Q&A. Collapse the bar with "Demo controls" for a clean presentation.
The Next button is derived from the current state, not a counter, so you can
drive the screens by hand and it stays correct.

---

## The four surfaces

| Surface | Who | Design rule |
|---|---|---|
| WhatsApp + SMS + voice | Customer | One decision at a time. Large buttons. **No typing anywhere.** |
| Meesho app tracking | Customer | Only customer-relevant facts. No probability, no economics. |
| Valmo NDR console | Hub ops | Dense but ordered: risk → integrity → contact → reading → action. |
| Rider app | Rider | What, where, when, what next. No model output, no charts. |

They are four views of **one** reducer (`src/demo/machine.js`). No screen holds
private state, so they cannot disagree.

---

## Where the AI is, and where it deliberately is not

Five real modules under `src/ai/`. Every number they produce is labelled
**Demo model output** on screen.

| Module | What it does | Why it is AI (or isn't) |
|---|---|---|
| `deliveryModel.js` | Logistic P(deliver) on 7 features; returns each feature's contribution to the log-odds | A score that **moves**: 0.23 blind → 0.70 once the customer picks a slot → 0.85 if they also prepay. The hub shows which feature moved it. |
| `intent.js` | Two paths. A **tap** returns `source: 'rule'`, confidence 1.00. A **spoken** reply goes through a lexical scorer with softmax calibration + time extraction. | A button press is a fact, not a prediction. The console says so. Free text exists only on the voice call, which is the one place the customer actually speaks. |
| `integrity.js` | Four hard checks (GPS, dwell, call log, photo) and a weighted evidence score | Rules are the right tool. We report the evidence score, not a probability we can't justify. |
| `ladder.js` | Rung eligibility tree + hold-days `(p·S − c) / h` | Operations research, computed live. Reproduces the deck's 3.3 and 5.9 day results exactly. |
| `queue.js` | Ranks 47 NDRs by `(1 − P(deliver)) × ₹120 × P(reach)` | Points the ₹8 voice budget at the parcels where intervention is worth most. |

**Confidence floor.** A spoken reply parsed below 0.70 is *not acted on*. It is
routed to a human agent. Try "Haan theek hai dekh lenge" on the voice call.

---

## Implemented flows

| # | Flow | Path |
|---|---|---|
| A | Reschedule | Tap → slot → NIS → rider → delivered |
| B | Collect nearby | Tap → kirana + OTP → rider diverted → collected (rung 2, ₹8) |
| C | Pay now & retry | Tap → ₹284 paid → COD→prepaid → rider "do not collect cash" |
| D | No response | WhatsApp → SMS → Vaani voice → ladder. Three rungs, then it stops. |
| E | Voice answered | Hindi/Hinglish speech → NLU → intent + slot → same operational action |
| F | Customer declines | Stops all contact, stands the rider down, routes to the ladder |
| G | Misses the slot | One reschedule max → kirana, never a second slot |
| H | Rider can't deliver | Five reasons, five different routes |
| I | Suspicious attempt | GPS/dwell/call fail → FLAGGED → re-queued, no penalty, customer asked |
| J | Customer disputes | "Nobody came" on the call re-scores the attempt and flags it |
| K | Today's queue | 47 NDRs ranked; 3 flagged; 5 voice calls (riskiest 10%) |

## Edge cases the state machine refuses

- Deliver before starting, or before reaching the address
- Deliver outside the window the customer chose
- Start a delivery before the slot is within 45 minutes
- More than one reschedule per order
- Reschedule, pay or pick up after the parcel is delivered or collected
- Two mutually exclusive recovery choices at once
- Rider collecting cash on a kirana divert or a cancelled order
- Hold-and-retry (rung 1) after the reschedule budget is spent
- Kirana collection for a customer who said they don't want the parcel
- Inventory netting for a **sized** SKU — a size 9 can't be netted
- Any further messaging after the contact ladder is exhausted

`can(state, action)` is used by the reducer **and** by the UI, so a disallowed
action is a disabled button, never an error or a silent impossible state.

---

## Folder structure

```
t30-prototype/
├── index.html
├── tailwind.config.js          Meesho palette and motion tokens
└── src/
    ├── App.jsx                 Stage, view switcher, keyboard shortcuts
    ├── ai/
    │   ├── deliveryModel.js    P(deliver) + per-feature contributions
    │   ├── intent.js           Tap → rule · speech → NLU + time extraction
    │   ├── integrity.js        Attempt integrity (#12)
    │   ├── ladder.js           Recovery ladder (#14) + hold-days maths
    │   └── queue.js            NDR prioritisation (seeded, deterministic)
    ├── demo/
    │   ├── scenario.js         The one order, one clock, unit costs
    │   ├── machine.js          Reducer, guards, selectors
    │   └── DemoContext.jsx     Provider, scripted steps, scenario jumps
    ├── components/             PhoneFrame, Timeline, DemoBar, primitives
    └── screens/
        ├── customer/           WhatsApp · Sms · CallOverlay · Tracking
        ├── hub/                HubConsole + panels
        └── rider/              RiderApp
```

---

## The fixed scenario

Every timestamp in the app derives from `src/demo/scenario.js`. There is one
order and one clock.

| | |
|---|---|
| Customer | Vinayak, C314 Hall 1 IIT Kanpur, Kalyanpur, Kanpur – 208016 |
| Order | Men's Running Shoes, Size 9, ₹299, COD, `#MH7826352190` |
| Attempt failed | 14 May, **9:41 AM** (T+0) |
| NDR + integrity | **9:43 AM** (T+2) |
| Customer reached | **10:11 AM** (T+30) |
| SMS fallback | 10:26 AM (T+45) · Voice 10:41 AM (T+60) · Ladder 1:41 PM (T+4h) |

---

## Data honesty

**Case pack / Round 2 deck (real):** ₹50 forward and ₹120 reverse unit costs ·
WhatsApp utility ₹0.145/NDR · Vaani voice ₹8/call · kirana ₹8 COD / ₹18 prepaid ·
rung costs ₹21 / ₹8 / ₹5 / ₹30 / ₹21 · ₹99 liquidation cap · 600 m kirana rule ·
48-hour collection window · one reschedule maximum · voice to the riskiest 10% ·
hold-days formula and its rack + intent-decay inputs.

**Demo model output (labelled on screen):** every P(deliver), every NLU
confidence, the integrity evidence score, the 47-row queue and its priorities.
The logistic coefficients are illustrative and chosen for the demo — they are
**not** fitted on Meesho data, and the console says so under the score.

**Never shown to the customer:** ₹120 reverse cost, P(deliver), AI confidence,
rung economics, hub metrics. The customer app carries only what a customer needs.

The hub's "Outcome vs doing nothing" strip is marked *case assumption · internal
view only* for exactly this reason.

---

## 75-second demo script

> **0:00 — the problem.** "9:41 AM. The rider marks Vinayak unavailable. Today
> that becomes a blind second attempt tomorrow, and then a return Meesho pays
> for. Watch what happens instead."

> **0:08 — press `→`.** "T+2. The NDR is logged and the attempt is scored —
> GPS 12 metres, dwell 4 minutes 20, call placed. Verified. A fake attempt
> would be flagged here, and the rider would not be punished for it."

> **0:20 — press `→`.** "T+30. WhatsApp reaches Vinayak with three choices. He
> doesn't type anything — these are buttons, because he's in Tier-3 Kanpur, not
> a product demo."
>
> *Point at the hub:* "The model puts a blind re-attempt at **0.23**, and it
> tells you why: COD, a previous failure, a medium-confidence address, and we
> attempted outside the hours he's ever home."

> **0:38 — tap "Reschedule delivery" on the phone, then "Today, 6–8 PM".**
>
> "One tap. Now watch all three screens."
> - "**0.23 to 0.70.** The slot he chose himself is the single biggest term in
>   the model."
> - "The console shows the chain: input, rule, reading, action. It says
>   *deterministic* — a button press is a fact, we don't dress it up as AI."
> - "**The rider has the new window** — and Start Delivery is locked until 6 PM.
>   He cannot deliver early and he cannot mark delivered before he's been."

> **1:00 — press `→` three times.** 5:20 PM, on the way, reached, delivered.
> "Recovered. Reverse trip avoided."

> **1:12 — the one that wins it.** Press **Reset**, then **No response** in the
> Jump bar. Answer the call. Pick *"shaam ko chhe baje ke baad ghar pe
> rahunga"*.
>
> "WhatsApp went unanswered, SMS went unanswered, so Vaani calls in Hindi. This
> is the only place the customer produces free text — because he's speaking.
> The model reads RESCHEDULE at 0.98, pulls 6 PM out of *chhe baje*, and shows
> you the exact phrases it matched. Below 0.70 it doesn't act — a human does."

**If you have 30 more seconds:** Jump to **Misses the slot** — "one reschedule,
never two; the parcel goes to a kirana 600 metres away for ₹8 instead of ₹120" —
or **Fake attempt** — "GPS 340 metres, 12 seconds, no call. Flagged, re-queued,
and we ask the customer, so the fake reports itself."

---

## Known limitations

1. **In-memory state.** A browser refresh resets to T+0. Deliberate for a demo —
   `R` and refresh both give a clean start — but there is no persistence layer.
2. **The voice call is a picker, not a microphone.** The utterances are a fixed
   list standing in for speech; the NLU that parses them is real, and it will
   parse any string passed to `fromUtterance()`.
3. **The models are illustrative.** The logistic coefficients, the NLU weights
   and the queue's reach scores were chosen to behave sensibly, not fitted.
4. **One parcel is live.** The other 46 NDRs in the queue are generated data and
   are not independently clickable.
5. **No real integrations.** Chorus, Vaani, NIS, GeoIndia, TrustMesh and PRISM
   appear as named destinations, not connections.
6. **Desktop-first.** Built for 1440×900 and 1920×1080, and verified at 1280×800.
   Below 1180px the three-up stage falls back to a single console with a hint
   rather than crushing three columns; the view tabs still work. The phones are
   realistic mobile screens, but the stage itself is not a mobile layout.
