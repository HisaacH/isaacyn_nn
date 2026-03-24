import { computed, ref } from "vue";
import { resolveAssetUrl, uploadImage, uploadVideo } from "../api/client";
import { renderMarkdown } from "../lib/markdown";
const props = defineProps();
const emit = defineEmits();
const uploadState = ref("上传视频");
const coverUploadState = ref("上传封面");
const previewHtml = computed(() => renderMarkdown(props.modelValue.markdown_content));
const coverPreview = computed(() => resolveAssetUrl(props.modelValue.cover_image));
function patch(key, value) {
    emit("update:modelValue", {
        ...props.modelValue,
        [key]: value,
    });
}
async function onUploadChange(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
        return;
    }
    uploadState.value = "上传中...";
    try {
        const result = await uploadVideo(file, props.token);
        patch("video_upload_path", result.url);
        uploadState.value = "上传成功";
    }
    catch (error) {
        uploadState.value = error instanceof Error ? error.message : "上传失败";
    }
    finally {
        input.value = "";
    }
}
async function onCoverUploadChange(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
        return;
    }
    coverUploadState.value = "上传中...";
    try {
        const result = await uploadImage(file, props.token);
        patch("cover_image", result.url);
        coverUploadState.value = "封面上传成功";
    }
    catch (error) {
        coverUploadState.value = error instanceof Error ? error.message : "上传失败";
    }
    finally {
        input.value = "";
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
    ...{ onSubmit: (...[$event]) => {
            __VLS_ctx.emit('submit');
            // @ts-ignore
            [emit,];
        } },
    ...{ class: "editor-grid" },
});
/** @type {__VLS_StyleScopedClasses['editor-grid']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "panel form-panel" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['form-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "editor-toolbar" },
});
/** @type {__VLS_StyleScopedClasses['editor-toolbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
    ...{ class: "editor-title" },
});
/** @type {__VLS_StyleScopedClasses['editor-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "helper" },
});
/** @type {__VLS_StyleScopedClasses['helper']} */ ;
(__VLS_ctx.statusMessage || (__VLS_ctx.dirty ? "你有未保存修改" : "已与服务器同步"));
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ class: "primary-button" },
    type: "submit",
    disabled: (__VLS_ctx.saving),
});
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
(__VLS_ctx.saving ? "保存中..." : "保存文章");
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onInput: (...[$event]) => {
            __VLS_ctx.patch('title', $event.target.value);
            // @ts-ignore
            [statusMessage, dirty, saving, saving, patch,];
        } },
    value: (__VLS_ctx.modelValue.title),
    type: "text",
    placeholder: "输入博客标题",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onInput: (...[$event]) => {
            __VLS_ctx.patch('slug', $event.target.value || null);
            // @ts-ignore
            [patch, modelValue,];
        } },
    value: (__VLS_ctx.modelValue.slug || ''),
    type: "text",
    placeholder: "可选，不填会自动生成",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
    ...{ onInput: (...[$event]) => {
            __VLS_ctx.patch('summary', $event.target.value);
            // @ts-ignore
            [patch, modelValue,];
        } },
    value: (__VLS_ctx.modelValue.summary),
    rows: "3",
    placeholder: "文章简介",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onInput: (...[$event]) => {
            __VLS_ctx.patch('cover_image', $event.target.value || null);
            // @ts-ignore
            [patch, modelValue,];
        } },
    value: (__VLS_ctx.modelValue.cover_image || ''),
    type: "text",
    placeholder: "https://...",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onChange: (__VLS_ctx.onCoverUploadChange) },
    type: "file",
    accept: "image/png,image/jpeg,image/webp,image/gif",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "helper" },
});
/** @type {__VLS_StyleScopedClasses['helper']} */ ;
(__VLS_ctx.coverUploadState);
if (__VLS_ctx.coverPreview) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "cover-preview" },
    });
    /** @type {__VLS_StyleScopedClasses['cover-preview']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
        src: (__VLS_ctx.coverPreview),
        alt: "封面预览",
    });
}
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onInput: (...[$event]) => {
            __VLS_ctx.patch('video_url', $event.target.value || null);
            // @ts-ignore
            [patch, modelValue, onCoverUploadChange, coverUploadState, coverPreview, coverPreview,];
        } },
    value: (__VLS_ctx.modelValue.video_url || ''),
    type: "text",
    placeholder: "支持 mp4 / YouTube / Bilibili 链接",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onChange: (__VLS_ctx.onUploadChange) },
    type: "file",
    accept: "video/mp4,video/webm,video/ogg,video/quicktime",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "helper" },
});
/** @type {__VLS_StyleScopedClasses['helper']} */ ;
(__VLS_ctx.uploadState);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "checkbox" },
});
/** @type {__VLS_StyleScopedClasses['checkbox']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.patch('is_published', $event.target.checked);
            // @ts-ignore
            [patch, modelValue, onUploadChange, uploadState,];
        } },
    checked: (__VLS_ctx.modelValue.is_published),
    type: "checkbox",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
    ...{ onInput: (...[$event]) => {
            __VLS_ctx.patch('markdown_content', $event.target.value);
            // @ts-ignore
            [patch, modelValue,];
        } },
    ...{ class: "markdown-input" },
    value: (__VLS_ctx.modelValue.markdown_content),
    rows: "18",
    placeholder: "# 你的文章",
});
/** @type {__VLS_StyleScopedClasses['markdown-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "panel preview-panel" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "preview-head" },
});
/** @type {__VLS_StyleScopedClasses['preview-head']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.modelValue.is_published ? "已发布" : "草稿");
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
    ...{ class: "markdown-body" },
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.previewHtml) }, null, null);
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
// @ts-ignore
[modelValue, modelValue, previewHtml,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
