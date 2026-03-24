<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { fetchPublishedPosts, resolveAssetUrl } from "../api/client";
import PostCard from "../components/PostCard.vue";
import type { PostSummary } from "../types";

const posts = ref<PostSummary[]>([]);
const loading = ref(true);
const error = ref("");

const featuredPost = computed(() => posts.value[0] ?? null);
const highlightedPosts = computed(() => posts.value.slice(1, 4));
const postCount = computed(() => posts.value.length);
const videoCount = computed(() => posts.value.filter((post) => post.video_url || post.video_upload_path).length);
const featuredStyle = computed(() => {
  const cover = resolveAssetUrl(featuredPost.value?.cover_image);
  return cover
    ? { backgroundImage: `linear-gradient(160deg, rgba(255, 138, 91, 0.18), rgba(10, 20, 37, 0.5)), url("${cover}")` }
    : undefined;
});

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
  <section class="hero hero-grid">
    <div class="hero-copywrap">
      <p class="eyebrow">Editorial Workspace</p>
      <h1>把技术文章、课程笔记和视频讲解，收进同一个有质感的博客里。</h1>
      <p class="hero-copy">
        这是一个偏“出版物”气质的博客首页。文章可以长读，视频可以直接播放，后台则继续保留 Markdown 写作和管理员发布的效率。
      </p>

      <div class="hero-actions">
        <RouterLink class="primary-button" to="/admin">开始写文章</RouterLink>
        <RouterLink class="ghost-button" to="/login">管理员登录</RouterLink>
      </div>
    </div>

    <aside class="hero-panel">
      <div class="hero-stat">
        <span>文章</span>
        <strong>{{ postCount }}</strong>
      </div>
      <div class="hero-stat">
        <span>视频内容</span>
        <strong>{{ videoCount }}</strong>
      </div>
      <div class="hero-stat">
        <span>写作方式</span>
        <strong>Markdown</strong>
      </div>
      <div class="hero-note">
        <p class="eyebrow">Current Focus</p>
        <p>适合放教程、产品日志、技术复盘、课程回放和创作型专栏。</p>
      </div>
    </aside>
  </section>

  <section v-if="loading" class="state-panel">正在加载文章...</section>
  <section v-else-if="error" class="state-panel error">{{ error }}</section>
  <template v-else>
    <section v-if="featuredPost" class="featured-grid">
      <RouterLink class="featured-story" :style="featuredStyle" :to="`/posts/${featuredPost.slug}`">
        <p class="eyebrow">Featured Story</p>
        <h2>{{ featuredPost.title }}</h2>
        <p>{{ featuredPost.summary }}</p>
        <div class="featured-meta">
          <span>{{ new Date(featuredPost.published_at || featuredPost.created_at).toLocaleDateString() }}</span>
          <span>{{ featuredPost.video_url || featuredPost.video_upload_path ? "Video article" : "Longform post" }}</span>
        </div>
      </RouterLink>

      <div class="curation-panel">
        <p class="eyebrow">Editor's Note</p>
        <h3>把博客做得更像一本会持续更新的数字刊物</h3>
        <p>
          首页不再只是卡片堆叠，而是先给出主打内容，再展示近期文章。这样更适合个人品牌、课程专栏和视频内容沉淀。
        </p>
      </div>
    </section>

    <section class="section-head">
      <div>
        <p class="eyebrow">Latest Posts</p>
        <h2>最近发布</h2>
      </div>
      <p class="section-copy">支持图文长文、视频文章和后台 Markdown 写作流。</p>
    </section>

    <section class="card-grid">
      <PostCard
        v-for="post in highlightedPosts.length > 0 ? highlightedPosts : posts"
        :key="post.id"
        :post="post"
      />
      <div v-if="posts.length === 0" class="state-panel">还没有已发布文章，先去管理台创建一篇吧。</div>
    </section>
  </template>
</template>
