<script setup lang="ts">
import { computed } from "vue";

import { resolveAssetUrl } from "../api/client";
import type { PostSummary } from "../types";

const props = defineProps<{
  post: PostSummary;
}>();

const coverStyle = computed(() => {
  const cover = resolveAssetUrl(props.post.cover_image);
  return cover
    ? { backgroundImage: `linear-gradient(180deg, rgba(8,10,28,0.05), rgba(8,10,28,0.8)), url("${cover}")` }
    : undefined;
});
</script>

<template>
  <RouterLink class="post-card" :style="coverStyle" :to="`/posts/${post.slug}`">
    <div class="post-card__content">
      <div class="post-card__eyebrow">
        <span class="tag">{{ post.video_url || post.video_upload_path ? "视频文章" : "文章" }}</span>
        <span class="post-card__arrow">Read</span>
      </div>
      <h3>{{ post.title }}</h3>
      <p>{{ post.summary }}</p>
      <div class="post-card__meta">
        <span class="meta">
          {{ new Date(post.published_at || post.created_at).toLocaleDateString() }}
        </span>
        <span class="meta">{{ post.is_published ? "Published" : "Draft" }}</span>
      </div>
    </div>
  </RouterLink>
</template>
