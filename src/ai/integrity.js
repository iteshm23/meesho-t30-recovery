// ─────────────────────────────────────────────────────────────────────────────
// Solution #12 — attempt integrity.
//
// Deliberately NOT a neural net: it is four hard checks plus a weighted
// confidence score. When the rider marks "customer unavailable", we ask whether
// the device evidence is consistent with someone having actually stood at the
// door. Rules are the right tool here and the hub says so on screen.
//
// Flagged ≠ punished. A flagged attempt is re-queued, and the T+30 message to
// the customer carries an extra question — "Did the rider come?" — so the
// customer's own reply audits the attempt. (Round 2 deck, #12.)
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHTS = { gps: 0.35, dwell: 0.30, call: 0.20, photo: 0.15 }

export function scoreIntegrity(ev) {
  const checks = [
    {
      key: 'gps',
      label: 'GPS distance to address',
      value: `${ev.gpsDistanceM} m`,
      rule: `within ${ev.geofenceM} m geofence`,
      pass: ev.gpsDistanceM <= ev.geofenceM,
      weight: WEIGHTS.gps,
    },
    {
      key: 'dwell',
      label: 'Dwell time at location',
      value: fmtDur(ev.dwellSeconds),
      rule: `at least ${fmtDur(ev.minDwellSeconds)}`,
      pass: ev.dwellSeconds >= ev.minDwellSeconds,
      weight: WEIGHTS.dwell,
    },
    {
      key: 'call',
      label: 'Call placed by rider',
      value: ev.callPlaced ? `Yes (${fmtDur(ev.callDurationSeconds)})` : 'No call found',
      rule: 'call log shows an outgoing call',
      pass: !!ev.callPlaced,
      weight: WEIGHTS.call,
    },
    {
      key: 'photo',
      label: 'Doorstep photo captured',
      value: ev.photoCaptured ? 'Yes' : 'Not captured',
      rule: 'photo attached to the attempt',
      pass: !!ev.photoCaptured,
      weight: WEIGHTS.photo,
    },
  ]

  // Evidence score = weighted share of checks that passed. We report the score
  // itself rather than dressing it up as a probability we cannot justify.
  const score = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0)
  const failed = checks.filter((c) => !c.pass)
  const passedCount = checks.length - failed.length
  // GPS is mandatory: you cannot have attempted a door you were never near.
  const gpsOk = checks.find((c) => c.key === 'gps').pass
  const verified = gpsOk && score >= 0.80

  return {
    checks,
    failed,
    verified,
    passedCount,
    total: checks.length,
    score,
    status: verified ? 'VERIFIED' : 'FLAGGED',
    // What the system DOES about it — never a penalty on its own.
    action: verified
      ? 'Attempt accepted. NDR proceeds to T+30 recovery.'
      : 'Attempt re-queued, no rider penalty. Customer asked to confirm the visit.',
  }
}

export function fmtDur(s) {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m}m ${r}s` : `${m}m`
}
