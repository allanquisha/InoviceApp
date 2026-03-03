import twilio from 'twilio';

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) return null;
    client = twilio(sid, token);
  }
  return client;
}

export async function sendSms(to: string, message: string): Promise<void> {
  const c = getClient();
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!c || !from) return; // SMS not configured — silent no-op
  await c.messages.create({ body: message, from, to });
}
