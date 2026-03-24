import { computed } from "vue";
import { resolveAssetUrl } from "../api/client";
import { isEmbeddableVideo, toEmbedUrl } from "../lib/video";
const props = defineProps();
const localVideo = computed(() => resolveAssetUrl(props.videoUploadPath));
const remoteVideo = computed(() => resolveAssetUrl(props.videoUrl));
const embedUrl = computed(() => (isEmbeddableVideo(props.videoUrl) ? toEmbedUrl(props.videoUrl) : null));
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (__VLS_ctx.localVideo || __VLS_ctx.remoteVideo) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "video-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['video-panel']} */ ;
    if (__VLS_ctx.localVideo) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.video, __VLS_intrinsics.video)({
            src: (__VLS_ctx.localVideo),
            controls: true,
            playsinline: true,
            ...{ class: "video-player" },
        });
        /** @type {__VLS_StyleScopedClasses['video-player']} */ ;
    }
    else if (__VLS_ctx.embedUrl) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.iframe, __VLS_intrinsics.iframe)({
            ...{ class: "video-player" },
            src: (__VLS_ctx.embedUrl),
            frameborder: "0",
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
            allowfullscreen: true,
        });
        /** @type {__VLS_StyleScopedClasses['video-player']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.video, __VLS_intrinsics.video)({
            src: (__VLS_ctx.remoteVideo || undefined),
            controls: true,
            playsinline: true,
            ...{ class: "video-player" },
        });
        /** @type {__VLS_StyleScopedClasses['video-player']} */ ;
    }
}
// @ts-ignore
[localVideo, localVideo, localVideo, remoteVideo, remoteVideo, embedUrl, embedUrl,];
const __VLS_export = (await import('vue')).defineComponent({
    __typeProps: {},
});
export default {};
