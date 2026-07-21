/**
 * Helper para geração de links diretos e mensagens formatadas para WhatsApp Web/App
 */

export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

export function generateProposalWhatsAppMessage({
  clientName,
  totalKwp,
  monthlySavings,
  proposalUrl
}: {
  clientName: string;
  totalKwp: number;
  monthlySavings: number;
  proposalUrl?: string;
}): string {
  const formattedSavings = monthlySavings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedKwp = totalKwp.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  let text = `Olá *${clientName}*! tudo bem?\n\n`;
  text += `Elaboramos a sua *Proposta de Energia Solar Fotovoltaica* personalizada!\n\n`;
  text += `⚡ *Potência da Usina:* ${formattedKwp} kWp\n`;
  text += `💰 *Economia Estimada:* cerca de ${formattedSavings}/mês\n\n`;

  if (proposalUrl) {
    text += `📲 Acesse sua proposta completa e interativa pelo link:\n${proposalUrl}\n\n`;
  }

  text += `Ficamos à disposição para tirar qualquer dúvida e iniciar seu projeto!`;
  return text;
}

export function openWhatsAppChat({
  phone,
  message
}: {
  phone?: string;
  message: string;
}) {
  const cleanPhone = phone ? formatPhoneForWhatsApp(phone) : '';
  const encodedMsg = encodeURIComponent(message);
  const targetUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;
  
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}
