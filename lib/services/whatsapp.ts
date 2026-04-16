import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import pino from 'pino';

// -- Config --
const SESSION_DIR = path.join(process.cwd(), '.nexus/whatsapp-sessions');

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

let sock: any = null;

/**
 * Initialize the WhatsApp Headless Gateway.
 * This is the "Zero-Cost" heart of our notification engine.
 */
export async function initWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update: any) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔌 WhatsApp connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
      if (shouldReconnect) initWhatsApp();
    } else if (connection === 'open') {
      console.log('✅ WhatsApp gateway connected successfully');
    }
  });

  return sock;
}

/**
 * Send a message via the WhatsApp gateway.
 */
export async function sendWhatsAppMessage(to: string, text: string) {
  if (!sock) await initWhatsApp();
  
  // Format number (strip +, add suffix if missing)
  const jid = to.replace(/\D/g, '') + '@s.whatsapp.net';
  
  try {
    const result = await sock.sendMessage(jid, { text });
    return result;
  } catch (err) {
    console.error(`❌ Failed to send WhatsApp to ${to}:`, err);
    throw err;
  }
}

/**
 * Generate a "One-Tap" WhatsApp sharing link.
 */
export function generateWhatsAppShareUrl(phone: string, text: string): string {
  const encodedText = encodeURIComponent(text);
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}/?text=${encodedText}`;
}
