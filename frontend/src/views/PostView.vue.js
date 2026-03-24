import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { fetchPost, resolveAssetUrl } from "../api/client";
import VideoPlayer from "../components/VideoPlayer.vue";
const route = useRoute();
const post = ref(null);
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
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : "加载失败";
    }
    finally {
        loading.value = false;
    }
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "state-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['state-panel']} */ ;
}
else if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "state-panel error" },
    });
    /** @type {__VLS_StyleScopedClasses['state-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['error']} */ ;
    (__VLS_ctx.error);
}
else if (__VLS_ctx.post) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
        ...{ class: "article-shell" },
    });
    /** @type {__VLS_StyleScopedClasses['article-shell']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "article-cover" },
        ...{ style: (__VLS_ctx.coverStyle) },
    });
    /** @type {__VLS_StyleScopedClasses['article-cover']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    (__VLS_ctx.post.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.post.summary);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "article-meta" },
    });
    /** @type {__VLS_StyleScopedClasses['article-meta']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (new Date(__VLS_ctx.post.published_at || __VLS_ctx.post.created_at).toLocaleDateString());
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.post.video_url || __VLS_ctx.post.video_upload_path ? "Video-supported post" : "Reading article");
    const __VLS_0 = VideoPlayer;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        videoUrl: (__VLS_ctx.post.video_url),
        videoUploadPath: (__VLS_ctx.post.video_upload_path),
    }));
    const __VLS_2 = __VLS_1({
        videoUrl: (__VLS_ctx.post.video_url),
        videoUploadPath: (__VLS_ctx.post.video_upload_path),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "article-layout" },
    });
    /** @type {__VLS_StyleScopedClasses['article-layout']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
        ...{ class: "panel article-aside" },
    });
    /** @type {__VLS_StyleScopedClasses['panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['article-aside']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.post.summary);
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
        ...{ class: "panel markdown-body" },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vHtml, {})(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.post.html_content) }, null, null);
    /** @type {__VLS_StyleScopedClasses['panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
}
// @ts-ignore
[loading, error, error, post, post, post, post, post, post, post, post, post, post, post, coverStyle,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
