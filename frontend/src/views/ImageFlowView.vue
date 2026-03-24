<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

import { fetchMoodboardGallery, fetchPublishedPosts, resolveAssetUrl } from "../api/client";
import type { MoodboardGalleryItem, PostSummary } from "../types";

type FlowCard =
  | {
      id: string;
      type: "post";
      title: string;
      summary: string;
      cover: string | null;
      layout: string;
      stamp: string;
      href: string;
      date: string;
    }
  | {
      id: string;
      type: "moodboard";
      title: string;
      summary: string;
      cover: string | null;
      layout: string;
      stamp: string;
      href: string;
      date: string;
    };

const posts = ref<PostSummary[]>([]);
const boards = ref<MoodboardGalleryItem[]>([]);
const loading = ref(true);
const error = ref("");

const layoutCycle = ["tall", "square", "wide", "medium", "square", "tall"];

const cards = computed<FlowCard[]>(() => {
  const postCards = posts.value.map((post, index) => ({
    id: `post-${post.id}`,
    type: "post" as const,
    title: post.title,
    summary: post.summary,
    cover: resolveAssetUrl(post.cover_image),
    layout: layoutCycle[index % layoutCycle.length],
    stamp: post.video_url || post.video_upload_path ? "Video" : "Story",
    href: `/posts/${post.slug}`,
    date: post.published_at || post.created_at,
  }));

  const boardCards = boards.value.map((board, index) => ({
    id: `board-${board.id}`,
    type: "moodboard" as const,
    title: board.name,
    summary: board.board_note || `${board.group_name} moodboard`,
    cover: board.preview_image,
    layout: layoutCycle[(postCards.length + index) % layoutCycle.length],
    stamp: "Moodboard",
    href: "/moodboard",
    date: board.updated_at,
  }));

  return [...boardCards, ...postCards];
});

onMounted(async () => {
  try {
    const [publishedPosts, galleryBoards] = await Promise.all([fetchPublishedPosts(), fetchMoodboardGallery()]);
    posts.value = publishedPosts;
    boards.value = galleryBoards;
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
      <h1>像 Pinterest 一样浏览文章封面和已保存的 moodboard 缩略图。</h1>
      <p class="hero-copy">这里更像灵感发现页，文章和拼贴板会一起流动展示，方便你快速回看做过的视觉方向。</p>
    </div>
    <div class="flow-hero__panel">
      <span>瀑布流内容</span>
      <strong>{{ cards.length }}</strong>
      <small>文章 + Moodboard</small>
    </div>
  </section>

  <section v-if="loading" class="state-panel">图片流加载中...</section>
  <section v-else-if="error" class="state-panel error">{{ error }}</section>
  <section v-else-if="cards.length === 0" class="state-panel">还没有内容，先去管理台发文章或保存几张 moodboard 吧。</section>
  <section v-else class="masonry-flow">
    <RouterLink
      v-for="card in cards"
      :key="card.id"
      class="masonry-card"
      :class="`masonry-card--${card.layout}`"
      :to="card.href"
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
          <span class="meta">{{ new Date(card.date).toLocaleDateString() }}</span>
        </div>
        <h3>{{ card.title }}</h3>
        <p>{{ card.summary }}</p>
      </div>
    </RouterLink>
  </section>
</template>
