<script setup lang="ts">
import { computed } from "vue";

import { resolveAssetUrl } from "../api/client";
import { isEmbeddableVideo, toEmbedUrl } from "../lib/video";

const props = defineProps<{
  videoUrl?: string | null;
  videoUploadPath?: string | null;
}>();

const localVideo = computed(() => resolveAssetUrl(props.videoUploadPath));
const remoteVideo = computed(() => resolveAssetUrl(props.videoUrl));
const embedUrl = computed(() => (isEmbeddableVideo(props.videoUrl) ? toEmbedUrl(props.videoUrl) : null));
</script>

<template>
  <section v-if="localVideo || remoteVideo" class="video-panel">
    <video v-if="localVideo" :src="localVideo" controls playsinline class="video-player"></video>
    <iframe
      v-else-if="embedUrl"
      class="video-player"
      :src="embedUrl"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
    <video v-else :src="remoteVideo || undefined" controls playsinline class="video-player"></video>
  </section>
</template>
