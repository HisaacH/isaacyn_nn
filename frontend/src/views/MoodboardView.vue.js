import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { fetchImageLibrary, resolveAssetUrl, uploadImage } from "../api/client";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore();
const library = ref([]);
const boardItems = ref([]);
const doodles = ref([]);
const loading = ref(true);
const error = ref("");
const uploadState = ref("");
const selectedId = ref(null);
const search = ref("");
const boardTitle = ref("My Moodboard");
const boardNote = ref("把喜欢的封面、灵感图和新上传的图片拖进来，拼成一张更完整的视觉情绪板。");
const drawMode = ref(false);
const doodleColor = ref("#ffd6c8");
const doodleWidth = ref(6);
const activeDoodlePath = ref("");
const boardCanvasRef = ref(null);
const STORAGE_KEY = "dora-moodboard-state";
let dragState = null;
let doodlePoints = [];
function migrateBoardItem(rawItem) {
    if (!rawItem.id) {
        return null;
    }
    if (rawItem.type === "text") {
        return {
            id: rawItem.id,
            type: "text",
            title: rawItem.title || "文字卡片",
            text: rawItem.text || "双击右侧输入更多说明",
            textColor: rawItem.textColor || "#f8fbff",
            backgroundColor: rawItem.backgroundColor || "transparent",
            fontSize: Number(rawItem.fontSize) || 22,
            x: Number(rawItem.x) || 32,
            y: Number(rawItem.y) || 32,
            width: Number(rawItem.width) || 320,
            height: Number(rawItem.height) || 200,
            rotation: Number(rawItem.rotation) || 0,
            opacity: Number(rawItem.opacity) || 100,
            radius: Number(rawItem.radius) || 0,
            zIndex: Number(rawItem.zIndex) || 1,
        };
    }
    return {
        id: rawItem.id,
        type: "image",
        libraryId: rawItem.libraryId || rawItem.id,
        url: rawItem.url || "",
        title: rawItem.title || "图片",
        x: Number(rawItem.x) || 32,
        y: Number(rawItem.y) || 32,
        width: Number(rawItem.width) || 260,
        height: Number(rawItem.height) || 320,
        rotation: Number(rawItem.rotation) || 0,
        opacity: Number(rawItem.opacity) || 100,
        radius: Number(rawItem.radius) || 5,
        zIndex: Number(rawItem.zIndex) || 1,
    };
}
function loadStoredBoard() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return;
    }
    try {
        const parsed = JSON.parse(raw);
        boardItems.value = (parsed.boardItems ?? [])
            .map((item) => migrateBoardItem(item))
            .filter((item) => Boolean(item));
        doodles.value = parsed.doodles ?? [];
        boardTitle.value = parsed.boardTitle ?? boardTitle.value;
        boardNote.value = parsed.boardNote ?? boardNote.value;
    }
    catch {
        localStorage.removeItem(STORAGE_KEY);
    }
}
watch([boardItems, doodles, boardTitle, boardNote], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        boardItems: boardItems.value,
        doodles: doodles.value,
        boardTitle: boardTitle.value,
        boardNote: boardNote.value,
    }));
}, { deep: true });
const filteredLibrary = computed(() => {
    const keyword = search.value.trim().toLowerCase();
    if (!keyword) {
        return library.value;
    }
    return library.value.filter((item) => [item.title, item.source, item.slug ?? ""].some((value) => value.toLowerCase().includes(keyword)));
});
const selectedItem = computed(() => boardItems.value.find((item) => item.id === selectedId.value) ?? null);
const selectedImageItem = computed(() => (selectedItem.value?.type === "image" ? selectedItem.value : null));
function nextZIndex() {
    return boardItems.value.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1;
}
function addImageToBoard(item) {
    const boardItem = {
        id: `${item.id}-${Date.now()}`,
        type: "image",
        libraryId: item.id,
        url: resolveAssetUrl(item.url) ?? item.url,
        title: item.title,
        x: 40 + (boardItems.value.length % 4) * 56,
        y: 48 + (boardItems.value.length % 4) * 44,
        width: 260,
        height: 320,
        rotation: 0,
        opacity: 100,
        radius: 5,
        zIndex: nextZIndex(),
    };
    boardItems.value = [...boardItems.value, boardItem];
    selectedId.value = boardItem.id;
}
function replaceSelectedImage(item) {
    if (!selectedImageItem.value) {
        return;
    }
    boardItems.value = boardItems.value.map((boardItem) => boardItem.id === selectedImageItem.value?.id
        ? {
            ...boardItem,
            libraryId: item.id,
            url: resolveAssetUrl(item.url) ?? item.url,
            title: item.title,
        }
        : boardItem);
}
function addTextCard() {
    const textItem = {
        id: `text-${Date.now()}`,
        type: "text",
        title: "文字卡片",
        text: "在这里写下 moodboard 注释、标题、引用句或方向说明。",
        textColor: "#f8fbff",
        backgroundColor: "transparent",
        fontSize: 22,
        x: 84,
        y: 84,
        width: 320,
        height: 220,
        rotation: 0,
        opacity: 100,
        radius: 0,
        zIndex: nextZIndex(),
    };
    boardItems.value = [...boardItems.value, textItem];
    selectedId.value = textItem.id;
}
function removeSelected() {
    if (!selectedId.value) {
        return;
    }
    boardItems.value = boardItems.value.filter((item) => item.id !== selectedId.value);
    selectedId.value = null;
}
function clearBoard() {
    boardItems.value = [];
    doodles.value = [];
    selectedId.value = null;
}
function bringToFront(id) {
    boardItems.value = boardItems.value.map((item) => item.id === id
        ? {
            ...item,
            zIndex: nextZIndex(),
        }
        : item);
}
function patchSelected(key, value) {
    if (!selectedId.value) {
        return;
    }
    boardItems.value = boardItems.value.map((item) => item.id === selectedId.value
        ? {
            ...item,
            [key]: value,
        }
        : item);
}
function patchTextSelected(key, value) {
    if (!selectedId.value) {
        return;
    }
    boardItems.value = boardItems.value.map((item) => item.id === selectedId.value && item.type === "text"
        ? {
            ...item,
            [key]: value,
        }
        : item);
}
function startDrag(id, event) {
    if (drawMode.value) {
        return;
    }
    const item = boardItems.value.find((entry) => entry.id === id);
    if (!item) {
        return;
    }
    event.preventDefault();
    selectedId.value = id;
    bringToFront(id);
    dragState = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        originX: item.x,
        originY: item.y,
    };
}
function boardPoint(event) {
    const rect = boardCanvasRef.value?.getBoundingClientRect();
    if (!rect) {
        return { x: 0, y: 0 };
    }
    return {
        x: Math.max(0, event.clientX - rect.left),
        y: Math.max(0, event.clientY - rect.top),
    };
}
function startDoodle(event) {
    if (!drawMode.value) {
        return;
    }
    event.preventDefault();
    const point = boardPoint(event);
    doodlePoints = [`M ${point.x} ${point.y}`];
    activeDoodlePath.value = doodlePoints.join(" ");
    selectedId.value = null;
}
function onPointerMove(event) {
    if (dragState) {
        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;
        boardItems.value = boardItems.value.map((item) => item.id === dragState?.id
            ? {
                ...item,
                x: Math.max(0, dragState.originX + dx),
                y: Math.max(0, dragState.originY + dy),
            }
            : item);
        return;
    }
    if (drawMode.value && activeDoodlePath.value) {
        const point = boardPoint(event);
        doodlePoints.push(`L ${point.x} ${point.y}`);
        activeDoodlePath.value = doodlePoints.join(" ");
    }
}
function stopPointer() {
    dragState = null;
    if (drawMode.value && activeDoodlePath.value) {
        doodles.value = [
            ...doodles.value,
            {
                id: `doodle-${Date.now()}`,
                path: activeDoodlePath.value,
                color: doodleColor.value,
                width: doodleWidth.value,
            },
        ];
        activeDoodlePath.value = "";
        doodlePoints = [];
    }
}
function clearLastDoodle() {
    doodles.value = doodles.value.slice(0, -1);
}
async function onUploadChange(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
        return;
    }
    if (!auth.token) {
        uploadState.value = "请先登录管理员账号再上传图片";
        input.value = "";
        return;
    }
    uploadState.value = "上传中...";
    try {
        const result = await uploadImage(file, auth.token);
        const uploadedItem = {
            id: `upload-${Date.now()}`,
            url: result.url,
            title: file.name.replace(/\.[^.]+$/, ""),
            source: "upload",
            slug: null,
        };
        library.value = [uploadedItem, ...library.value];
        addImageToBoard(uploadedItem);
        uploadState.value = "上传成功，已加入画板";
    }
    catch (err) {
        uploadState.value = err instanceof Error ? err.message : "上传失败";
    }
    finally {
        input.value = "";
    }
}
async function onReplaceUploadChange(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file || !selectedImageItem.value) {
        return;
    }
    if (!auth.token) {
        uploadState.value = "请先登录管理员账号再替换图片";
        input.value = "";
        return;
    }
    uploadState.value = "替换中...";
    try {
        const result = await uploadImage(file, auth.token);
        const uploadedItem = {
            id: `upload-${Date.now()}`,
            url: result.url,
            title: file.name.replace(/\.[^.]+$/, ""),
            source: "upload",
            slug: null,
        };
        library.value = [uploadedItem, ...library.value];
        replaceSelectedImage(uploadedItem);
        uploadState.value = "图片已替换，原有尺寸和位置已保留";
    }
    catch (err) {
        uploadState.value = err instanceof Error ? err.message : "替换失败";
    }
    finally {
        input.value = "";
    }
}
function boardItemStyle(item) {
    return {
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        transform: `rotate(${item.rotation}deg)`,
        opacity: item.opacity / 100,
        borderRadius: `${item.radius}px`,
        zIndex: item.zIndex,
        backgroundImage: item.type === "image" ? `url('${item.url}')` : undefined,
        backgroundColor: item.type === "text" ? item.backgroundColor : undefined,
        color: item.type === "text" ? item.textColor : undefined,
    };
}
onMounted(async () => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopPointer);
    loadStoredBoard();
    try {
        library.value = await fetchImageLibrary();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : "加载失败";
    }
    finally {
        loading.value = false;
    }
});
onBeforeUnmount(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopPointer);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "moodboard-shell" },
});
/** @type {__VLS_StyleScopedClasses['moodboard-shell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "panel moodboard-sidebar" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['moodboard-sidebar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "moodboard-sidebar__head" },
});
/** @type {__VLS_StyleScopedClasses['moodboard-sidebar__head']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "helper" },
});
/** @type {__VLS_StyleScopedClasses['helper']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "primary-button upload-button" },
});
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    ...{ onChange: (__VLS_ctx.onUploadChange) },
    type: "file",
    accept: "image/png,image/jpeg,image/webp,image/gif",
});
if (__VLS_ctx.uploadState) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "helper" },
    });
    /** @type {__VLS_StyleScopedClasses['helper']} */ ;
    (__VLS_ctx.uploadState);
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "helper error" },
    });
    /** @type {__VLS_StyleScopedClasses['helper']} */ ;
    /** @type {__VLS_StyleScopedClasses['error']} */ ;
    (__VLS_ctx.error);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    value: (__VLS_ctx.search),
    type: "text",
    placeholder: "按标题、来源或 slug 搜索",
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "state-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['state-panel']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "library-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['library-grid']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.filteredLibrary))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (item.id),
            ...{ class: "library-card" },
        });
        /** @type {__VLS_StyleScopedClasses['library-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.addImageToBoard(item);
                    // @ts-ignore
                    [onUploadChange, uploadState, uploadState, error, error, search, loading, filteredLibrary, addImageToBoard,];
                } },
            ...{ class: "library-card__surface" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['library-card__surface']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "library-card__thumb" },
            ...{ style: ({ backgroundImage: `linear-gradient(180deg, rgba(10, 18, 32, 0.06), rgba(10, 18, 32, 0.52)), url('${__VLS_ctx.resolveAssetUrl(item.url) ?? item.url}')` }) },
        });
        /** @type {__VLS_StyleScopedClasses['library-card__thumb']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "library-card__body" },
        });
        /** @type {__VLS_StyleScopedClasses['library-card__body']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "tag" },
        });
        /** @type {__VLS_StyleScopedClasses['tag']} */ ;
        (item.source);
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (item.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (item.slug || "独立图片");
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "library-card__actions" },
        });
        /** @type {__VLS_StyleScopedClasses['library-card__actions']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.addImageToBoard(item);
                    // @ts-ignore
                    [addImageToBoard, resolveAssetUrl,];
                } },
            ...{ class: "ghost-button" },
            type: "button",
        });
        /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
        if (__VLS_ctx.selectedImageItem) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!(__VLS_ctx.selectedImageItem))
                            return;
                        __VLS_ctx.replaceSelectedImage(item);
                        // @ts-ignore
                        [selectedImageItem, replaceSelectedImage,];
                    } },
                ...{ class: "ghost-button" },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
        }
        // @ts-ignore
        [];
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "moodboard-stage" },
});
/** @type {__VLS_StyleScopedClasses['moodboard-stage']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "panel moodboard-topbar" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['moodboard-topbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    value: (__VLS_ctx.boardTitle),
    ...{ class: "board-title-input" },
    type: "text",
    placeholder: "Moodboard 标题",
});
/** @type {__VLS_StyleScopedClasses['board-title-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
    value: (__VLS_ctx.boardNote),
    rows: "2",
    placeholder: "写一句关于这张 moodboard 的说明",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "moodboard-actions" },
});
/** @type {__VLS_StyleScopedClasses['moodboard-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.addTextCard) },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.drawMode = !__VLS_ctx.drawMode;
            // @ts-ignore
            [boardTitle, boardNote, addTextCard, drawMode, drawMode,];
        } },
    ...{ class: "ghost-button" },
    type: "button",
    ...{ class: ({ 'is-active': __VLS_ctx.drawMode }) },
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
/** @type {__VLS_StyleScopedClasses['is-active']} */ ;
(__VLS_ctx.drawMode ? "退出涂鸦" : "涂鸦模式");
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.clearBoard) },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "ghost-button" },
    to: "/flow",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "ghost-button" },
    to: "/flow",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
