/**
 * P2P System Messages Configuration
 * Centralized message templates for all P2P transaction steps
 */

export type P2PSystemMessageType =
  | 'order_created'
  | 'order_matched'
  | 'buyer_copied_bank'
  | 'buyer_paid'
  | 'seller_verify_prompt'
  | 'time_extended'
  | 'nova_released'
  | 'order_cancelled'
  | 'dispute_opened'
  | 'support_joined'
  | 'dispute_resolved'
  | 'order_expired';

export interface P2PSystemMessageTemplate {
  type: P2PSystemMessageType;
  getContent: (params: P2PMessageParams) => { en: string; ar: string };
  icon: string;
}

export interface P2PMessageParams {
  orderType?: 'buy' | 'sell';
  novaAmount?: number;
  localAmount?: number;
  currencySymbol?: string;
  buyerName?: string;
  sellerName?: string;
  reason?: string;
  orderId?: string;
}

// Message templates for each step
export const P2P_SYSTEM_MESSAGES: Record<P2PSystemMessageType, P2PSystemMessageTemplate> = {
  order_created: {
    type: 'order_created',
    getContent: ({ orderType, novaAmount, localAmount, currencySymbol }) => ({
      en: `🧾 Order Created\n${orderType === 'buy' ? 'Buy' : 'Sell'} ${novaAmount?.toFixed(0) || 0} Nova for ${currencySymbol} ${localAmount?.toFixed(2) || 0}`,
      ar: `🧾 تم إنشاء الطلب\n${orderType === 'buy' ? 'شراء' : 'بيع'} ${novaAmount?.toFixed(0) || 0} Nova مقابل ${localAmount?.toFixed(2) || 0} ${currencySymbol}`,
    }),
    icon: '🧾',
  },

  order_matched: {
    type: 'order_matched',
    getContent: ({ buyerName, localAmount, currencySymbol, novaAmount }) => ({
      en: `🤝 Order Accepted\n\nBuyer: ${buyerName}\nWill transfer: ${currencySymbol} ${localAmount?.toFixed(2)}\nFor: ${novaAmount?.toFixed(0)} Nova\n\n⏳ Timer has started`,
      ar: `🤝 تم قبول الطلب\n\nالمشتري: ${buyerName}\nسيقوم بتحويل: ${localAmount?.toFixed(2)} ${currencySymbol}\nمقابل: ${novaAmount?.toFixed(0)} Nova\n\n⏳ بدأ العداد`,
    }),
    icon: '🤝',
  },

  buyer_copied_bank: {
    type: 'buyer_copied_bank',
    getContent: ({ buyerName }) => ({
      en: `📋 ${buyerName || 'Buyer'} copied bank transfer details\n\n⏳ Awaiting transfer from buyer`,
      ar: `📋 قام ${buyerName || 'المشتري'} بنسخ معلومات التحويل البنكي\n\n⏳ بانتظار التحويل من المشتري`,
    }),
    icon: '📋',
  },

  buyer_paid: {
    type: 'buyer_paid',
    getContent: ({ buyerName, localAmount, currencySymbol, novaAmount }) => ({
      en: `💸 ${buyerName || 'Buyer'} confirmed transfer\n\nAmount: ${currencySymbol} ${localAmount?.toFixed(2)}\nFor: ${novaAmount?.toFixed(0)} Nova\n\n⚠️ Seller: Please verify receipt before releasing`,
      ar: `💸 قام ${buyerName || 'المشتري'} بتأكيد التحويل\n\nالمبلغ: ${localAmount?.toFixed(2)} ${currencySymbol}\nمقابل: ${novaAmount?.toFixed(0)} Nova\n\n⚠️ البائع: تأكد من الاستلام قبل التحرير`,
    }),
    icon: '💸',
  },

  seller_verify_prompt: {
    type: 'seller_verify_prompt',
    getContent: ({ localAmount, currencySymbol, buyerName }) => ({
      en: `⚠️ Payment Verification Required\n\nDid you receive ${currencySymbol} ${localAmount?.toFixed(2)}\nfrom ${buyerName || 'the buyer'}?\n\n✅ Received → Release Nova\n❌ Not Received → Extend Time / Open Dispute\n\n🔒 Security: Transfer must be from buyer's own account`,
      ar: `⚠️ تأكيد الاستلام مطلوب\n\nهل وصلك مبلغ ${localAmount?.toFixed(2)} ${currencySymbol}\nمن ${buyerName || 'المشتري'}؟\n\n✅ وصلني → تحرير Nova\n❌ لم يصلني → تمديد الوقت / فتح نزاع\n\n🔒 أمان: يجب أن يكون التحويل من حساب المشتري نفسه`,
    }),
    icon: '⚠️',
  },

  time_extended: {
    type: 'time_extended',
    getContent: () => ({
      en: '⏳ Deal time extended by 10 extra minutes',
      ar: '⏳ تم تمديد وقت الصفقة 10 دقائق إضافية',
    }),
    icon: '⏳',
  },

  nova_released: {
    type: 'nova_released',
    getContent: ({ novaAmount }) => ({
      en: `🎉 ${novaAmount?.toFixed(0)} Nova released successfully!\nDeal completed`,
      ar: `🎉 تم تحرير ${novaAmount?.toFixed(0)} Nova بنجاح!\nاكتملت الصفقة`,
    }),
    icon: '🎉',
  },

  order_cancelled: {
    type: 'order_cancelled',
    getContent: ({ reason }) => ({
      en: `❌ Order cancelled${reason ? `: ${reason}` : ''}\n🛈 You can continue chatting`,
      ar: `❌ تم إلغاء الطلب${reason ? `: ${reason}` : ''}\n🛈 يمكنكما متابعة الدردشة`,
    }),
    icon: '❌',
  },

  dispute_opened: {
    type: 'dispute_opened',
    getContent: ({ reason }) => ({
      en: `⚖️ Dispute opened${reason ? `: ${reason}` : ''}\nSupport team will join the conversation`,
      ar: `⚖️ تم فتح نزاع${reason ? `: ${reason}` : ''}\nفريق الدعم سينضم للمحادثة`,
    }),
    icon: '⚖️',
  },

  support_joined: {
    type: 'support_joined',
    getContent: () => ({
      en: '🛡️ Support staff has joined the conversation\nPlease provide any evidence to help resolve the dispute',
      ar: '🛡️ انضم موظف الدعم للمحادثة\nيرجى تقديم أي دليل للمساعدة في حل النزاع',
    }),
    icon: '🛡️',
  },

  dispute_resolved: {
    type: 'dispute_resolved',
    getContent: ({ reason }) => ({
      en: `✅ Dispute resolved: ${reason || 'Decision made by support'}`,
      ar: `✅ تم حل النزاع: ${reason || 'تم اتخاذ القرار من قبل الدعم'}`,
    }),
    icon: '✅',
  },

  order_expired: {
    type: 'order_expired',
    getContent: () => ({
      en: '⏰ Time expired – Order has been returned to the marketplace\n🔄 The transaction was not completed in time',
      ar: '⏰ انتهى الوقت – تم إعادة الطلب إلى السوق\n🔄 لم تكتمل الصفقة في الوقت المحدد',
    }),
    icon: '⏰',
  },
};

// Helper function to generate system message content
export function generateSystemMessage(
  type: P2PSystemMessageType,
  params: P2PMessageParams
): { content: string; contentAr: string } {
  const template = P2P_SYSTEM_MESSAGES[type];
  const messages = template.getContent(params);
  return {
    content: messages.en,
    contentAr: messages.ar,
  };
}
