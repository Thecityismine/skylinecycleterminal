import { onSchedule }    from 'firebase-functions/v2/scheduler';
import { defineSecret }  from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore }  from 'firebase-admin/firestore';
import { sendTelegram }  from './telegram';
import { computeAlerts, toStoredState, type SignalsPayload, type CyclePayload, type StoredState } from './alerts';

const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID   = defineSecret('TELEGRAM_CHAT_ID');

const APP_URL = 'https://skylinecycleterminal.vercel.app';

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
    const token  = TELEGRAM_BOT_TOKEN.value();
    const chatId = TELEGRAM_CHAT_ID.value();

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
