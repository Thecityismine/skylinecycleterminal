import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { sendTelegram } from './telegram';

const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID   = defineSecret('TELEGRAM_CHAT_ID');

// Runs daily at 9:00 AM Eastern.
// Alert logic will be added per indicator once reviewed.
export const dailyAlertCheck = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'America/New_York',
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID],
    region: 'us-central1',
  },
  async () => {
    const token  = TELEGRAM_BOT_TOKEN.value();
    const chatId = TELEGRAM_CHAT_ID.value();

    const alerts: string[] = [];

    // ── Alert checks will be added here ──────────────────────────────────────
    //
    // Pattern for each check:
    //
    //   const data = await fetch('https://your-app.com/api/...').then(r => r.json());
    //   if (data.someValue < threshold) {
    //     alerts.push('🟢 *Indicator Name* — condition description');
    //   }
    //
    // ─────────────────────────────────────────────────────────────────────────

    if (alerts.length === 0) return;

    const lines = [
      '*📡 Skyline Cycle Terminal*',
      `_Daily Alert — ${new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' })}_`,
      '',
      ...alerts,
    ];

    await sendTelegram(token, chatId, lines.join('\n'));
  }
);
