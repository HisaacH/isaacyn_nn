import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { fetchMoodboardGallery, fetchPublishedPosts, resolveAssetUrl } from "../api/client";
const posts = ref([]);
const boards = ref([]);
const loading = ref(true);
const error = ref("");
const layoutCycle = ["tall", "square", "wide", "medium", "square", "tall"];
const cards = computed(() => {
    const postCards = posts.value.map((post, index) => ({
        id: `post-${post.id}`,
        type: "post",
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
        type: "moodboard",
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
    ...{ class: "flow-hero" },
});
/** @type {__VLS_StyleScopedClasses['flow-hero']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flow-hero__copy" },
});
/** @type {__VLS_StyleScopedClasses['flow-hero__copy']} */ ;
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
    ...{ class: "flow-hero__panel" },
});
/** @type {__VLS_StyleScopedClasses['flow-hero__panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.cards.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
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
else if (__VLS_ctx.cards.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "state-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['state-panel']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "masonry-flow" },
    });
    /** @type {__VLS_StyleScopedClasses['masonry-flow']} */ ;
    for (const [card] of __VLS_vFor((__VLS_ctx.cards))) {
        let __VLS_0;
        /** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
        RouterLink;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            key: (card.id),
            ...{ class: "masonry-card" },
            ...{ class: (`masonry-card--${card.layout}`) },
            to: (card.href),
        }));
        const __VLS_2 = __VLS_1({
            key: (card.id),
            ...{ class: "masonry-card" },
            ...{ class: (`masonry-card--${card.layout}`) },
            to: (card.href),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        /** @type {__VLS_StyleScopedClasses['masonry-card']} */ ;
        const { default: __VLS_5 } = __VLS_3.slots;
        if (card.cover) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "masonry-card__media" },
                ...{ style: ({ backgroundImage: `linear-gradient(180deg, rgba(7, 11, 20, 0.04), rgba(7, 11, 20, 0.78)), url('${card.cover}')` }) },
            });
            /** @type {__VLS_StyleScopedClasses['masonry-card__media']} */ ;
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "masonry-card__fallback" },
            });
            /** @type {__VLS_StyleScopedClasses['masonry-card__fallback']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (card.stamp);
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (card.title.slice(0, 1));
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "masonry-card__body" },
        });
        /** @type {__VLS_StyleScopedClasses['masonry-card__body']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "masonry-card__topline" },
        });
        /** @type {__VLS_StyleScopedClasses['masonry-card__topline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "tag" },
        });
        /** @type {__VLS_StyleScopedClasses['tag']} */ ;
        (card.stamp);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "meta" },
        });
        /** @type {__VLS_StyleScopedClasses['meta']} */ ;
        (new Date(card.date).toLocaleDateString());
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
        (card.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (card.summary);
        // @ts-ignore
        [cards, cards, cards, loading, error, error,];
        var __VLS_3;
        // @ts-ignore
        [];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
