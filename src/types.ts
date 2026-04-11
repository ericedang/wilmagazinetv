export interface Article {
  id: string;
  title: string;
  title_en?: string;
  excerpt: string;
  excerpt_en?: string;
  content: string;
  content_en?: string;
  author: string;
  date: string;
  category: string;
  category_en?: string;
  image: string;
  isPremium: boolean;
}

export interface Video {
  id: string;
  title: string;
  title_en?: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  category: string;
  category_en?: string;
  description: string;
  description_en?: string;
}

export interface Magazine {
  id: string;
  title: string;
  title_en?: string;
  issueDate: string;
  issueDate_en?: string;
  coverImage: string;
  pdfUrl: string;
  description: string;
  description_en?: string;
}

export interface Event {
  id: string;
  title: string;
  title_en?: string;
  date: string;
  date_en?: string;
  location: string;
  location_en?: string;
  description: string;
  description_en?: string;
  image: string;
  price: string;
  attendees: string;
  ticketTypes?: {
    name: string;
    name_en?: string;
    price: string;
  }[];
}

export interface Reservation {
  id: string;
  eventId: string;
  eventTitle: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  ticketType: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: any;
}

export type SectionType = 'texte' | 'cartes' | 'galerie' | 'cta' | 'stats' | 'logos' | 'temoignages' | 'deux_colonnes' | 'citation' | 'leadership' | 'quote' | 'story' | 'mindset' | 'featured_video' | 'image_seule';

export interface CustomSection {
  id: string;
  page_slug: string;
  section_type: SectionType;
  title?: string;
  content: any;
  order_index: number;
  is_active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  targetId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  createdAt: any;
}

export interface Announcement {
  id: string;
  text: string;
  isActive: boolean;
  createdAt: any;
}
