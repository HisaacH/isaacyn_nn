const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
async function request(path, init, token) {
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
        return undefined;
    }
    return response.json();
}
export async function login(username, password) {
    return request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
    });
}
export async function fetchPublishedPosts() {
    return request("/api/posts");
}
export async function fetchPost(slug) {
    return request(`/api/posts/${slug}`);
}
export async function fetchImageLibrary() {
    return request("/api/uploads/library");
}
export async function fetchAdminPosts(token) {
    return request("/api/admin/posts", undefined, token);
}
export async function fetchAdminPost(postId, token) {
    return request(`/api/admin/posts/${postId}`, undefined, token);
}
export async function createPost(payload, token) {
    return request("/api/admin/posts", {
        method: "POST",
        body: JSON.stringify(payload),
    }, token);
}
export async function updatePost(postId, payload, token) {
    return request(`/api/admin/posts/${postId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    }, token);
}
export async function deletePost(postId, token) {
    return request(`/api/admin/posts/${postId}`, {
        method: "DELETE",
    }, token);
}
export async function uploadVideo(file, token) {
    const body = new FormData();
    body.append("file", file);
    return request("/api/uploads/video", {
        method: "POST",
        body,
    }, token);
}
export async function uploadImage(file, token) {
    const body = new FormData();
    body.append("file", file);
    return request("/api/uploads/image", {
        method: "POST",
        body,
    }, token);
}
export async function fetchMoodboardTemplates(token) {
    return request("/api/admin/moodboards/templates", undefined, token);
}
export async function fetchMoodboardGallery() {
    return request("/api/moodboards/gallery");
}
export async function createMoodboardTemplate(payload, token) {
    return request("/api/admin/moodboards/templates", {
        method: "POST",
        body: JSON.stringify(payload),
    }, token);
}
export async function updateMoodboardTemplate(templateId, payload, token) {
    return request(`/api/admin/moodboards/templates/${templateId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    }, token);
}
export async function deleteMoodboardTemplate(templateId, token) {
    return request(`/api/admin/moodboards/templates/${templateId}`, {
        method: "DELETE",
    }, token);
}
export function resolveAssetUrl(path) {
    if (!path) {
        return null;
    }
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }
    return `${API_BASE}${path}`;
}
