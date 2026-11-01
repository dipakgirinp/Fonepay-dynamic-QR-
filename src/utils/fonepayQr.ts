/**
 * Fonepay & EMVCo QR Code Generator & Parser
 * Spec: EMVCo Merchant-Presented QR Code Specification for Payment Systems
 * Extracted from Giri Kirana Store Terminal: 2222020017969383
 */

export interface FonepayMerchantInfo {
  merchantName: string;
  terminalId: string;
  terminalLabel: string;
  city: string;
  mcc: string;
  currency: string;
  country: string;
  acquirer: string;
}

export const DEFAULT_MERCHANT: FonepayMerchantInfo = {
  merchantName: 'Giri Kirana Store',
  terminalId: '2222020017969383',
  terminalLabel: '1844524',
  city: 'Kathmandu MP',
  mcc: '5331',
  currency: '524', // NPR (ISO 4217)
  country: 'NP',
  acquirer: 'eSewa',
};

/**
 * Parses raw EMVCo TLV string into key-value map
 */
export function parseEmvcoTags(data: string): Record<string, string> {
  const tags: Record<string, string> = {};
  let idx = 0;
  while (idx < data.length - 4) {
    const tag = data.substring(idx, idx + 2);
    const lenStr = data.substring(idx + 2, idx + 4);
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || idx + 4 + len > data.length) break;
    const value = data.substring(idx + 4, idx + 4 + len);
    tags[tag] = value;
    idx = idx + 4 + len;
  }
  return tags;
}

/**
 * Parses a static or dynamic Fonepay QR string and extracts merchant destination credentials
 */
export function parseFonepayQr(qrString: string): Partial<FonepayMerchantInfo> | null {
  try {
    const cleanStr = qrString.trim();
    const tags = parseEmvcoTags(cleanStr);
    if (!tags['00']) return null; // Must have Tag 00

    // Extract terminal ID from Merchant Account Info (Tag 26 or 27-51)
    let terminalId = '';
    const tag26 = tags['26'] || tags['27'] || tags['28'];
    if (tag26) {
      const sub26 = parseEmvcoTags(tag26);
      terminalId = sub26['07'] || sub26['01'] || sub26['02'] || '';
    }

    // Extract terminal label from Tag 62
    let terminalLabel = '';
    const tag62 = tags['62'];
    if (tag62) {
      const sub62 = parseEmvcoTags(tag62);
      terminalLabel = sub62['07'] || sub62['01'] || '';
    }

    return {
      merchantName: tags['59'] || '',
      terminalId: terminalId,
      terminalLabel: terminalLabel || '1844524',
      city: tags['60'] || '',
      mcc: tags['52'] || '5331',
      currency: tags['53'] || '524',
      country: tags['58'] || 'NP',
      acquirer: 'eSewa',
    };
  } catch {
    return null;
  }
}

/**
 * Formats a single EMVCo TLV (Tag, Length, Value)
 */
export function formatTag(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Calculates standard CRC-16-CCITT (polynomial 0x1021, initial 0xFFFF)
 * Used in EMVCo Tag 63.
 */
export function calculateCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).padStart(4, '0').toLowerCase();
}

/**
 * Generates an authentic Fonepay QR string.
 * When amount > 0, generates a Dynamic QR (Tag 01 = '12', Tag 54 = amount).
 * When amount == 0 or empty, generates Static QR (Tag 01 = '11', matching original standee).
 */
export function buildFonepayQr(
  amount: number | string = 0,
  billNumber = '',
  merchant: FonepayMerchantInfo = DEFAULT_MERCHANT
): { qrPayload: string; isDynamic: boolean; formattedAmount: string } {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const isDynamic = !isNaN(numAmount) && numAmount > 0;
  const formattedAmount = isDynamic ? numAmount.toFixed(2) : '';

  // Tag 01: Point of Initiation Method: 11 = Static, 12 = Dynamic
  const t01 = isDynamic ? '12' : '11';

  // Tag 26: Merchant Account Information (Fonepay AID + Terminal ID)
  const t26Sub =
    formatTag('00', 'fonepay.com') +
    formatTag('07', merchant.terminalId);
  const t26 = formatTag('26', t26Sub);

  let payload = '';
  // Tag 00: Payload Format Indicator
  payload += formatTag('00', '01');
  // Tag 01: Point of Initiation
  payload += formatTag('01', t01);
  // Tag 26: Merchant Account Information
  payload += t26;
  // Tag 52: Merchant Category Code
  payload += formatTag('52', merchant.mcc);
  // Tag 53: Transaction Currency (524 = NPR)
  payload += formatTag('53', merchant.currency);

  // Tag 54: Transaction Amount (Present in dynamic QR)
  if (isDynamic) {
    payload += formatTag('54', formattedAmount);
  }

  // Tag 58: Country Code
  payload += formatTag('58', merchant.country);
  // Tag 59: Merchant Name
  payload += formatTag('59', merchant.merchantName);
  // Tag 60: Merchant City
  payload += formatTag('60', merchant.city);

  // Tag 62: Additional Data Field Template
  let t62Sub = '';
  if (billNumber.trim()) {
    t62Sub += formatTag('01', billNumber.trim());
  }
  t62Sub += formatTag('07', merchant.terminalLabel);
  payload += formatTag('62', t62Sub);

  // Tag 63: CRC Checksum
  payload += '6304';
  const checksum = calculateCrc16(payload);
  const fullPayload = payload + checksum;

  return {
    qrPayload: fullPayload,
    isDynamic,
    formattedAmount,
  };
}

/**
 * Format currency in Nepalese Rupee (NPR) display format
 */
export function formatNpr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace('NPR', 'रू');
}

/**
 * Convert number to words in English (Rupees)
 */
export function amountToWords(amount: number): string {
  if (isNaN(amount) || amount <= 0) return '';
  const rounded = Math.round(amount);
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  if (rounded === 0) return 'Zero Rupees';

  let result = '';
  const crore = Math.floor(rounded / 10000000);
  let rem = rounded % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  if (crore > 0) result += convertGroup(crore) + ' Crore ';
  if (lakh > 0) result += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) result += convertGroup(thousand) + ' Thousand ';
  if (rem > 0) result += convertGroup(rem) + ' ';

  return result.trim() + ' Rupees Only';
}

/**
 * Procedural Audio Synthesizer using Web Audio API
 */
class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playKeyClick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.045);
    } catch {
      // Audio context might be restricted
    }
  }

  public playClear() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.085);
    } catch {
      // Ignore
    }
  }

  public playSuccess() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // 2-tone melodic chime (POS payment sound)
      const freqs = [587.33, 880]; // D5 -> A5
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.15, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.36);
      });
    } catch {
      // Ignore
    }
  }
}

export const sounds = new SoundEffects();
