// Ember order desk on WhatsApp.
export const WHATSAPP_NUMBER = "+233596770539";

const WHATSAPP_DIGITS = WHATSAPP_NUMBER.replace(/\D/g, "");

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${WHATSAPP_DIGITS}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
