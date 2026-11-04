import { Locale } from './locales';

const catalogs: Record<Locale, Record<string, string>> = {
  en: {
    'auth.otp.sent': 'Your MYKWATTA verification code is {{code}}',
    'payment.receipt': 'Payment receipt for {{amount}} — reference {{reference}}',
    'escrow.held': 'Your deposit of {{amount}} is held in escrow for {{listingTitle}}',
    'escrow.released': 'Escrow of {{amount}} has been released for {{listingTitle}}',
    'listing.report.received':
      'We received your report about listing "{{listingTitle}}". Our team will review it.',
    'whatsapp.inquiry.continue':
      'Continue your inquiry about "{{listingTitle}}" on MYKWATTA: {{link}}',
    'whatsapp.appointment.continue':
      'Confirm or manage your visit for "{{listingTitle}}": {{link}}',
    'digest.leads.subject': 'Your MYKWATTA lead digest — {{count}} new inquiries',
  },
  fr: {
    'auth.otp.sent': 'Votre code de vérification MYKWATTA est {{code}}',
    'payment.receipt':
      'Reçu de paiement pour {{amount}} — référence {{reference}}',
    'escrow.held':
      'Votre dépôt de {{amount}} est retenu en séquestre pour {{listingTitle}}',
    'escrow.released':
      'Le séquestre de {{amount}} a été libéré pour {{listingTitle}}',
    'listing.report.received':
      'Nous avons reçu votre signalement concernant l\'annonce « {{listingTitle}} ». Notre équipe va l\'examiner.',
    'whatsapp.inquiry.continue':
      'Poursuivez votre demande pour « {{listingTitle}} » sur MYKWATTA : {{link}}',
    'whatsapp.appointment.continue':
      'Confirmez ou gérez votre visite pour « {{listingTitle}} » : {{link}}',
    'digest.leads.subject':
      'Votre récapitulatif de prospects MYKWATTA — {{count}} nouvelles demandes',
  },
};

export function t(
  key: string,
  locale: Locale = 'en',
  vars: Record<string, string | number> = {},
): string {
  const template = catalogs[locale][key] ?? catalogs.en[key] ?? key;
  return Object.entries(vars).reduce(
    (message, [name, value]) =>
      message.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
}
