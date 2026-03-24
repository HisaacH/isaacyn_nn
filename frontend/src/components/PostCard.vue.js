import { computed } from "vue";
import { resolveAssetUrl } from "../api/client";
const props = defineProps();
const coverStyle = computed(() => {
    const cover = resolveAssetUrl(props.post.cover_image);
    return cover
        ? { backgroundImage: `linear-gradient(180deg, rgba(8,10,28,0.05), rgba(8,10,28,0.8)), url("${cover}")` }
        : undefined;
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "post-card" },
    ...{ style: (__VLS_ctx.coverStyle) },
    to: (`/posts/${__VLS_ctx.post.slug}`),
}));
const __VLS_2 = __VLS_1({
    ...{ class: "post-card" },
    ...{ style: (__VLS_ctx.coverStyle) },
    to: (`/posts/${__VLS_ctx.post.slug}`),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
/** @type {__VLS_StyleScopedClasses['post-card']} */ ;
const { default: __VLS_6 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "post-card__content" },
});
/** @type {__VLS_StyleScopedClasses['post-card__content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "post-card__eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['post-card__eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "tag" },
});
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
(__VLS_ctx.post.video_url || __VLS_ctx.post.video_upload_path ? "视频文章" : "文章");
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "post-card__arrow" },
});
/** @type {__VLS_StyleScopedClasses['post-card__arrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
(__VLS_ctx.post.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
(__VLS_ctx.post.summary);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "post-card__meta" },
});
/** @type {__VLS_StyleScopedClasses['post-card__meta']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "meta" },
});
/** @type {__VLS_StyleScopedClasses['meta']} */ ;
(new Date(__VLS_ctx.post.published_at || __VLS_ctx.post.created_at).toLocaleDateString());
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "meta" },
});
/** @type {__VLS_StyleScopedClasses['meta']} */ ;
(__VLS_ctx.post.is_published ? "Published" : "Draft");
// @ts-ignore
[coverStyle, post, post, post, post, post, post, post, post,];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
