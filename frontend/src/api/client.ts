import type { ImageLibraryItem, PostDetail, PostPayload, PostSummary, User } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(payload.detail ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function login(username: string, password: string): Promise<{ access_token: string; user: User }> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchPublishedPosts(): Promise<PostSummary[]> {
  return request("/api/posts");
}

export async function fetchPost(slug: string): Promise<PostDetail> {
  return request(`/api/posts/${slug}`);
}

export async function fetchImageLibrary(): Promise<ImageLibraryItem[]> {
  return request("/api/uploads/library");
}

export async function fetchAdminPosts(token: string): Promise<PostSummary[]> {
  return request("/api/admin/posts", undefined, token);
}

export async function fetchAdminPost(postId: number, token: string): Promise<PostDetail> {
  return request(`/api/admin/posts/${postId}`, undefined, token);
}

export async function createPost(payload: PostPayload, token: string): Promise<PostDetail> {
  return request(
    "/api/admin/posts",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function updatePost(postId: number, payload: PostPayload, token: string): Promise<PostDetail> {
  return request(
    `/api/admin/posts/${postId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function deletePost(postId: number, token: string): Promise<void> {
  return request(
    `/api/admin/posts/${postId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function uploadVideo(file: File, token: string): Promise<{ url: string }> {
  const body = new FormData();
  body.append("file", file);

  return request(
    "/api/uploads/video",
    {
      method: "POST",
      body,
    },
    token,
  );
}

export async function uploadImage(file: File, token: string): Promise<{ url: string }> {
  const body = new FormData();
  body.append("file", file);

  return request(
    "/api/uploads/image",
    {
      method: "POST",
      body,
    },
    token,
  );
}

export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE}${path}`;
}
