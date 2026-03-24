<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { fetchPost, resolveAssetUrl } from "../api/client";
import VideoPlayer from "../components/VideoPlayer.vue";
import type { PostDetail } from "../types";

const route = useRoute();
const post = ref<PostDetail | null>(null);
const loading = ref(true);
const error = ref("");
const coverStyle = computed(() => {
  const cover = resolveAssetUrl(post.value?.cover_image);
  return cover
    ? { backgroundImage: `linear-gradient(180deg, rgba(7, 9, 25, 0.15), rgba(7, 9, 25, 0.78)), url("${cover}")` }
    : undefined;
});

onMounted(async () => {
  try {
    const slug = String(route.params.slug);
    post.value = await fetchPost(slug);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section v-if="loading" class="state-panel">文章加载中...</section>
  <section v-else-if="error" class="state-panel error">{{ error }}</section>
  <article v-else-if="post" class="article-shell">
    <div class="article-cover" :style="coverStyle">
      <p class="eyebrow">Article</p>
      <h1>{{ post.title }}</h1>
      <p>{{ post.summary }}</p>
      <div class="article-meta">
        <span>{{ new Date(post.published_at || post.created_at).toLocaleDateString() }}</span>
        <span>{{ post.video_url || post.video_upload_path ? "Video-supported post" : "Reading article" }}</span>
      </div>
    </div>

    <VideoPlayer :video-url="post.video_url" :video-upload-path="post.video_upload_path" />

    <section class="article-layout">
      <aside class="panel article-aside">
        <p class="eyebrow">Overview</p>
        <h3>这篇文章适合沉浸式阅读</h3>
        <p>{{ post.summary }}</p>
      </aside>

      <article class="panel markdown-body" v-html="post.html_content"></article>
    </section>
  </article>
</template>
