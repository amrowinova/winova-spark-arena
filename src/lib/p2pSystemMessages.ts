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
      en: `🤝 Order Accepted\n${buyerName} will transfer ${currencySymbol} ${localAmount?.toFixed(2)} for ${novaAmount?.toFixed(0)} Nova`,
      ar: `🤝 تم قبول الطلب\nسيقوم ${buyerName} بتحويل ${localAmount?.toFixed(2)} ${currencySymbol} مقابل ${novaAmount?.toFixed(0)} Nova`,
    }),
    icon: '🤝',
  },

  buyer_copied_bank: {
    type: 'buyer_copied_bank',
    getContent: () => ({
      en: '📋 Buyer copied bank transfer details',
      ar: '📋 قام المشتري بنسخ معلومات التحويل البنكي',
    }),
    icon: '📋',
  },

  buyer_paid: {
    type: 'buyer_paid',
    getContent: ({ localAmount, currencySymbol }) => ({
      en: `💸 Buyer confirmed transfer\nPlease verify receipt of ${currencySymbol} ${localAmount?.toFixed(2)}`,
      ar: `💸 قام المشتري بتأكيد التحويل\nالرجاء التأكد من وصول ${localAmount?.toFixed(2)} ${currencySymbol}`,
    }),
    icon: '💸',
  },

  seller_verify_prompt: {
    type: 'seller_verify_prompt',
    getContent: ({ localAmount, currencySymbol, buyerName }) => ({
      en: `⚠️ Verify Payment\nConfirm that ${currencySymbol} ${localAmount?.toFixed(2)} arrived from ${buyerName}\n\n✅ Received → Release Nova\n⏳ Not Received → Extend Time / Dispute`,
      ar: `⚠️ تأكد من الدفع\nتأكد أن المبلغ ${localAmount?.toFixed(2)} ${currencySymbol} وصلك من ${buyerName}\n\n✅ وصلني → تحرير Nova\n⏳ لم يصلني → تمديد الوقت / نزاع`,
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
