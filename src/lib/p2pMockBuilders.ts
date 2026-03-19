import type { User } from '@/contexts/UserContext';
import type { P2PParticipant, P2PPaymentDetails } from '@/contexts/P2PContext';
import type { P2POffer, PaymentMethod, SavedPaymentMethod } from '@/components/p2p';

export function p2pParticipantFromUser(user: User): P2PParticipant {
  return {
    id: user.id,
    name: user.name,
    nameAr: user.name, // No Arabic name in UserContext (mock)
    username: user.username,
    avatar: user.avatar || '👤',
    rating: 4.9, // Mock rating
    country: user.country,
  };
}

export function p2pParticipantFromOfferUser(offer: P2POffer): P2PParticipant {
  return {
    id: offer.user.id,
    name: offer.user.name,
    nameAr: offer.user.nameAr,
    username: `user_${offer.user.id.slice(0, 8)}`, // Offer type has no username field; show truncated ID
    avatar: offer.user.avatar,
    rating: offer.user.rating,
    country: offer.country.name,
  };
}

export function p2pPlaceholderParticipant(
  role: 'buyer' | 'seller',
  countryName: string
): P2PParticipant {
  return {
    id: `mock-${role}-${countryName.replace(/\s+/g, '-').toLowerCase()}`,
    name: role === 'buyer' ? 'Market Buyer' : 'Market Seller',
    nameAr: role === 'buyer' ? 'مشتري السوق' : 'بائع السوق',
    username: role === 'buyer' ? 'market_buyer' : 'market_seller',
    avatar: role === 'buyer' ? '🧑' : '🧑‍💼',
    rating: 4.7,
    country: countryName,
  };
}

export function p2pPaymentDetailsFromOffer(offer: P2POffer): P2PPaymentDetails {
  const primary = offer.paymentMethods[0];
  return {
    bankName: primary?.name || 'Bank Transfer',
    accountNumber: '—', // Offer data does not include seller's account number; shown after order is matched
    accountHolder: offer.user.nameAr || offer.user.name,
    isLocked: true,
  };
}

export function p2pPaymentDetailsFromPaymentMethod(
  paymentMethod: PaymentMethod,
  accountHolder: string
): P2PPaymentDetails {
  return {
    bankName: paymentMethod.name,
    accountNumber: '—',
    accountHolder,
    isLocked: true,
  };
}

export function p2pPaymentDetailsFromSavedMethod(method: SavedPaymentMethod): P2PPaymentDetails {
  return {
    bankName: method.providerName,
    accountNumber: method.accountNumber || method.phoneNumber || method.iban || '—',
    accountHolder: method.fullName,
    isLocked: true,
  };
}
