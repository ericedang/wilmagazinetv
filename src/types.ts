export interface Article {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  excerpt: string;
  excerpt_en?: string;
  excerpt_es?: string;
  content: string;
  content_en?: string;
  content_es?: string;
  author: string;
  date: string;
  category: string;
  category_en?: string;
  category_es?: string;
  image: string;
  isPremium: boolean;
}

export interface Video {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  category: string;
  category_en?: string;
  category_es?: string;
  description: string;
  description_en?: string;
  description_es?: string;
}

export interface Magazine {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  issueDate: string;
  issueDate_en?: string;
  issueDate_es?: string;
  coverImage: string;
  pdfUrl: string;
  description: string;
  description_en?: string;
  description_es?: string;
}

export interface Event {
  id: string;
  title: string;
  title_en?: string;
  title_es?: string;
  date: string;
  date_en?: string;
  date_es?: string;
  location: string;
  location_en?: string;
  location_es?: string;
  description: string;
  description_en?: string;
  description_es?: string;
  image: string;
  price: string;
  attendees: string;
  ticketTypes?: {
    name: string;
    name_en?: string;
    name_es?: string;
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
