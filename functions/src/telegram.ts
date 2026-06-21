import * as https from 'https';

export async function sendTelegram(token: string, chatId: string, message: string): Promise<void> {
  const body = JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const parsed = JSON.parse(data);
          if (!parsed.ok) reject(new Error(`Telegram error: ${JSON.stringify(parsed)}`));
          else resolve();
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
