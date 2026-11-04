export function normalizeWhatsappDialNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function buildWhatsappContinueUrl(
  ownerPhone: string | null | undefined,
  listingTitle: string,
  listingId: string,
  webOrigin: string,
): string | null {
  if (!ownerPhone?.trim()) {
    return null;
  }
  const origin = webOrigin.replace(/\/$/, '');
  const text = encodeURIComponent(
    `Hi, I'm interested in "${listingTitle}" on MYKWATTA (${origin}/listings/${listingId}).`,
  );
  return `https://wa.me/${normalizeWhatsappDialNumber(ownerPhone)}?text=${text}`;
}
