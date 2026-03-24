import { computed, onMounted, ref } from "vue";
import { fetchPublishedPosts, resolveAssetUrl } from "../api/client";
import PostCard from "../components/PostCard.vue";
const posts = ref([]);
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
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "hero hero-grid" },
});
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-grid']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "hero-copywrap" },
});
/** @type {__VLS_StyleScopedClasses['hero-copywrap']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "hero-copy" },
});
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "hero-actions" },
});
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "primary-button" },
    to: "/admin",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "primary-button" },
    to: "/admin",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
var __VLS_3;
let __VLS_6;
/** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
    ...{ class: "ghost-button" },
    to: "/login",
}));
const __VLS_8 = __VLS_7({
    ...{ class: "ghost-button" },
    to: "/login",
}, ...__VLS_functionalComponentArgsRest(__VLS_7));
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
const { default: __VLS_11 } = __VLS_9.slots;
var __VLS_9;
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "hero-panel" },
});
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "hero-stat" },
});
/** @type {__VLS_StyleScopedClasses['hero-stat']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.postCount);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "hero-stat" },
});
/** @type {__VLS_StyleScopedClasses['hero-stat']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.videoCount);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "hero-stat" },
});
/** @type {__VLS_StyleScopedClasses['hero-stat']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "hero-note" },
});
/** @type {__VLS_StyleScopedClasses['hero-note']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
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
else {
    if (__VLS_ctx.featuredPost) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "featured-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['featured-grid']} */ ;
        let __VLS_12;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
            ...{ class: "featured-story" },
            ...{ style: (__VLS_ctx.featuredStyle) },
            to: (`/posts/${__VLS_ctx.featuredPost.slug}`),
        }));
        const __VLS_14 = __VLS_13({
            ...{ class: "featured-story" },
            ...{ style: (__VLS_ctx.featuredStyle) },
            to: (`/posts/${__VLS_ctx.featuredPost.slug}`),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        /** @type {__VLS_StyleScopedClasses['featured-story']} */ ;
        const { default: __VLS_17 } = __VLS_15.slots;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "eyebrow" },
        });
        /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        (__VLS_ctx.featuredPost.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.featuredPost.summary);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "featured-meta" },
        });
        /** @type {__VLS_StyleScopedClasses['featured-meta']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (new Date(__VLS_ctx.featuredPost.published_at || __VLS_ctx.featuredPost.created_at).toLocaleDateString());
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.featuredPost.video_url || __VLS_ctx.featuredPost.video_upload_path ? "Video article" : "Longform post");
        // @ts-ignore
        [postCount, videoCount, loading, error, error, featuredPost, featuredPost, featuredPost, featuredPost, featuredPost, featuredPost, featuredPost, featuredPost, featuredStyle,];
        var __VLS_15;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "curation-panel" },
        });
        /** @type {__VLS_StyleScopedClasses['curation-panel']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "eyebrow" },
        });
        /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "section-head" },
    });
    /** @type {__VLS_StyleScopedClasses['section-head']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "section-copy" },
    });
    /** @type {__VLS_StyleScopedClasses['section-copy']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "card-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['card-grid']} */ ;
    for (const [post] of __VLS_vFor((__VLS_ctx.highlightedPosts.length > 0 ? __VLS_ctx.highlightedPosts : __VLS_ctx.posts))) {
        const __VLS_18 = PostCard;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
            key: (post.id),
            post: (post),
        }));
        const __VLS_20 = __VLS_19({
            key: (post.id),
            post: (post),
        }, ...__VLS_functionalComponentArgsRest(__VLS_19));
        // @ts-ignore
        [highlightedPosts, highlightedPosts, posts,];
    }
    if (__VLS_ctx.posts.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "state-panel" },
        });
        /** @type {__VLS_StyleScopedClasses['state-panel']} */ ;
    }
}
// @ts-ignore
[posts,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
