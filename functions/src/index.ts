import { onSchedule }    from 'firebase-functions/v2/scheduler';
import { defineSecret }  from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore }  from 'firebase-admin/firestore';
import { sendTelegram }  from './telegram';
import { computeAlerts, toStoredState, type SignalsPayload, type CyclePayload, type StoredState } from './alerts';

const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID   = defineSecret('TELEGRAM_CHAT_ID');
const CRON_SECRET        = defineSecret('CRON_SECRET');

const APP_URL = 'https://skylinecycleterminal.com';

function initAdmin() {
  if (getApps().length === 0) initializeApp();
}

// Runs daily at 9:00 AM Eastern.
export const dailyAlertCheck = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'America/New_York',
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID],
    region: 'us-central1',
  },
  async () => {
    initAdmin();
    const db     = getFirestore();
    // .trim() guards against trailing whitespace/newlines in the stored secret
    // value, which Node's https.request() rejects outright (CRLF-injection
    // protection) when building the request path.
    const token  = TELEGRAM_BOT_TOKEN.value().trim();
    const chatId = TELEGRAM_CHAT_ID.value().trim();

    // Fetch signals and cycle score in parallel
    const [signals, cycle] = await Promise.all([
      fetch(`${APP_URL}/api/signals`).then(r => r.json()) as Promise<SignalsPayload>,
      fetch(`${APP_URL}/api/cycle`).then(r => r.json())   as Promise<CyclePayload>,
    ]);

    // Load previous state from Firestore
    const stateRef  = db.collection('alertState').doc('signals');
    const stateSnap = await stateRef.get();
    const prev: StoredState = stateSnap.exists ? (stateSnap.data() as StoredState) : {};

    // Compute which alerts should fire
    const alerts = computeAlerts(signals, cycle, prev);

    // Send to Telegram if anything triggered
    if (alerts.length > 0) {
      const date = new Date().toLocaleDateString('en-US', {
        timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric',
      });
      const message = [
        '*📡 Skyline Cycle Terminal*',
        `_Alert — ${date}_`,
        '',
        ...alerts,
      ].join('\n');

      await sendTelegram(token, chatId, message);
    }

    // Persist current state for next comparison
    await stateRef.set({
      ...toStoredState(signals, cycle),
      updatedAt: new Date().toISOString(),
    });
  }
);

// Daily snapshot of the observation store.
//
// Runs at 08:30 Eastern, half an hour ahead of dailyAlertCheck, so the day's
// reading is on record before anything reacts to it.
//
// The work happens in the Next app rather than here: app/api/cron/snapshot owns
// the report computation and the Firestore write, and this function only
// triggers it. Duplicating the twelve vendor adapters into functions/ would
// create a second implementation that could drift from the one the terminal
// actually renders, and a stored history that disagrees with what was shown is
// worse than no stored history at all.
export const dailySnapshot = onSchedule(
  {
    schedule: '30 8 * * *',
    timeZone: 'America/New_York',
    secrets: [CRON_SECRET],
    region: 'us-central1',
    timeoutSeconds: 300,
  },
  async () => {
    const secret = CRON_SECRET.value().trim();

    const res = await fetch(`${APP_URL}/api/cron/snapshot`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.text();

    if (!res.ok) {
      // Thrown so the run is marked failed and Cloud Scheduler retries. A
      // silently skipped day leaves a gap in the history that nothing
      // downstream can tell apart from a genuine one.
      throw new Error(`snapshot failed: HTTP ${res.status} ${body.slice(0, 500)}`);
    }

    console.log('[dailySnapshot]', body.slice(0, 500));
  }
);

// Daily EDGAR candidate pull for the Institutional Adoption Index.
//
// Runs at 07:00 Eastern, before the snapshot, so anything filed overnight is
// waiting by the time the day starts. Same arrangement as dailySnapshot: the
// Next app owns the query and the write, this only triggers it.
//
// A failure here is less serious than a missed snapshot. The route re-covers a
// trailing window rather than only yesterday, so one bad morning is picked up
// by the next run rather than leaving a permanent hole.
export const dailyEdgarPull = onSchedule(
  {
    schedule: '0 7 * * *',
    timeZone: 'America/New_York',
    secrets: [CRON_SECRET],
    region: 'us-central1',
    timeoutSeconds: 300,
  },
  async () => {
    const secret = CRON_SECRET.value().trim();

    const res = await fetch(`${APP_URL}/api/cron/edgar`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.text();

    if (!res.ok) {
      throw new Error(`edgar pull failed: HTTP ${res.status} ${body.slice(0, 500)}`);
    }

    console.log('[dailyEdgarPull]', body.slice(0, 500));
  }
);
