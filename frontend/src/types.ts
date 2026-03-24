export interface User {
  id: number;
  username: string;
  role: string;
}

export interface PostSummary {
  id: number;
  title: string;
  slug: string;
  summary: string;
  cover_image: string | null;
  video_url: string | null;
  video_upload_path: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface PostDetail extends PostSummary {
  markdown_content: string;
  html_content: string;
}

export interface PostPayload {
  title: string;
  slug?: string | null;
  summary: string;
  cover_image: string | null;
  markdown_content: string;
  video_url: string | null;
  video_upload_path: string | null;
  is_published: boolean;
}

export interface ImageLibraryItem {
  id: string;
  url: string;
  title: string;
  source: string;
  slug: string | null;
}
