export type UserRole = 'farmer' | 'buyer' | 'cooperative' | 'exporter' | 'transport' | 'company' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  region?: string;
  district?: string;
  village?: string;
  companyName?: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  totalSold?: number;
  totalBought?: number;
  createdAt: string;
  telegram?: string;
  whatsapp?: string;
}

export type ListingCategory =
  | 'vegetables' | 'fruits' | 'grain' | 'dairy' | 'meat' | 'poultry'
  | 'eggs' | 'honey' | 'feed' | 'fertilizer' | 'seeds' | 'equipment'
  | 'tractor' | 'irrigation' | 'greenhouse' | 'livestock' | 'other';

export interface BulkPrice {
  minQty: number;
  maxQty: number | null;
  unit: string;
  price: number;
}

export interface Listing {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  ownerRating: number;
  ownerVerified: boolean;
  title: string;
  category: ListingCategory;
  images: string[];
  description: string;
  price: number;
  currency: string;
  unit: string;
  minOrder: number;
  maxOrder?: number;
  bulkPrices?: BulkPrice[];
  weight?: number;
  volume?: number;
  region: string;
  district?: string;
  organic: boolean;
  exportReady: boolean;
  hasDelivery: boolean;
  inStock: boolean;
  vip: boolean;
  gpsLat?: number;
  gpsLng?: number;
  qualityCert?: string;
  harvestDate?: string;
  views: number;
  createdAt: string;
}

export interface Review {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  targetId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Order {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  address: string;
  phone: string;
  comment?: string;
  deliveryDate?: string;
  paymentMethod: string;
  status: 'new' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Announcement {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  title: string;
  category: ListingCategory;
  qty: number;
  unit: string;
  region: string;
  description: string;
  deadline?: string;
  status: 'open' | 'closed';
  offerCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  participants: { id: string; name: string; avatar?: string }[];
  lastMessage?: string;
  lastAt?: string;
  unread: number;
}

export interface TransportListing {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  type: 'truck' | 'kamaz' | 'gazelle' | 'refrigerator' | 'tractor';
  capacity: string;
  route: string;
  availableDates: string;
  region: string;
  price?: number;
  createdAt: string;
}

export interface MarketPrice {
  id: string;
  name: string;
  category: string;
  unit: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  weekChange: number;
  monthChange: number;
  updatedAt: string;
}
