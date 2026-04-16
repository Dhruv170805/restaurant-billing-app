import { generateWhatsAppShareUrl } from './whatsapp';

/**
 * High-fidelity social sharing service for restaurant orders.
 * Generates formatted intent URLs for One-Tap sharing to major social platforms.
 */
export function getOrderSharingLinks(order: any, tenant: any) {
  const currency = tenant?.config?.currencySymbol || '₹';
  
  // Format the item list for a beautiful text receipt
  const itemText = order.items
    .map((i: any) => `• ${i.name} x${i.quantity}`)
    .join('\n');

  const shareText = `🧾 *RECEIPT FROM ${tenant.name.toUpperCase()}*\n\n` +
    `Order ID: #${order.id}\n` +
    `Date: ${new Date(order.created_at || order.createdAt).toLocaleDateString()}\n` +
    `--------------------------\n` +
    `${itemText}\n` +
    `--------------------------\n` +
    `*TOTAL: ${currency} ${parseFloat(order.total).toFixed(2)}*\n\n` +
    `Thank you for dining with us! ✨`;

  return {
    whatsapp: generateWhatsAppShareUrl(order.customer_phone || '', shareText),
    instagram: `instagram://sharesheet?text=${encodeURIComponent(shareText)}`,
    generic: shareText
  };
}
