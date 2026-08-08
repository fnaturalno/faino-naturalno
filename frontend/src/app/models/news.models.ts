/** Public list card — GET /api/news */
export interface NewsListItem {
  id: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  publishedAt: string;
  isFeatured: boolean;
}

/** Public detail — GET /api/news/:slug */
export interface NewsDetail extends NewsListItem {
  body: string;
}

export interface NewsPage {
  items: NewsListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** Admin list/detail — bilingual fields */
export interface AdminNewsPost {
  id: number;
  titleUk: string;
  titleEn?: string | null;
  slug: string;
  excerptUk?: string | null;
  excerptEn?: string | null;
  bodyUk: string;
  bodyEn?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNewsPage {
  items: AdminNewsPost[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface SaveNewsRequest {
  titleUk: string;
  titleEn?: string | null;
  slug?: string | null;
  excerptUk?: string | null;
  excerptEn?: string | null;
  bodyUk: string;
  bodyEn?: string | null;
  coverImageUrl?: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt?: string | null;
}
