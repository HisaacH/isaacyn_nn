<script setup lang="ts">
import { computed, ref } from "vue";

import { resolveAssetUrl, uploadImage, uploadVideo } from "../api/client";
import { renderMarkdown } from "../lib/markdown";
import type { PostPayload } from "../types";

const props = defineProps<{
  modelValue: PostPayload;
  token: string;
  saving?: boolean;
  statusMessage?: string;
  dirty?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: PostPayload];
  submit: [];
}>();

const uploadState = ref("上传视频");
const coverUploadState = ref("上传封面");

const previewHtml = computed(() => renderMarkdown(props.modelValue.markdown_content));
const coverPreview = computed(() => resolveAssetUrl(props.modelValue.cover_image));

function patch<K extends keyof PostPayload>(key: K, value: PostPayload[K]) {
  emit("update:modelValue", {
    ...props.modelValue,
    [key]: value,
  });
}

async function onUploadChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  uploadState.value = "上传中...";
  try {
    const result = await uploadVideo(file, props.token);
    patch("video_upload_path", result.url);
    uploadState.value = "上传成功";
  } catch (error) {
    uploadState.value = error instanceof Error ? error.message : "上传失败";
  } finally {
    input.value = "";
  }
}

async function onCoverUploadChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  coverUploadState.value = "上传中...";
  try {
    const result = await uploadImage(file, props.token);
    patch("cover_image", result.url);
    coverUploadState.value = "封面上传成功";
  } catch (error) {
    coverUploadState.value = error instanceof Error ? error.message : "上传失败";
  } finally {
    input.value = "";
  }
}
</script>

<template>
  <form class="editor-grid" @submit.prevent="emit('submit')">
    <section class="panel form-panel">
      <div class="editor-toolbar">
        <div>
          <p class="eyebrow">Editor</p>
          <h3 class="editor-title">文章编辑器</h3>
          <p class="helper">{{ statusMessage || (dirty ? "你有未保存修改" : "已与服务器同步") }}</p>
        </div>
        <button class="primary-button" type="submit" :disabled="saving">
          {{ saving ? "保存中..." : "保存文章" }}
        </button>
      </div>

      <label>
        标题
        <input
          :value="modelValue.title"
          type="text"
          placeholder="输入博客标题"
          @input="patch('title', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label>
        自定义 Slug
        <input
          :value="modelValue.slug || ''"
          type="text"
          placeholder="可选，不填会自动生成"
          @input="patch('slug', ($event.target as HTMLInputElement).value || null)"
        />
      </label>

      <label>
        摘要
        <textarea
          :value="modelValue.summary"
          rows="3"
          placeholder="文章简介"
          @input="patch('summary', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </label>

      <label>
        封面图片 URL
        <input
          :value="modelValue.cover_image || ''"
          type="text"
          placeholder="https://..."
          @input="patch('cover_image', ($event.target as HTMLInputElement).value || null)"
        />
      </label>

      <label>
        上传封面图片
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onCoverUploadChange" />
      </label>

      <p class="helper">{{ coverUploadState }}</p>

      <div v-if="coverPreview" class="cover-preview">
        <img :src="coverPreview" alt="封面预览" />
      </div>

      <label>
        视频 URL
        <input
          :value="modelValue.video_url || ''"
          type="text"
          placeholder="支持 mp4 / YouTube / Bilibili 链接"
          @input="patch('video_url', ($event.target as HTMLInputElement).value || null)"
        />
      </label>

      <label>
        上传视频文件
        <input type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" @change="onUploadChange" />
      </label>

      <p class="helper">{{ uploadState }}</p>

      <label class="checkbox">
        <input
          :checked="modelValue.is_published"
          type="checkbox"
          @change="patch('is_published', ($event.target as HTMLInputElement).checked)"
        />
        保存后立即显示到主页
      </label>

      <label>
        Markdown 内容
        <textarea
          class="markdown-input"
          :value="modelValue.markdown_content"
          rows="18"
          placeholder="# 你的文章"
          @input="patch('markdown_content', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </label>
    </section>

    <section class="panel preview-panel">
      <div class="preview-head">
        <h3>Markdown 预览</h3>
        <span>{{ modelValue.is_published ? "已发布" : "草稿" }}</span>
      </div>
      <article class="markdown-body" v-html="previewHtml"></article>
    </section>
  </form>
</template>
