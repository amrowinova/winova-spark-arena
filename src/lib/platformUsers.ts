import type { EngagementStatus, UserRank } from "@/contexts/UserContext";

export interface PlatformUser {
  id: string;
  name: string;
  nameAr: string;
  username: string;
  avatar: string; // emoji (no placeholder generation)
  rank: UserRank;
  country: string;
  countryAr: string;
  city: string;
  cityAr: string;
  isOnline: boolean;
  lastSeen?: string;
  lastSeenAr?: string;
  engagementStatus?: EngagementStatus;
  p2pStats?: {
    trades: number;
    rating: number;
  };
}

// Single source of truth for mock users.
// IMPORTANT: IDs must be stable and referenced everywhere.
export const PLATFORM_USERS: PlatformUser[] = [
  {
    id: "1",
    name: "Ahmed",
    nameAr: "أحمد",
    username: "ahmed_sa",
    avatar: "👤",
    rank: "marketer",
    country: "Saudi Arabia",
    countryAr: "السعودية",
    city: "Riyadh",
    cityAr: "الرياض",
    isOnline: true,
    engagementStatus: "both",
    p2pStats: { trades: 24, rating: 97 },
  },
  {
    id: "2",
    name: "Sara Ahmed",
    nameAr: "سارة أحمد",
    username: "sara_ahmed",
    avatar: "👤",
    rank: "marketer",
    country: "Saudi Arabia",
    countryAr: "السعودية",
    city: "Jeddah",
    cityAr: "جدة",
    isOnline: true,
    engagementStatus: "both",
    p2pStats: { trades: 67, rating: 96 },
  },
  {
    id: "3",
    name: "Mohammed Karim",
    nameAr: "محمد كريم",
    username: "mohammed_karim",
    avatar: "👤",
    rank: "subscriber",
    country: "Saudi Arabia",
    countryAr: "السعودية",
    city: "Dammam",
    cityAr: "الدمام",
    isOnline: false,
    lastSeen: "10 min ago",
    lastSeenAr: "منذ 10 دقائق",
    engagementStatus: "vote",
    p2pStats: { trades: 12, rating: 93 },
  },
  {
    id: "4",
    name: "Khaled Mohammed",
    nameAr: "خالد محمد",
    username: "khaled_m",
    avatar: "👥",
    rank: "leader",
    country: "Saudi Arabia",
    countryAr: "السعودية",
    city: "Riyadh",
    cityAr: "الرياض",
    isOnline: true,
    engagementStatus: "contest",
    p2pStats: { trades: 41, rating: 98 },
  },
  {
    id: "5",
    name: "Fatima Said",
    nameAr: "فاطمة سعيد",
    username: "fatima_s",
    avatar: "👤",
    rank: "marketer",
    country: "Saudi Arabia",
    countryAr: "السعودية",
    city: "Makkah",
    cityAr: "مكة",
    isOnline: false,
    lastSeen: "2 hours ago",
    lastSeenAr: "منذ ساعتين",
    engagementStatus: "both",
    p2pStats: { trades: 18, rating: 95 },
  },
  {
    id: "6",
    name: "Omar Ahmed",
    nameAr: "عمر أحمد",
    username: "omar_a",
    avatar: "👥",
    rank: "leader",
    country: "Saudi Arabia",
    countryAr: "السعودية",
    city: "Jeddah",
    cityAr: "جدة",
    isOnline: true,
    engagementStatus: "contest",
    p2pStats: { trades: 31, rating: 94 },
  },
  {
    id: "7",
    name: "Layla Hassan",
    nameAr: "ليلى حسن",
    username: "layla_h",
    avatar: "👤",
    rank: "subscriber",
    country: "Saudi Arabia",
    countryAr: "السعودية",
    city: "Medina",
    cityAr: "المدينة",
    isOnline: false,
    lastSeen: "5 hours ago",
    lastSeenAr: "منذ 5 ساعات",
    engagementStatus: "none",
    p2pStats: { trades: 4, rating: 100 },
  },
  {
    id: "8",
    name: "Ahmed Karim",
    nameAr: "أحمد كريم",
    username: "ahmed_karim",
    avatar: "👤",
    rank: "marketer",
    country: "Saudi Arabia",
    countryAr: "السعودية",
    city: "Riyadh",
    cityAr: "الرياض",
    isOnline: true,
    engagementStatus: "vote",
    p2pStats: { trades: 9, rating: 92 },
  },
  {
    id: "9",
    name: "Mohammed Khaled",
    nameAr: "محمد خالد",
    username: "mohammed_k",
    avatar: "👤",
    rank: "subscriber",
    country: "Saudi Arabia",
    countryAr: "السعودية",
    city: "Riyadh",
    cityAr: "الرياض",
    isOnline: true,
    engagementStatus: "both",
    p2pStats: { trades: 22, rating: 91 },
  },
  {
    id: "10",
    name: "Nour El-Din",
    nameAr: "نور الدين",
    username: "nour_d",
    avatar: "👤",
    rank: "subscriber",
    country: "Saudi Arabia",
    countryAr: "السعودية",
    city: "Jeddah",
    cityAr: "جدة",
    isOnline: false,
    lastSeen: "1 day ago",
    lastSeenAr: "منذ يوم",
    engagementStatus: "none",
    p2pStats: { trades: 3, rating: 100 },
  },
  {
    id: "11",
    name: "Ahmed Hassan",
    nameAr: "أحمد حسن",
    username: "ahmed_h",
    avatar: "👑",
    rank: "president",
    country: "Saudi Arabia",
    countryAr: "السعودية",
    city: "Riyadh",
    cityAr: "الرياض",
    isOnline: true,
    engagementStatus: "both",
    p2pStats: { trades: 88, rating: 99 },
  },
];

const byId = new Map(PLATFORM_USERS.map((u) => [u.id, u] as const));
const byUsername = new Map(
  PLATFORM_USERS.map((u) => [u.username.toLowerCase(), u] as const)
);

export function getPlatformUserById(id: string | number | undefined) {
  if (id === undefined || id === null) return undefined;
  return byId.get(String(id));
}

export function getPlatformUserByUsername(username: string | undefined) {
  const key = (username || "").trim().replace(/^@/, "").toLowerCase();
  if (!key) return undefined;
  return byUsername.get(key);
}