// @ts-ignore
[drawMode, drawMode, clearBoard,];
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "panel moodboard-board" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['moodboard-board']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "board-caption" },
});
/** @type {__VLS_StyleScopedClasses['board-caption']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
(__VLS_ctx.boardTitle);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
(__VLS_ctx.boardNote);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ref: "boardCanvasRef",
    ...{ class: "board-canvas" },
});
/** @type {__VLS_StyleScopedClasses['board-canvas']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    ...{ onPointerdown: (__VLS_ctx.startDoodle) },
    ...{ class: "doodle-layer" },
    ...{ class: ({ 'is-enabled': __VLS_ctx.drawMode }) },
});
/** @type {__VLS_StyleScopedClasses['doodle-layer']} */ ;
/** @type {__VLS_StyleScopedClasses['is-enabled']} */ ;
for (const [doodle] of __VLS_vFor((__VLS_ctx.doodles))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        key: (doodle.id),
        d: (doodle.path),
        fill: "none",
        stroke: (doodle.color),
        'stroke-width': (doodle.width),
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
    });
    // @ts-ignore
    [boardTitle, boardNote, drawMode, startDoodle, doodles,];
}
if (__VLS_ctx.activeDoodlePath) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: (__VLS_ctx.activeDoodlePath),
        fill: "none",
        stroke: (__VLS_ctx.doodleColor),
        'stroke-width': (__VLS_ctx.doodleWidth),
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
    });
}
for (const [item] of __VLS_vFor((__VLS_ctx.boardItems))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onPointerdown: (...[$event]) => {
                __VLS_ctx.startDrag(item.id, $event);
                // @ts-ignore
                [activeDoodlePath, activeDoodlePath, doodleColor, doodleWidth, boardItems, startDrag,];
            } },
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectedId = item.id;
                // @ts-ignore
                [selectedId,];
            } },
        key: (item.id),
        ...{ class: "board-item" },
        ...{ class: ({ 'is-selected': __VLS_ctx.selectedId === item.id, 'board-item--text': item.type === 'text' }) },
        ...{ style: (__VLS_ctx.boardItemStyle(item)) },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['board-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-selected']} */ ;
    /** @type {__VLS_StyleScopedClasses['board-item--text']} */ ;
    if (item.type === 'image') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "board-item__label" },
        });
        /** @type {__VLS_StyleScopedClasses['board-item__label']} */ ;
        (item.title);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "board-text-card" },
            ...{ style: ({ fontSize: `${item.fontSize}px` }) },
        });
        /** @type {__VLS_StyleScopedClasses['board-text-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "board-text-card__title" },
        });
        /** @type {__VLS_StyleScopedClasses['board-text-card__title']} */ ;
        (item.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "board-text-card__content" },
        });
        /** @type {__VLS_StyleScopedClasses['board-text-card__content']} */ ;
        (item.text);
    }
    // @ts-ignore
    [selectedId, boardItemStyle,];
}
if (__VLS_ctx.boardItems.length === 0 && __VLS_ctx.doodles.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "board-empty" },
    });
    /** @type {__VLS_StyleScopedClasses['board-empty']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "panel moodboard-inspector" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['moodboard-inspector']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
(__VLS_ctx.selectedItem?.title || "未选择元素");
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "helper" },
});
/** @type {__VLS_StyleScopedClasses['helper']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "inspector-block" },
});
/** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "color",
    ...{ class: "color-input" },
});
(__VLS_ctx.doodleColor);
/** @type {__VLS_StyleScopedClasses['color-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "inspector-inline" },
});
/** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "range",
    min: "1",
    max: "24",
});
(__VLS_ctx.doodleWidth);
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "1",
    max: "24",
});
(__VLS_ctx.doodleWidth);
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.clearLastDoodle) },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
if (__VLS_ctx.selectedItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-block" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('x', Number($event.target.value));
                // @ts-ignore
                [doodles, doodleColor, doodleWidth, doodleWidth, boardItems, selectedItem, selectedItem, clearLastDoodle, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.x),
        type: "number",
        min: "0",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('y', Number($event.target.value));
                // @ts-ignore
                [selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.y),
        type: "number",
        min: "0",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-block" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-inline" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('width', Number($event.target.value));
                // @ts-ignore
                [selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.width),
        type: "range",
        min: "120",
        max: "900",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('width', Number($event.target.value));
                // @ts-ignore
                [selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.width),
        type: "number",
        min: "120",
        max: "900",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-inline" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('height', Number($event.target.value));
                // @ts-ignore
                [selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.height),
        type: "range",
        min: "120",
        max: "1200",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('height', Number($event.target.value));
                // @ts-ignore
                [selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.height),
        type: "number",
        min: "120",
        max: "1200",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-block" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-inline" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('rotation', Number($event.target.value));
                // @ts-ignore
                [selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.rotation),
        type: "range",
        min: "-45",
        max: "45",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('rotation', Number($event.target.value));
                // @ts-ignore
                [selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.rotation),
        type: "number",
        min: "-45",
        max: "45",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-inline" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('opacity', Number($event.target.value));
                // @ts-ignore
                [selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.opacity),
        type: "range",
        min: "20",
        max: "100",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('opacity', Number($event.target.value));
                // @ts-ignore
                [selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.opacity),
        type: "number",
        min: "20",
        max: "100",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-inline" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('radius', Number($event.target.value));
                // @ts-ignore
                [selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.radius),
        type: "range",
        min: "0",
        max: "48",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('radius', Number($event.target.value));
                // @ts-ignore
                [selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.radius),
        type: "number",
        min: "0",
        max: "48",
    });
    if (__VLS_ctx.selectedItem.type === 'image') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "inspector-block" },
        });
        /** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "eyebrow" },
        });
        /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "ghost-button upload-button" },
        });
        /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
        /** @type {__VLS_StyleScopedClasses['upload-button']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onChange: (__VLS_ctx.onReplaceUploadChange) },
            type: "file",
            accept: "image/png,image/jpeg,image/webp,image/gif",
        });
    }
    if (__VLS_ctx.selectedItem.type === 'text') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "inspector-block" },
        });
        /** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "eyebrow" },
        });
        /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.selectedItem))
                        return;
                    if (!(__VLS_ctx.selectedItem.type === 'text'))
                        return;
                    __VLS_ctx.patchTextSelected('title', $event.target.value);
                    // @ts-ignore
                    [selectedItem, selectedItem, selectedItem, onReplaceUploadChange, patchTextSelected,];
                } },
            value: (__VLS_ctx.selectedItem.title),
            type: "text",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.selectedItem))
                        return;
                    if (!(__VLS_ctx.selectedItem.type === 'text'))
                        return;
                    __VLS_ctx.patchTextSelected('text', $event.target.value);
                    // @ts-ignore
                    [selectedItem, patchTextSelected,];
                } },
            value: (__VLS_ctx.selectedItem.text),
            rows: "6",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "inspector-inline" },
        });
        /** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.selectedItem))
                        return;
                    if (!(__VLS_ctx.selectedItem.type === 'text'))
                        return;
                    __VLS_ctx.patchTextSelected('fontSize', Number($event.target.value));
                    // @ts-ignore
                    [selectedItem, patchTextSelected,];
                } },
            value: (__VLS_ctx.selectedItem.fontSize),
            type: "range",
            min: "14",
            max: "56",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.selectedItem))
                        return;
                    if (!(__VLS_ctx.selectedItem.type === 'text'))
                        return;
                    __VLS_ctx.patchTextSelected('fontSize', Number($event.target.value));
                    // @ts-ignore
                    [selectedItem, patchTextSelected,];
                } },
            value: (__VLS_ctx.selectedItem.fontSize),
            type: "number",
            min: "14",
            max: "56",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.selectedItem))
                        return;
                    if (!(__VLS_ctx.selectedItem.type === 'text'))
                        return;
                    __VLS_ctx.patchTextSelected('textColor', $event.target.value);
                    // @ts-ignore
                    [selectedItem, patchTextSelected,];
                } },
            value: (__VLS_ctx.selectedItem.textColor),
            type: "color",
            ...{ class: "color-input" },
        });
        /** @type {__VLS_StyleScopedClasses['color-input']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.selectedItem))
                        return;
                    if (!(__VLS_ctx.selectedItem.type === 'text'))
                        return;
                    __VLS_ctx.patchTextSelected('backgroundColor', $event.target.value);
                    // @ts-ignore
                    [selectedItem, patchTextSelected,];
                } },
            value: (__VLS_ctx.selectedItem.backgroundColor),
            type: "color",
            ...{ class: "color-input" },
        });
        /** @type {__VLS_StyleScopedClasses['color-input']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.bringToFront(__VLS_ctx.selectedItem.id);
                // @ts-ignore
                [selectedItem, selectedItem, bringToFront,];
            } },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.removeSelected) },
        ...{ class: "danger-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['danger-button']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-empty" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-empty']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
// @ts-ignore
[removeSelected,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
