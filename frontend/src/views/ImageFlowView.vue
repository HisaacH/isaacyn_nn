<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { fetchPublishedPosts, resolveAssetUrl } from "../api/client";
import type { PostSummary } from "../types";

const posts = ref<PostSummary[]>([]);
const loading = ref(true);
const error = ref("");

const layoutCycle = ["tall", "square", "wide", "medium", "square", "tall"];

const cards = computed(() =>
  posts.value.map((post, index) => ({
    ...post,
    cover: resolveAssetUrl(post.cover_image),
    layout: layoutCycle[index % layoutCycle.length],
    stamp: post.video_url || post.video_upload_path ? "Video" : "Story",
  })),
);

onMounted(async () => {
  try {
    posts.value = await fetchPublishedPosts();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="flow-hero">
    <div class="flow-hero__copy">
      <p class="eyebrow">Visual Stream</p>
      <h1>像 Pinterest 一样浏览封面、短摘要和创作灵感。</h1>
      <p class="hero-copy">
        这里更偏发现页。封面会成为主角，读者可以像翻一面灵感墙那样滑过去，再进入文章详情。
      </p>
    </div>
    <div class="flow-hero__panel">
      <span>封面瀑布流</span>
      <strong>{{ posts.length }}</strong>
      <small>已发布内容</small>
    </div>
  </section>

  <section v-if="loading" class="state-panel">图片流加载中...</section>
  <section v-else-if="error" class="state-panel error">{{ error }}</section>
  <section v-else-if="cards.length === 0" class="state-panel">还没有已发布文章，先去管理台发几篇带封面的内容吧。</section>
  <section v-else class="masonry-flow">
    <RouterLink
      v-for="card in cards"
      :key="card.id"
      class="masonry-card"
      :class="`masonry-card--${card.layout}`"
      :to="`/posts/${card.slug}`"
    >
      <div
        v-if="card.cover"
        class="masonry-card__media"
        :style="{ backgroundImage: `linear-gradient(180deg, rgba(7, 11, 20, 0.04), rgba(7, 11, 20, 0.78)), url('${card.cover}')` }"
      ></div>
      <div v-else class="masonry-card__fallback">
        <span>{{ card.stamp }}</span>
        <strong>{{ card.title.slice(0, 1) }}</strong>
      </div>

      <div class="masonry-card__body">
        <div class="masonry-card__topline">
          <span class="tag">{{ card.stamp }}</span>
          <span class="meta">{{ new Date(card.published_at || card.created_at).toLocaleDateString() }}</span>
        </div>
        <h3>{{ card.title }}</h3>
        <p>{{ card.summary }}</p>
      </div>
    </RouterLink>
  </section>
</template>
