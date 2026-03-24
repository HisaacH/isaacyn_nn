<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { createPost, deletePost, fetchAdminPost, fetchAdminPosts, updatePost } from "../api/client";
import PostEditor from "../components/PostEditor.vue";
import { useAuthStore } from "../stores/auth";
import type { PostPayload, PostSummary } from "../types";

const auth = useAuthStore();
const router = useRouter();

const posts = ref<PostSummary[]>([]);
const error = ref("");
const saving = ref(false);
const selectedPostId = ref<number | null>(null);
const saveMessage = ref("");
const dirty = ref(false);

const emptyForm = (): PostPayload => ({
  title: "",
  slug: null,
  summary: "",
  cover_image: null,
  markdown_content: "",
  video_url: null,
  video_upload_path: null,
  is_published: true,
});

const form = ref<PostPayload>(emptyForm());

async function loadPosts() {
  if (!auth.token) {
    await router.push("/login");
    return;
  }

  posts.value = await fetchAdminPosts(auth.token);
}

async function loadPost(postId: number) {
  if (!auth.token) {
    return;
  }

  const post = await fetchAdminPost(postId, auth.token);
  selectedPostId.value = post.id;
  form.value = {
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    cover_image: post.cover_image,
    markdown_content: post.markdown_content,
    video_url: post.video_url,
    video_upload_path: post.video_upload_path,
    is_published: post.is_published,
  };
  dirty.value = false;
}

function startCreate() {
  selectedPostId.value = null;
  form.value = emptyForm();
  saveMessage.value = "";
  dirty.value = false;
}

function updateForm(value: PostPayload) {
  form.value = value;
  dirty.value = true;
  saveMessage.value = "";
}

async function save() {
  if (!auth.token) {
    await router.push("/login");
    return;
  }

  error.value = "";
  saveMessage.value = "";
  saving.value = true;
  try {
    if (selectedPostId.value) {
      await updatePost(selectedPostId.value, form.value, auth.token);
    } else {
      const created = await createPost(form.value, auth.token);
      selectedPostId.value = created.id;
    }
    await loadPosts();
    if (selectedPostId.value) {
      await loadPost(selectedPostId.value);
    }
    dirty.value = false;
    saveMessage.value = "已保存到服务器";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存失败";
  } finally {
    saving.value = false;
  }
}

async function remove(postId: number) {
  if (!auth.token) {
    return;
  }

  const confirmed = window.confirm("确定删除这篇文章吗？");
  if (!confirmed) {
    return;
  }

  await deletePost(postId, auth.token);
  if (selectedPostId.value === postId) {
    startCreate();
  }
  await loadPosts();
}

onMounted(async () => {
  try {
    await loadPosts();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载失败";
  }
});
</script>

<template>
  <section class="admin-layout">
    <aside class="panel admin-sidebar">
      <div class="sidebar-head">
        <div>
          <p class="eyebrow">管理员</p>
          <h2>{{ auth.user?.username || "admin" }}</h2>
        </div>
        <button class="ghost-button" @click="startCreate">新建文章</button>
      </div>

      <p v-if="error" class="helper error">{{ error }}</p>

      <button
        v-for="post in posts"
        :key="post.id"
        class="post-list-item"
        :class="{ active: selectedPostId === post.id }"
        @click="loadPost(post.id)"
      >
        <span>{{ post.title }}</span>
        <small>{{ post.is_published ? "已发布" : "草稿" }}</small>
      </button>

      <div v-if="posts.length === 0" class="helper">还没有文章，先新建一篇。</div>

      <button v-if="selectedPostId" class="danger-button" @click="remove(selectedPostId)">删除当前文章</button>
    </aside>

    <div class="admin-editor">
      <PostEditor
        v-if="auth.token"
        :model-value="form"
        :token="auth.token"
        :saving="saving"
        :status-message="saveMessage || error"
        :dirty="dirty"
        @update:model-value="updateForm"
        @submit="save"
      />
    </div>
  </section>
</template>
