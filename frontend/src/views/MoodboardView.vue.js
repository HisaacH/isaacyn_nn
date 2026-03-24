import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { createMoodboardTemplate, deleteMoodboardTemplate, fetchImageLibrary, fetchMoodboardTemplates, resolveAssetUrl, updateMoodboardTemplate, uploadImage, } from "../api/client";
import { useAuthStore } from "../stores/auth";
const STORAGE_KEY = "dora-moodboard-state";
const FONT_STACK = 'Aptos, "Segoe UI", "PingFang SC", sans-serif';
const IPHONE_13_PRO_WIDTH = 1170;
const IPHONE_13_PRO_HEIGHT = 2532;
const TEXT_FONT_OPTIONS = [
    { label: "苹方", value: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif' },
    { label: "思源黑体", value: '"Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif' },
    { label: "思源宋体", value: '"Source Han Serif SC", "Noto Serif CJK SC", serif' },
    { label: "华文书宋", value: '"STSong", "Songti SC", "SimSun", serif' },
    { label: "Aptos", value: 'Aptos, "Segoe UI", sans-serif' },
];
const auth = useAuthStore();
const library = ref([]);
const savedBoards = ref([]);
const boardItems = ref([]);
const doodles = ref([]);
const loading = ref(true);
const error = ref("");
const uploadState = ref("");
const boardState = ref("");
const exportState = ref("");
const selectedIds = ref([]);
const search = ref("");
const boardName = ref("未命名拼贴");
const boardGroup = ref("默认分组");
const boardTitle = ref("My Moodboard");
const boardNote = ref("把喜欢的封面、灵感图和新上传的图片拖进来，拼成一张更完整的视觉情绪板。");
const canvasWidth = ref(1800);
const canvasHeight = ref(1400);
const backgroundColor = ref("#0b1626");
const canvasZoom = ref(100);
const drawMode = ref(false);
const doodleColor = ref("#ffd6c8");
const doodleWidth = ref(6);
const activeDoodlePath = ref("");
const boardCanvasRef = ref(null);
const activeBoardId = ref(null);
const exportFormat = ref("png");
const exportWidth = ref(IPHONE_13_PRO_WIDTH);
const exportHeight = ref(IPHONE_13_PRO_HEIGHT);
const exportScale = ref(2);
const exportQuality = ref(92);
const exportBackground = ref("white");
const clipboardItems = ref([]);
let dragState = null;
let marqueeState = null;
let doodlePoints = [];
const measureCanvas = document.createElement("canvas");
const measureContext = measureCanvas.getContext("2d");
function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function isInputLike(target) {
    const element = target;
    return Boolean(element?.closest("input, textarea, select, [contenteditable='true']"));
}
function shapeDefaults(shapeKind) {
    if (shapeKind === "line") {
        return {
            width: 320,
            height: 72,
            shapeKind,
            strokeColor: "#f8fbff",
            fillColor: "transparent",
            strokeWidth: 4,
            strokeStyle: "solid",
            arrowStart: false,
            arrowEnd: false,
        };
    }
    if (shapeKind === "arrow") {
        return {
            width: 320,
            height: 72,
            shapeKind,
            strokeColor: "#f8fbff",
            fillColor: "transparent",
            strokeWidth: 4,
            strokeStyle: "solid",
            arrowStart: false,
            arrowEnd: true,
        };
    }
    return {
        width: 260,
        height: 180,
        shapeKind,
        strokeColor: "#f8fbff",
        fillColor: "rgba(248, 251, 255, 0.14)",
        strokeWidth: 3,
        strokeStyle: "solid",
        arrowStart: false,
        arrowEnd: false,
    };
}
function migrateBoardItem(rawItem) {
    if (!rawItem.id) {
        return null;
    }
    if (rawItem.type === "text") {
        return {
            id: rawItem.id,
            type: "text",
            title: rawItem.title || "文字卡片",
            text: rawItem.text || "输入你的主标题、副标题或方向说明。",
            textColor: rawItem.textColor || "#f8fbff",
            backgroundColor: rawItem.backgroundColor || "transparent",
            fontSize: Number(rawItem.fontSize) || 24,
            fontFamily: rawItem.fontFamily || TEXT_FONT_OPTIONS[0].value,
            autoSize: rawItem.autoSize ?? true,
            x: Number(rawItem.x) || 96,
            y: Number(rawItem.y) || 96,
            width: Number(rawItem.width) || 240,
            height: Number(rawItem.height) || 120,
            rotation: Number(rawItem.rotation) || 0,
            opacity: Number(rawItem.opacity) || 100,
            radius: Number(rawItem.radius) || 6,
            zIndex: Number(rawItem.zIndex) || 1,
        };
    }
    if (rawItem.type === "shape") {
        const shape = rawItem;
        const defaults = shapeDefaults(shape.shapeKind || "rect");
        return {
            id: rawItem.id,
            type: "shape",
            title: rawItem.title || "矢量元素",
            x: Number(rawItem.x) || 120,
            y: Number(rawItem.y) || 120,
            width: Number(rawItem.width) || defaults.width,
            height: Number(rawItem.height) || defaults.height,
            rotation: Number(rawItem.rotation) || 0,
            opacity: Number(rawItem.opacity) || 100,
            radius: Number(rawItem.radius) || 12,
            zIndex: Number(rawItem.zIndex) || 1,
            shapeKind: shape.shapeKind || defaults.shapeKind,
            strokeColor: shape.strokeColor || defaults.strokeColor,
            fillColor: shape.fillColor || defaults.fillColor,
            strokeWidth: Number(shape.strokeWidth) || defaults.strokeWidth,
            strokeStyle: shape.strokeStyle || defaults.strokeStyle,
            arrowStart: shape.arrowStart ?? defaults.arrowStart,
            arrowEnd: shape.arrowEnd ?? defaults.arrowEnd,
        };
    }
    return {
        id: rawItem.id,
        type: "image",
        libraryId: rawItem.libraryId || rawItem.id,
        url: rawItem.url || "",
        title: rawItem.title || "图片",
        x: Number(rawItem.x) || 40,
        y: Number(rawItem.y) || 48,
        width: Number(rawItem.width) || 260,
        height: Number(rawItem.height) || 320,
        rotation: Number(rawItem.rotation) || 0,
        opacity: Number(rawItem.opacity) || 100,
        radius: Number(rawItem.radius) || 5,
        zIndex: Number(rawItem.zIndex) || 1,
    };
}
function migrateDoodle(rawDoodle) {
    if (!rawDoodle.id || !rawDoodle.path) {
        return null;
    }
    return {
        id: rawDoodle.id,
        path: rawDoodle.path,
        color: rawDoodle.color || "#ffd6c8",
        width: Number(rawDoodle.width) || 6,
    };
}
function normalizeBoardItems(rawItems) {
    return (rawItems ?? [])
        .map((item) => migrateBoardItem(item))
        .filter((item) => Boolean(item));
}
function normalizeDoodles(rawDoodles) {
    return (rawDoodles ?? [])
        .map((item) => migrateDoodle(item))
        .filter((item) => Boolean(item));
}
function nextZIndex() {
    return boardItems.value.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1;
}
function tokenizeParagraph(paragraph) {
    return Array.from(paragraph || "");
}
function wrapTextLines(text, font, maxWidth) {
    if (!measureContext) {
        return text.split("\n");
    }
    measureContext.font = font;
    const paragraphs = text.split("\n");
    const lines = [];
    for (const paragraph of paragraphs) {
        if (!paragraph) {
            lines.push("");
            continue;
        }
        let current = "";
        for (const token of tokenizeParagraph(paragraph)) {
            const candidate = `${current}${token}`;
            if (!current || measureContext.measureText(candidate).width <= maxWidth) {
                current = candidate;
            }
            else {
                lines.push(current);
                current = token;
            }
        }
        lines.push(current);
    }
    return lines;
}
function getTextLayout(item) {
    const padding = 16;
    const titleFontSize = Math.max(12, item.fontSize * 0.52);
    const bodyLineHeight = item.fontSize * 1.36;
    const titleFont = `600 ${titleFontSize}px ${item.fontFamily}`;
    const bodyFont = `${item.fontSize}px ${item.fontFamily}`;
    if (!measureContext) {
        return { width: item.width, height: item.height, overflow: false };
    }
    measureContext.font = titleFont;
    const measuredTitleWidth = measureContext.measureText(item.title || "").width;
    if (item.autoSize) {
        measureContext.font = bodyFont;
        const measuredBodyWidth = Math.max(...item.text.split("\n").map((line) => measureContext.measureText(line || " ").width), 120);
        const targetWidth = Math.max(140, Math.min(920, Math.ceil(Math.max(measuredTitleWidth, measuredBodyWidth) + padding * 2)));
        const titleLines = wrapTextLines(item.title || "", titleFont, targetWidth - padding * 2);
        const bodyLines = wrapTextLines(item.text || "", bodyFont, targetWidth - padding * 2);
        const targetHeight = Math.max(72, Math.ceil(padding * 2 + titleLines.length * (titleFontSize * 1.18) + 12 + bodyLines.length * bodyLineHeight));
        return { width: targetWidth, height: targetHeight, overflow: false };
    }
    const usableWidth = Math.max(60, item.width - padding * 2);
    const titleLines = wrapTextLines(item.title || "", titleFont, usableWidth);
    const bodyLines = wrapTextLines(item.text || "", bodyFont, usableWidth);
    const requiredHeight = Math.ceil(padding * 2 + titleLines.length * (titleFontSize * 1.18) + 12 + bodyLines.length * bodyLineHeight);
    return {
        width: item.width,
        height: item.height,
        overflow: requiredHeight > item.height + 1,
    };
}
function syncTextAutoSize(itemId) {
    boardItems.value = boardItems.value.map((item) => {
        if (item.type !== "text") {
            return item;
        }
        if (itemId && item.id !== itemId) {
            return item;
        }
        if (!item.autoSize) {
            return item;
        }
        const layout = getTextLayout(item);
        return { ...item, width: layout.width, height: layout.height };
    });
}
function syncAllAutoText() {
    syncTextAutoSize();
}
function isTextOverflow(item) {
    return item.type === "text" && !item.autoSize && getTextLayout(item).overflow;
}
function bringToFront(id) {
    boardItems.value = boardItems.value.map((item) => item.id === id
        ? {
            ...item,
            zIndex: nextZIndex(),
        }
        : item);
}
function isSelected(itemId) {
    return selectedIds.value.includes(itemId);
}
function setSelected(itemId, mode = "replace") {
    if (mode === "replace") {
        selectedIds.value = [itemId];
        bringToFront(itemId);
        return;
    }
    if (mode === "add") {
        selectedIds.value = isSelected(itemId)
            ? [...selectedIds.value.filter((id) => id !== itemId), itemId]
            : [...selectedIds.value, itemId];
        bringToFront(itemId);
        return;
    }
    if (isSelected(itemId)) {
        selectedIds.value = selectedIds.value.filter((id) => id !== itemId);
        return;
    }
    selectedIds.value = [...selectedIds.value, itemId];
    bringToFront(itemId);
}
function clearSelection() {
    selectedIds.value = [];
}
function patchSelected(key, value) {
    if (!selectedIds.value.length) {
        return;
    }
    boardItems.value = boardItems.value.map((item) => selectedIds.value.includes(item.id)
        ? {
            ...item,
            [key]: value,
        }
        : item);
}
function patchTextSelected(key, value) {
    if (!selectedIds.value.length) {
        return;
    }
    boardItems.value = boardItems.value.map((item) => selectedIds.value.includes(item.id) && item.type === "text"
        ? {
            ...item,
            [key]: value,
        }
        : item);
    if (key === "text" || key === "title" || key === "fontSize" || key === "autoSize" || key === "fontFamily") {
        for (const itemId of selectedIds.value) {
            syncTextAutoSize(itemId);
        }
    }
}
function patchShapeSelected(key, value) {
    if (!selectedIds.value.length) {
        return;
    }
    boardItems.value = boardItems.value.map((item) => selectedIds.value.includes(item.id) && item.type === "shape"
        ? {
            ...item,
            [key]: value,
        }
        : item);
}
function addImageToBoard(item) {
    const boardItem = {
        id: createId("image"),
        type: "image",
        libraryId: item.id,
        url: resolveAssetUrl(item.url) ?? item.url,
        title: item.title,
        x: 48 + (boardItems.value.length % 4) * 40,
        y: 56 + (boardItems.value.length % 4) * 36,
        width: 260,
        height: 320,
        rotation: 0,
        opacity: 100,
        radius: 5,
        zIndex: nextZIndex(),
    };
    boardItems.value = [...boardItems.value, boardItem];
    selectedIds.value = [boardItem.id];
}
function replaceSelectedImage(item) {
    const selected = boardItems.value.find((entry) => entry.id === selectedIds.value[selectedIds.value.length - 1]);
    if (!selected || selected.type !== "image") {
        return;
    }
    boardItems.value = boardItems.value.map((boardItem) => boardItem.id === selected.id
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
        id: createId("text"),
        type: "text",
        title: "文字卡片",
        text: "输入你的主标题、副标题或方向说明。",
        textColor: "#f8fbff",
        backgroundColor: "transparent",
        fontSize: 24,
        fontFamily: TEXT_FONT_OPTIONS[0].value,
        autoSize: true,
        x: 96,
        y: 96,
        width: 220,
        height: 120,
        rotation: 0,
        opacity: 100,
        radius: 6,
        zIndex: nextZIndex(),
    };
    boardItems.value = [...boardItems.value, textItem];
    selectedIds.value = [textItem.id];
    syncTextAutoSize(textItem.id);
}
function addShape(shapeKind) {
    const defaults = shapeDefaults(shapeKind);
    const shapeItem = {
        id: createId("shape"),
        type: "shape",
        title: shapeKind === "rect" ? "矩形" : shapeKind === "circle" ? "圆形" : shapeKind === "line" ? "线条" : "箭头",
        x: 120,
        y: 120,
        width: defaults.width,
        height: defaults.height,
        rotation: 0,
        opacity: 100,
        radius: 12,
        zIndex: nextZIndex(),
        shapeKind: defaults.shapeKind,
        strokeColor: defaults.strokeColor,
        fillColor: defaults.fillColor,
        strokeWidth: defaults.strokeWidth,
        strokeStyle: defaults.strokeStyle,
        arrowStart: defaults.arrowStart,
        arrowEnd: defaults.arrowEnd,
    };
    boardItems.value = [...boardItems.value, shapeItem];
    selectedIds.value = [shapeItem.id];
}
function cloneBoardItem(item, offset = 24) {
    return {
        ...JSON.parse(JSON.stringify(item)),
        id: createId(item.type),
        x: Math.max(0, item.x + offset),
        y: Math.max(0, item.y + offset),
        zIndex: nextZIndex(),
    };
}
function duplicateSelected() {
    const selected = boardItems.value.filter((item) => selectedIds.value.includes(item.id));
    if (!selected.length) {
        return;
    }
    const duplicates = selected.map((item, index) => cloneBoardItem(item, 24 + index * 8));
    boardItems.value = [...boardItems.value, ...duplicates];
    selectedIds.value = duplicates.map((item) => item.id);
    for (const duplicate of duplicates) {
        if (duplicate.type === "text") {
            syncTextAutoSize(duplicate.id);
        }
    }
}
function copySelected(cut = false) {
    const selected = boardItems.value.filter((item) => selectedIds.value.includes(item.id));
    if (!selected.length) {
        return;
    }
    clipboardItems.value = JSON.parse(JSON.stringify(selected));
    if (cut) {
        removeSelected();
    }
}
function pasteClipboard() {
    if (!clipboardItems.value.length) {
        return;
    }
    const pasted = clipboardItems.value.map((item, index) => cloneBoardItem(item, 24 + index * 8));
    boardItems.value = [...boardItems.value, ...pasted];
    selectedIds.value = pasted.map((item) => item.id);
    for (const entry of pasted) {
        if (entry.type === "text") {
            syncTextAutoSize(entry.id);
        }
    }
}
function removeSelected() {
    if (!selectedIds.value.length) {
        return;
    }
    boardItems.value = boardItems.value.filter((item) => !selectedIds.value.includes(item.id));
    clearSelection();
}
function clearBoard() {
    boardItems.value = [];
    doodles.value = [];
    clearSelection();
}
function newBoard() {
    clearBoard();
    boardName.value = "未命名拼贴";
    boardGroup.value = "默认分组";
    boardTitle.value = "My Moodboard";
    boardNote.value = "把喜欢的封面、灵感图和新上传的图片拖进来，拼成一张更完整的视觉情绪板。";
    canvasWidth.value = 1800;
    canvasHeight.value = 1400;
    backgroundColor.value = "#0b1626";
    canvasZoom.value = 100;
    activeBoardId.value = null;
    clearSelection();
    boardState.value = "已新建空白 moodboard";
}
function alignSelected(action) {
    const selected = boardItems.value.filter((item) => selectedIds.value.includes(item.id));
    if (!selected.length) {
        return;
    }
    boardItems.value = boardItems.value.map((item) => !selectedIds.value.includes(item.id)
        ? item
        : {
            ...item,
            ...(action === "left" ? { x: 0 } : {}),
            ...(action === "center" ? { x: Math.round((canvasWidth.value - item.width) / 2) } : {}),
            ...(action === "right" ? { x: Math.max(0, canvasWidth.value - item.width) } : {}),
            ...(action === "top" ? { y: 0 } : {}),
            ...(action === "middle" ? { y: Math.round((canvasHeight.value - item.height) / 2) } : {}),
            ...(action === "bottom" ? { y: Math.max(0, canvasHeight.value - item.height) } : {}),
        });
}
function startDrag(id, event) {
    if (drawMode.value) {
        return;
    }
    if (event.button !== 0) {
        return;
    }
    const item = boardItems.value.find((entry) => entry.id === id);
    if (!item) {
        return;
    }
    event.preventDefault();
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
    }
    if (!isSelected(id)) {
        setSelected(id);
    }
    else {
        setSelected(id, "add");
    }
    const activeIds = selectedIds.value.length ? [...selectedIds.value] : [id];
    dragState = {
        ids: activeIds,
        startX: event.clientX,
        startY: event.clientY,
        origins: Object.fromEntries(boardItems.value
            .filter((entry) => activeIds.includes(entry.id))
            .map((entry) => [entry.id, { x: entry.x, y: entry.y }])),
    };
}
function boardPoint(event) {
    const rect = boardCanvasRef.value?.getBoundingClientRect();
    if (!rect) {
        return { x: 0, y: 0 };
    }
    const zoomFactor = canvasZoom.value / 100;
    return {
        x: Math.max(0, (event.clientX - rect.left) / zoomFactor),
        y: Math.max(0, (event.clientY - rect.top) / zoomFactor),
    };
}
function startCanvasSelection(event) {
    if (drawMode.value) {
        startDoodle(event);
        return;
    }
    if (event.target?.closest(".board-item")) {
        return;
    }
    event.preventDefault();
    const point = boardPoint(event);
    marqueeState = {
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
        additive: event.ctrlKey || event.metaKey || event.shiftKey,
    };
    if (!marqueeState.additive) {
        clearSelection();
    }
}
function startDoodle(event) {
    if (!drawMode.value) {
        return;
    }
    event.preventDefault();
    const point = boardPoint(event);
    doodlePoints = [`M ${point.x} ${point.y}`];
    activeDoodlePath.value = doodlePoints.join(" ");
    clearSelection();
}
function onPointerMove(event) {
    if (dragState) {
        const zoomFactor = canvasZoom.value / 100;
        const dx = (event.clientX - dragState.startX) / zoomFactor;
        const dy = (event.clientY - dragState.startY) / zoomFactor;
        boardItems.value = boardItems.value.map((item) => dragState?.ids.includes(item.id)
            ? {
                ...item,
                x: Math.max(0, (dragState.origins[item.id]?.x ?? item.x) + dx),
                y: Math.max(0, (dragState.origins[item.id]?.y ?? item.y) + dy),
            }
            : item);
        return;
    }
    if (marqueeState) {
        const point = boardPoint(event);
        marqueeState = {
            ...marqueeState,
            currentX: point.x,
            currentY: point.y,
        };
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
    if (marqueeState) {
        const minX = Math.min(marqueeState.startX, marqueeState.currentX);
        const minY = Math.min(marqueeState.startY, marqueeState.currentY);
        const maxX = Math.max(marqueeState.startX, marqueeState.currentX);
        const maxY = Math.max(marqueeState.startY, marqueeState.currentY);
        const pickedIds = boardItems.value
            .filter((item) => item.x < maxX && item.x + item.width > minX && item.y < maxY && item.y + item.height > minY)
            .map((item) => item.id);
        selectedIds.value = marqueeState.additive
            ? [...new Set([...selectedIds.value, ...pickedIds])]
            : pickedIds;
        marqueeState = null;
    }
    if (drawMode.value && activeDoodlePath.value) {
        doodles.value = [
            ...doodles.value,
            {
                id: createId("doodle"),
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
        backgroundImage: item.type === "image" ? `url('${resolveAssetUrl(item.url) ?? item.url}')` : undefined,
        backgroundColor: item.type === "text" ? item.backgroundColor : undefined,
        color: item.type === "text" ? item.textColor : undefined,
    };
}
function shapeDashArray(item) {
    return item.strokeStyle === "dashed" ? `${item.strokeWidth * 3} ${item.strokeWidth * 2}` : undefined;
}
function shapeGeometry(item) {
    const padding = Math.max(10, item.strokeWidth * 2.5);
    return {
        x1: padding,
        y1: item.height / 2,
        x2: Math.max(padding + 2, item.width - padding),
        y2: item.height / 2,
    };
}
function arrowHeadPoints(x, y, direction, size) {
    return [
        `${x},${y}`,
        `${x - size * direction},${y - size * 0.65}`,
        `${x - size * direction},${y + size * 0.65}`,
    ].join(" ");
}
function drawArrowHead(ctx, x, y, direction, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * direction, y - size * 0.65);
    ctx.lineTo(x - size * direction, y + size * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
function drawRoundedRect(ctx, x, y, width, height, radius) {
    const normalizedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + normalizedRadius, y);
    ctx.lineTo(x + width - normalizedRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + normalizedRadius);
    ctx.lineTo(x + width, y + height - normalizedRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - normalizedRadius, y + height);
    ctx.lineTo(x + normalizedRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - normalizedRadius);
    ctx.lineTo(x, y + normalizedRadius);
    ctx.quadraticCurveTo(x, y, x + normalizedRadius, y);
    ctx.closePath();
}
function isTransparent(value) {
    return value === "transparent" || value === "rgba(0, 0, 0, 0)";
}
function drawGridBackground(ctx, width, height, gridX, gridY, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += gridX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    ctx.restore();
}
function drawWrappedText(ctx, lines, x, y, lineHeight) {
    let cursorY = y;
    for (const line of lines) {
        ctx.fillText(line, x, cursorY);
        cursorY += lineHeight;
    }
}
function pathCommands(path) {
    return path.match(/[ML][^ML]+/g) ?? [];
}
async function loadImageElement(url) {
    const src = resolveAssetUrl(url) ?? url;
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`图片加载失败：${src}`));
        image.src = src;
    });
}
const zoomShellStyle = computed(() => ({
    width: `${Math.round(canvasWidth.value * (canvasZoom.value / 100))}px`,
    height: `${Math.round(canvasHeight.value * (canvasZoom.value / 100))}px`,
}));
const boardCanvasStyle = computed(() => ({
    width: `${canvasWidth.value}px`,
    height: `${canvasHeight.value}px`,
    transform: `scale(${canvasZoom.value / 100})`,
    transformOrigin: "top left",
    background: `
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    ${backgroundColor.value}
  `,
    backgroundSize: "28px 28px, 28px 28px, auto",
}));
function exportFillColor(mode) {
    if (mode === "black") {
        return "#000000";
    }
    if (mode === "transparent") {
        return "transparent";
    }
    return "#ffffff";
}
async function renderBoardCanvas(outputWidth, outputHeight, renderScale, exportMode) {
    const scaleX = outputWidth / canvasWidth.value;
    const scaleY = outputHeight / canvasHeight.value;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(outputWidth * renderScale);
    canvas.height = Math.round(outputHeight * renderScale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("浏览器无法创建导出画布");
    }
    if ("fonts" in document) {
        await document.fonts.ready;
    }
    ctx.scale(renderScale, renderScale);
    if (exportMode === "transparent") {
        ctx.clearRect(0, 0, outputWidth, outputHeight);
    }
    else if (exportMode) {
        ctx.fillStyle = exportFillColor(exportMode);
        ctx.fillRect(0, 0, outputWidth, outputHeight);
    }
    else {
        drawGridBackground(ctx, outputWidth, outputHeight, 28 * scaleX, 28 * scaleY, backgroundColor.value);
    }
    const sortedItems = [...boardItems.value].sort((a, b) => a.zIndex - b.zIndex);
    for (const item of sortedItems) {
        const drawX = item.x * scaleX;
        const drawY = item.y * scaleY;
        const drawWidth = item.width * scaleX;
        const drawHeight = item.height * scaleY;
        const drawRadius = item.radius * ((scaleX + scaleY) / 2);
        ctx.save();
        ctx.globalAlpha = item.opacity / 100;
        ctx.translate(drawX + drawWidth / 2, drawY + drawHeight / 2);
        ctx.rotate((item.rotation * Math.PI) / 180);
        if (item.type === "image") {
            const image = await loadImageElement(item.url);
            drawRoundedRect(ctx, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, drawRadius);
            ctx.clip();
            ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            ctx.restore();
            continue;
        }
        if (item.type === "shape") {
            const dashArray = item.strokeStyle === "dashed" ? [item.strokeWidth * 3, item.strokeWidth * 2] : [];
            ctx.lineWidth = item.strokeWidth * ((scaleX + scaleY) / 2);
            ctx.strokeStyle = item.strokeColor;
            ctx.setLineDash(dashArray.map((value) => value * ((scaleX + scaleY) / 2)));
            if (item.shapeKind === "rect") {
                drawRoundedRect(ctx, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, drawRadius);
                if (!isTransparent(item.fillColor)) {
                    ctx.fillStyle = item.fillColor;
                    ctx.fill();
                }
                ctx.stroke();
            }
            else if (item.shapeKind === "circle") {
                ctx.beginPath();
                ctx.ellipse(0, 0, drawWidth / 2, drawHeight / 2, 0, 0, Math.PI * 2);
                if (!isTransparent(item.fillColor)) {
                    ctx.fillStyle = item.fillColor;
                    ctx.fill();
                }
                ctx.stroke();
            }
            else {
                const padding = Math.max(12, item.strokeWidth * ((scaleX + scaleY) / 2) * 2.5);
                const startX = -drawWidth / 2 + padding;
                const endX = drawWidth / 2 - padding;
                ctx.beginPath();
                ctx.moveTo(startX, 0);
                ctx.lineTo(endX, 0);
                ctx.stroke();
                const headSize = Math.max(12, item.strokeWidth * ((scaleX + scaleY) / 2) * 3);
                if (item.arrowEnd) {
                    drawArrowHead(ctx, endX, 0, 1, headSize, item.strokeColor);
                }
                if (item.arrowStart) {
                    drawArrowHead(ctx, startX, 0, -1, headSize, item.strokeColor);
                }
            }
            ctx.restore();
            continue;
        }
        const layout = getTextLayout(item);
        const padding = 16 * ((scaleX + scaleY) / 2);
        const titleFontSize = Math.max(12, item.fontSize * 0.52 * ((scaleX + scaleY) / 2));
        const bodyFontSize = Math.max(12, item.fontSize * ((scaleX + scaleY) / 2));
        const titleFont = `600 ${titleFontSize}px ${item.fontFamily}`;
        const bodyFont = `${bodyFontSize}px ${item.fontFamily}`;
        const usableWidth = drawWidth - padding * 2;
        const titleLines = wrapTextLines(item.title || "", titleFont, usableWidth);
        const bodyLines = wrapTextLines(item.text || "", bodyFont, usableWidth);
        const titleLineHeight = titleFontSize * 1.18;
        const bodyLineHeight = bodyFontSize * 1.36;
        if (!isTransparent(item.backgroundColor)) {
            drawRoundedRect(ctx, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, drawRadius);
            ctx.fillStyle = item.backgroundColor;
            ctx.fill();
        }
        ctx.textBaseline = "top";
        ctx.fillStyle = item.textColor;
        ctx.font = titleFont;
        drawWrappedText(ctx, titleLines, -drawWidth / 2 + padding, -drawHeight / 2 + padding, titleLineHeight);
        ctx.font = bodyFont;
        const bodyTop = -drawHeight / 2 + padding + titleLines.length * titleLineHeight + 12;
        drawWrappedText(ctx, bodyLines, -drawWidth / 2 + padding, bodyTop, bodyLineHeight);
        if (!item.autoSize && layout.overflow) {
            ctx.strokeStyle = "#f87171";
            ctx.setLineDash([8, 6]);
            ctx.lineWidth = 2;
            drawRoundedRect(ctx, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, drawRadius);
            ctx.stroke();
        }
        ctx.restore();
    }
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const doodle of doodles.value) {
        const commands = pathCommands(doodle.path);
        ctx.beginPath();
        for (const command of commands) {
            const [type, rawX, rawY] = command.trim().split(/\s+/);
            const x = Number(rawX) * scaleX;
            const y = Number(rawY) * scaleY;
            if (type === "M") {
                ctx.moveTo(x, y);
            }
            else {
                ctx.lineTo(x, y);
            }
        }
        ctx.strokeStyle = doodle.color;
        ctx.lineWidth = doodle.width * ((scaleX + scaleY) / 2);
        ctx.stroke();
    }
    ctx.restore();
    return canvas;
}
async function generatePreviewImage() {
    const previewCanvas = await renderBoardCanvas(480, 680, 1);
    return previewCanvas.toDataURL("image/jpeg", 0.72);
}
async function snapshotBoardPayload(name) {
    return {
        name: name.trim() || boardTitle.value.trim() || "未命名拼贴",
        group_name: boardGroup.value.trim() || "默认分组",
        board_title: boardTitle.value,
        board_note: boardNote.value,
        canvas_width: Math.max(320, canvasWidth.value),
        canvas_height: Math.max(320, canvasHeight.value),
        background_color: backgroundColor.value,
        preview_image: await generatePreviewImage(),
        board_items: JSON.parse(JSON.stringify(boardItems.value)),
        doodles: JSON.parse(JSON.stringify(doodles.value)),
    };
}
function applyBoard(template) {
    boardItems.value = normalizeBoardItems(template.board_items);
    doodles.value = normalizeDoodles(template.doodles);
    boardName.value = template.name;
    boardGroup.value = template.group_name || "默认分组";
    boardTitle.value = template.board_title;
    boardNote.value = template.board_note;
    canvasWidth.value = template.canvas_width;
    canvasHeight.value = template.canvas_height;
    backgroundColor.value = template.background_color || "#0b1626";
    activeBoardId.value = template.id;
    clearSelection();
    boardState.value = `已载入 moodboard：${template.name}`;
    syncAllAutoText();
}
async function refreshBoards() {
    if (!auth.token) {
        savedBoards.value = [];
        return;
    }
    try {
        savedBoards.value = await fetchMoodboardTemplates(auth.token);
    }
    catch (err) {
        boardState.value = err instanceof Error ? err.message : "moodboard 列表加载失败";
    }
}
async function saveBoardAsNew() {
    if (!auth.token) {
        boardState.value = "请先登录管理员账号再保存 moodboard";
        return;
    }
    boardState.value = "保存中...";
    try {
        const record = await createMoodboardTemplate(await snapshotBoardPayload(boardName.value), auth.token);
        activeBoardId.value = record.id;
        boardName.value = record.name;
        boardGroup.value = record.group_name;
        boardState.value = `已保存 moodboard：${record.name}`;
        await refreshBoards();
    }
    catch (err) {
        boardState.value = err instanceof Error ? err.message : "保存失败";
    }
}
async function saveCurrentBoard() {
    if (!auth.token) {
        boardState.value = "请先登录管理员账号再保存 moodboard";
        return;
    }
    if (!activeBoardId.value) {
        await saveBoardAsNew();
        return;
    }
    boardState.value = "更新中...";
    try {
        const record = await updateMoodboardTemplate(activeBoardId.value, await snapshotBoardPayload(boardName.value), auth.token);
        boardName.value = record.name;
        boardGroup.value = record.group_name;
        boardState.value = `已更新 moodboard：${record.name}`;
        await refreshBoards();
    }
    catch (err) {
        boardState.value = err instanceof Error ? err.message : "更新失败";
    }
}
async function deleteBoardRecord(template) {
    if (!auth.token) {
        boardState.value = "请先登录管理员账号再删除 moodboard";
        return;
    }
    boardState.value = "删除中...";
    try {
        await deleteMoodboardTemplate(template.id, auth.token);
        if (activeBoardId.value === template.id) {
            newBoard();
        }
        boardState.value = `已删除 moodboard：${template.name}`;
        await refreshBoards();
    }
    catch (err) {
        boardState.value = err instanceof Error ? err.message : "删除失败";
    }
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
            id: createId("upload"),
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
    const selected = boardItems.value.find((item) => item.id === selectedIds.value[selectedIds.value.length - 1]);
    if (!file || !selected || selected.type !== "image") {
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
            id: createId("upload"),
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
function applyIphonePreset() {
    exportWidth.value = IPHONE_13_PRO_WIDTH;
    exportHeight.value = IPHONE_13_PRO_HEIGHT;
}
function useCurrentCanvasSize() {
    exportWidth.value = canvasWidth.value;
    exportHeight.value = canvasHeight.value;
}
function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(objectUrl);
}
async function exportBoard() {
    exportState.value = "导出中...";
    const outputWidth = Math.max(320, Number(exportWidth.value) || IPHONE_13_PRO_WIDTH);
    const outputHeight = Math.max(320, Number(exportHeight.value) || IPHONE_13_PRO_HEIGHT);
    const renderScale = Math.min(4, Math.max(1, Number(exportScale.value) || 2));
    const quality = Math.min(100, Math.max(10, Number(exportQuality.value) || 92)) / 100;
    try {
        const canvas = await renderBoardCanvas(outputWidth, outputHeight, renderScale, exportBackground.value);
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((result) => {
                if (!result) {
                    reject(new Error("导出失败，浏览器没有生成图片文件"));
                    return;
                }
                resolve(result);
            }, exportFormat.value === "png" ? "image/png" : "image/jpeg", quality);
        });
        const filenameBase = (boardName.value || boardTitle.value || "moodboard")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
            .replace(/^-+|-+$/g, "") || "moodboard";
        downloadBlob(blob, `${filenameBase}.${exportFormat.value === "png" ? "png" : "jpg"}`);
        exportState.value = `导出完成：${outputWidth} x ${outputHeight} / ${renderScale}x`;
    }
    catch (err) {
        exportState.value = err instanceof Error ? err.message : "导出失败";
    }
}
function formatTemplateTime(value) {
    return new Date(value).toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function loadStoredBoard() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return;
    }
    try {
        const parsed = JSON.parse(raw);
        boardItems.value = normalizeBoardItems(parsed.boardItems);
        doodles.value = normalizeDoodles(parsed.doodles);
        boardName.value = parsed.boardName ?? boardName.value;
        boardGroup.value = parsed.boardGroup ?? boardGroup.value;
        boardTitle.value = parsed.boardTitle ?? boardTitle.value;
        boardNote.value = parsed.boardNote ?? boardNote.value;
        canvasWidth.value = Number(parsed.canvasWidth) || canvasWidth.value;
        canvasHeight.value = Number(parsed.canvasHeight) || canvasHeight.value;
        backgroundColor.value = parsed.backgroundColor || backgroundColor.value;
        canvasZoom.value = Number(parsed.canvasZoom) || canvasZoom.value;
        activeBoardId.value = typeof parsed.activeBoardId === "number" ? parsed.activeBoardId : null;
    }
    catch {
        localStorage.removeItem(STORAGE_KEY);
    }
}
function onKeydown(event) {
    if (event.metaKey || event.ctrlKey) {
        const key = event.key.toLowerCase();
        if (isInputLike(event.target)) {
            return;
        }
        if (key === "c" && selectedIds.value.length) {
            event.preventDefault();
            copySelected(false);
            return;
        }
        if (key === "x" && selectedIds.value.length) {
            event.preventDefault();
            copySelected(true);
            return;
        }
        if (key === "v" && clipboardItems.value.length) {
            event.preventDefault();
            pasteClipboard();
            return;
        }
        if (key === "d" && selectedIds.value.length) {
            event.preventDefault();
            duplicateSelected();
        }
    }
    if (isInputLike(event.target)) {
        return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.value.length) {
        event.preventDefault();
        removeSelected();
    }
    if (event.key === "Escape") {
        clearSelection();
    }
}
const filteredLibrary = computed(() => {
    const keyword = search.value.trim().toLowerCase();
    if (!keyword) {
        return library.value;
    }
    return library.value.filter((item) => [item.title, item.source, item.slug ?? ""].some((value) => value.toLowerCase().includes(keyword)));
});
const primarySelectedId = computed(() => selectedIds.value[selectedIds.value.length - 1] ?? null);
const selectedItems = computed(() => boardItems.value.filter((item) => selectedIds.value.includes(item.id)));
const hasSelection = computed(() => selectedIds.value.length > 0);
const selectedItem = computed(() => boardItems.value.find((item) => item.id === primarySelectedId.value) ?? null);
const selectedImageItem = computed(() => (selectedItem.value?.type === "image" ? selectedItem.value : null));
const selectedTextItem = computed(() => (selectedItem.value?.type === "text" ? selectedItem.value : null));
const selectedShapeItem = computed(() => (selectedItem.value?.type === "shape" ? selectedItem.value : null));
const inspectorHelper = computed(() => {
    if (!hasSelection.value) {
        return "当前未选中素材，右侧显示画板参数与导出设置。";
    }
    if (selectedItems.value.length > 1) {
        return "当前以素材参数为主；通用参数会同步到全部选中元素，文字/图片/矢量的专项参数跟随主选中元素。";
    }
    return "当前以素材参数为主，画板参数会放到后面。";
});
const inspectorTitle = computed(() => {
    if (!selectedIds.value.length) {
        return "画板参数";
    }
    if (selectedIds.value.length === 1) {
        return selectedItem.value?.title || "元素编辑";
    }
    return `已选 ${selectedIds.value.length} 个元素`;
});
const marqueeStyle = computed(() => {
    if (!marqueeState) {
        return null;
    }
    const left = Math.min(marqueeState.startX, marqueeState.currentX);
    const top = Math.min(marqueeState.startY, marqueeState.currentY);
    const width = Math.abs(marqueeState.currentX - marqueeState.startX);
    const height = Math.abs(marqueeState.currentY - marqueeState.startY);
    return {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
    };
});
const groupedBoards = computed(() => {
    const groups = new Map();
    for (const board of savedBoards.value) {
        const key = board.group_name || "默认分组";
        groups.set(key, [...(groups.get(key) ?? []), board]);
    }
    return [...groups.entries()];
});
watch([boardItems, doodles, boardName, boardGroup, boardTitle, boardNote, canvasWidth, canvasHeight, backgroundColor, canvasZoom, activeBoardId], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        boardItems: boardItems.value,
        doodles: doodles.value,
        boardName: boardName.value,
        boardGroup: boardGroup.value,
        boardTitle: boardTitle.value,
        boardNote: boardNote.value,
        canvasWidth: canvasWidth.value,
        canvasHeight: canvasHeight.value,
        backgroundColor: backgroundColor.value,
        canvasZoom: canvasZoom.value,
        activeBoardId: activeBoardId.value,
    }));
}, { deep: true });
watch(() => auth.token, async (token) => {
    if (!token) {
        savedBoards.value = [];
        activeBoardId.value = null;
        return;
    }
    await refreshBoards();
});
onMounted(async () => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopPointer);
    window.addEventListener("keydown", onKeydown);
    loadStoredBoard();
    syncAllAutoText();
    try {
        const [images] = await Promise.all([fetchImageLibrary(), auth.token ? refreshBoards() : Promise.resolve()]);
        library.value = images;
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
    window.removeEventListener("keydown", onKeydown);
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "moodboard-stack" },
});
/** @type {__VLS_StyleScopedClasses['moodboard-stack']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.newBoard) },
    ...{ class: "primary-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.saveCurrentBoard) },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.saveBoardAsNew) },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
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
    value: (__VLS_ctx.boardName),
    type: "text",
    placeholder: "给这张板子命名",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    value: (__VLS_ctx.boardGroup),
    type: "text",
    placeholder: "例如：春夏灵感 / 包装 / 室内",
});
if (__VLS_ctx.boardState) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "helper" },
    });
    /** @type {__VLS_StyleScopedClasses['helper']} */ ;
    (__VLS_ctx.boardState);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "inspector-block" },
});
/** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
if (__VLS_ctx.savedBoards.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "template-list" },
    });
    /** @type {__VLS_StyleScopedClasses['template-list']} */ ;
    for (const [[groupName, items]] of __VLS_vFor((__VLS_ctx.groupedBoards))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (groupName),
            ...{ class: "template-group" },
        });
        /** @type {__VLS_StyleScopedClasses['template-group']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "template-group__title" },
        });
        /** @type {__VLS_StyleScopedClasses['template-group__title']} */ ;
        (groupName);
        for (const [board] of __VLS_vFor((items))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (board.id),
                ...{ class: "template-row" },
            });
            /** @type {__VLS_StyleScopedClasses['template-row']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.savedBoards.length))
                            return;
                        __VLS_ctx.applyBoard(board);
                        // @ts-ignore
                        [newBoard, saveCurrentBoard, saveBoardAsNew, boardName, boardGroup, boardState, boardState, savedBoards, groupedBoards, applyBoard,];
                    } },
                ...{ class: "template-card" },
                ...{ class: ({ 'is-active': __VLS_ctx.activeBoardId === board.id }) },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['template-card']} */ ;
            /** @type {__VLS_StyleScopedClasses['is-active']} */ ;
            if (board.preview_image) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
                    ...{ class: "template-card__preview" },
                    src: (board.preview_image),
                    alt: (board.name),
                });
                /** @type {__VLS_StyleScopedClasses['template-card__preview']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (board.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
            (__VLS_ctx.formatTemplateTime(board.updated_at));
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.savedBoards.length))
                            return;
                        __VLS_ctx.deleteBoardRecord(board);
                        // @ts-ignore
                        [activeBoardId, formatTemplateTime, deleteBoardRecord,];
                    } },
                ...{ class: "template-delete" },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['template-delete']} */ ;
            // @ts-ignore
            [];
        }
        // @ts-ignore
        [];
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-empty" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-empty']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "moodboard-sidebar__head" },
});
/** @type {__VLS_StyleScopedClasses['moodboard-sidebar__head']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
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
        (item.slug || '独立图片');
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "moodboard-topbar__meta" },
});
/** @type {__VLS_StyleScopedClasses['moodboard-topbar__meta']} */ ;
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
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "helper moodboard-size-note" },
});
/** @type {__VLS_StyleScopedClasses['helper']} */ ;
/** @type {__VLS_StyleScopedClasses['moodboard-size-note']} */ ;
(__VLS_ctx.canvasWidth);
(__VLS_ctx.canvasHeight);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "helper" },
});
/** @type {__VLS_StyleScopedClasses['helper']} */ ;
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
            __VLS_ctx.addShape('rect');
            // @ts-ignore
            [boardTitle, boardNote, canvasWidth, canvasHeight, addTextCard, addShape,];
        } },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.addShape('circle');
            // @ts-ignore
            [addShape,];
        } },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.addShape('line');
            // @ts-ignore
            [addShape,];
        } },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.addShape('arrow');
            // @ts-ignore
            [addShape,];
        } },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.drawMode = !__VLS_ctx.drawMode;
            // @ts-ignore
            [drawMode, drawMode,];
        } },
    ...{ class: "ghost-button" },
    type: "button",
    ...{ class: ({ 'is-active': __VLS_ctx.drawMode }) },
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
/** @type {__VLS_StyleScopedClasses['is-active']} */ ;
(__VLS_ctx.drawMode ? '退出涂鸦' : '涂鸦模式');
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
    ...{ class: "moodboard-zoombar" },
});
/** @type {__VLS_StyleScopedClasses['moodboard-zoombar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "inspector-inline moodboard-zoombar__controls" },
});
/** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['moodboard-zoombar__controls']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "range",
    min: "25",
    max: "200",
});
(__VLS_ctx.canvasZoom);
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "25",
    max: "200",
});
(__VLS_ctx.canvasZoom);
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.canvasZoom = 100;
            // @ts-ignore
            [boardTitle, boardNote, canvasZoom, canvasZoom, canvasZoom,];
        } },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "board-viewport" },
});
/** @type {__VLS_StyleScopedClasses['board-viewport']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "board-zoom-shell" },
    ...{ style: (__VLS_ctx.zoomShellStyle) },
});
/** @type {__VLS_StyleScopedClasses['board-zoom-shell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onPointerdown: (__VLS_ctx.startCanvasSelection) },
    ref: "boardCanvasRef",
    ...{ class: "board-canvas" },
    ...{ style: (__VLS_ctx.boardCanvasStyle) },
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
    [drawMode, zoomShellStyle, startCanvasSelection, boardCanvasStyle, startDoodle, doodles,];
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
                __VLS_ctx.setSelected(item.id, ($event.ctrlKey || $event.metaKey || $event.shiftKey) ? 'toggle' : (__VLS_ctx.isSelected(item.id) ? 'add' : 'replace'));
                // @ts-ignore
                [setSelected, isSelected,];
            } },
        key: (item.id),
        ...{ class: "board-item" },
        ...{ class: ({
                'is-selected': __VLS_ctx.isSelected(item.id),
                'board-item--text': item.type === 'text',
                'board-item--shape': item.type === 'shape',
                'board-item--overflow': item.type === 'text' && __VLS_ctx.isTextOverflow(item),
            }) },
        ...{ style: (__VLS_ctx.boardItemStyle(item)) },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['board-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['is-selected']} */ ;
    /** @type {__VLS_StyleScopedClasses['board-item--text']} */ ;
    /** @type {__VLS_StyleScopedClasses['board-item--shape']} */ ;
    /** @type {__VLS_StyleScopedClasses['board-item--overflow']} */ ;
    if (item.type === 'image') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "board-item__label" },
        });
        /** @type {__VLS_StyleScopedClasses['board-item__label']} */ ;
        (item.title);
    }
    else if (item.type === 'shape') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            ...{ class: "board-shape-svg" },
            viewBox: (`0 0 ${item.width} ${item.height}`),
            preserveAspectRatio: "none",
        });
        /** @type {__VLS_StyleScopedClasses['board-shape-svg']} */ ;
        if (item.shapeKind === 'rect') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
                x: (item.strokeWidth),
                y: (item.strokeWidth),
                width: (Math.max(0, item.width - item.strokeWidth * 2)),
                height: (Math.max(0, item.height - item.strokeWidth * 2)),
                rx: (item.radius),
                fill: (item.fillColor),
                stroke: (item.strokeColor),
                'stroke-width': (item.strokeWidth),
                'stroke-dasharray': (__VLS_ctx.shapeDashArray(item)),
            });
        }
        else if (item.shapeKind === 'circle') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.ellipse)({
                cx: (item.width / 2),
                cy: (item.height / 2),
                rx: (Math.max(0, item.width / 2 - item.strokeWidth)),
                ry: (Math.max(0, item.height / 2 - item.strokeWidth)),
                fill: (item.fillColor),
                stroke: (item.strokeColor),
                'stroke-width': (item.strokeWidth),
                'stroke-dasharray': (__VLS_ctx.shapeDashArray(item)),
            });
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
                x1: (__VLS_ctx.shapeGeometry(item).x1),
                y1: (__VLS_ctx.shapeGeometry(item).y1),
                x2: (__VLS_ctx.shapeGeometry(item).x2),
                y2: (__VLS_ctx.shapeGeometry(item).y2),
                stroke: (item.strokeColor),
                'stroke-width': (item.strokeWidth),
                'stroke-linecap': "round",
                'stroke-dasharray': (__VLS_ctx.shapeDashArray(item)),
            });
            if (item.arrowStart) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.polygon)({
                    points: (__VLS_ctx.arrowHeadPoints(__VLS_ctx.shapeGeometry(item).x1, __VLS_ctx.shapeGeometry(item).y1, -1, item.strokeWidth * 4)),
                    fill: (item.strokeColor),
                });
            }
            if (item.arrowEnd) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.polygon)({
                    points: (__VLS_ctx.arrowHeadPoints(__VLS_ctx.shapeGeometry(item).x2, __VLS_ctx.shapeGeometry(item).y2, 1, item.strokeWidth * 4)),
                    fill: (item.strokeColor),
                });
            }
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "board-text-card" },
            ...{ class: ({ 'is-overflow': __VLS_ctx.isTextOverflow(item) }) },
            ...{ style: ({ fontSize: `${item.fontSize}px`, fontFamily: item.fontFamily }) },
        });
        /** @type {__VLS_StyleScopedClasses['board-text-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['is-overflow']} */ ;
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
    [isSelected, isTextOverflow, isTextOverflow, boardItemStyle, shapeDashArray, shapeDashArray, shapeDashArray, shapeGeometry, shapeGeometry, shapeGeometry, shapeGeometry, shapeGeometry, shapeGeometry, shapeGeometry, shapeGeometry, arrowHeadPoints, arrowHeadPoints,];
}
if (__VLS_ctx.marqueeStyle) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "board-marquee" },
        ...{ style: (__VLS_ctx.marqueeStyle) },
    });
    /** @type {__VLS_StyleScopedClasses['board-marquee']} */ ;
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
(__VLS_ctx.inspectorTitle);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "helper" },
});
/** @type {__VLS_StyleScopedClasses['helper']} */ ;
(__VLS_ctx.inspectorHelper);
if (__VLS_ctx.selectedTextItem) {
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
                if (!(__VLS_ctx.selectedTextItem))
                    return;
                __VLS_ctx.patchTextSelected('title', $event.target.value);
                // @ts-ignore
                [doodles, boardItems, marqueeStyle, marqueeStyle, inspectorTitle, inspectorHelper, selectedTextItem, patchTextSelected,];
            } },
        value: (__VLS_ctx.selectedTextItem.title),
        type: "text",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.textarea, __VLS_intrinsics.textarea)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedTextItem))
                    return;
                __VLS_ctx.patchTextSelected('text', $event.target.value);
                // @ts-ignore
                [selectedTextItem, patchTextSelected,];
            } },
        value: (__VLS_ctx.selectedTextItem.text),
        rows: "6",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (...[$event]) => {
                if (!(__VLS_ctx.selectedTextItem))
                    return;
                __VLS_ctx.patchTextSelected('fontFamily', $event.target.value);
                // @ts-ignore
                [selectedTextItem, patchTextSelected,];
            } },
        value: (__VLS_ctx.selectedTextItem.fontFamily),
    });
    for (const [font] of __VLS_vFor((__VLS_ctx.TEXT_FONT_OPTIONS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (font.label),
            value: (font.value),
        });
        (font.label);
        // @ts-ignore
        [selectedTextItem, TEXT_FONT_OPTIONS,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "checkbox" },
    });
    /** @type {__VLS_StyleScopedClasses['checkbox']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (...[$event]) => {
                if (!(__VLS_ctx.selectedTextItem))
                    return;
                __VLS_ctx.patchTextSelected('autoSize', $event.target.checked);
                // @ts-ignore
                [patchTextSelected,];
            } },
        checked: (__VLS_ctx.selectedTextItem.autoSize),
        type: "checkbox",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-inline" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedTextItem))
                    return;
                __VLS_ctx.patchTextSelected('fontSize', Number($event.target.value));
                // @ts-ignore
                [selectedTextItem, patchTextSelected,];
            } },
        value: (__VLS_ctx.selectedTextItem.fontSize),
        type: "range",
        min: "14",
        max: "72",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedTextItem))
                    return;
                __VLS_ctx.patchTextSelected('fontSize', Number($event.target.value));
                // @ts-ignore
                [selectedTextItem, patchTextSelected,];
            } },
        value: (__VLS_ctx.selectedTextItem.fontSize),
        type: "number",
        min: "14",
        max: "72",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedTextItem))
                    return;
                __VLS_ctx.patchTextSelected('textColor', $event.target.value);
                // @ts-ignore
                [selectedTextItem, patchTextSelected,];
            } },
        value: (__VLS_ctx.selectedTextItem.textColor),
        type: "color",
        ...{ class: "color-input" },
    });
    /** @type {__VLS_StyleScopedClasses['color-input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedTextItem))
                    return;
                __VLS_ctx.patchTextSelected('backgroundColor', $event.target.value);
                // @ts-ignore
                [selectedTextItem, patchTextSelected,];
            } },
        value: (__VLS_ctx.selectedTextItem.backgroundColor === 'transparent' ? '#ffffff' : __VLS_ctx.selectedTextItem.backgroundColor),
        type: "color",
        ...{ class: "color-input" },
    });
    /** @type {__VLS_StyleScopedClasses['color-input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedTextItem))
                    return;
                __VLS_ctx.patchTextSelected('backgroundColor', 'transparent');
                // @ts-ignore
                [selectedTextItem, selectedTextItem, patchTextSelected,];
            } },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    if (__VLS_ctx.isTextOverflow(__VLS_ctx.selectedTextItem)) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "helper error" },
        });
        /** @type {__VLS_StyleScopedClasses['helper']} */ ;
        /** @type {__VLS_StyleScopedClasses['error']} */ ;
    }
}
if (__VLS_ctx.selectedItem) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-block" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "helper" },
    });
    /** @type {__VLS_StyleScopedClasses['helper']} */ ;
    (__VLS_ctx.selectedIds.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.alignSelected('left');
                // @ts-ignore
                [isTextOverflow, selectedTextItem, selectedItem, selectedIds, alignSelected,];
            } },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.alignSelected('center');
                // @ts-ignore
                [alignSelected,];
            } },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.alignSelected('right');
                // @ts-ignore
                [alignSelected,];
            } },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.alignSelected('top');
                // @ts-ignore
                [alignSelected,];
            } },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.alignSelected('middle');
                // @ts-ignore
                [alignSelected,];
            } },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.alignSelected('bottom');
                // @ts-ignore
                [alignSelected,];
            } },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-actions" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.copySelected(false);
                // @ts-ignore
                [copySelected,];
            } },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.copySelected(true);
                // @ts-ignore
                [copySelected,];
            } },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.pasteClipboard) },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.duplicateSelected) },
        ...{ class: "ghost-button" },
        type: "button",
    });
    /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "inspector-block" },
    });
    /** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "eyebrow" },
    });
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "helper" },
    });
    /** @type {__VLS_StyleScopedClasses['helper']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('x', Number($event.target.value));
                // @ts-ignore
                [pasteClipboard, duplicateSelected, patchSelected,];
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
        min: "40",
        max: "1600",
        disabled: (__VLS_ctx.selectedTextItem?.autoSize),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('width', Number($event.target.value));
                // @ts-ignore
                [selectedTextItem, selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.width),
        type: "number",
        min: "40",
        max: "1600",
        disabled: (__VLS_ctx.selectedTextItem?.autoSize),
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
                [selectedTextItem, selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.height),
        type: "range",
        min: "40",
        max: "1600",
        disabled: (__VLS_ctx.selectedTextItem?.autoSize),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.patchSelected('height', Number($event.target.value));
                // @ts-ignore
                [selectedTextItem, selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.height),
        type: "number",
        min: "40",
        max: "1600",
        disabled: (__VLS_ctx.selectedTextItem?.autoSize),
    });
    if (__VLS_ctx.selectedTextItem?.autoSize) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "helper" },
        });
        /** @type {__VLS_StyleScopedClasses['helper']} */ ;
    }
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
                [selectedTextItem, selectedTextItem, selectedItem, patchSelected,];
            } },
        value: (__VLS_ctx.selectedItem.rotation),
        type: "range",
        min: "-180",
        max: "180",
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
        min: "-180",
        max: "180",
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
        max: "120",
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
        max: "120",
    });
    if (__VLS_ctx.selectedImageItem) {
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
    if (__VLS_ctx.selectedShapeItem) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "inspector-block" },
        });
        /** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "eyebrow" },
        });
        /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            ...{ onChange: (...[$event]) => {
                    if (!(__VLS_ctx.selectedItem))
                        return;
                    if (!(__VLS_ctx.selectedShapeItem))
                        return;
                    __VLS_ctx.patchShapeSelected('shapeKind', $event.target.value);
                    // @ts-ignore
                    [selectedImageItem, selectedItem, onReplaceUploadChange, selectedShapeItem, patchShapeSelected,];
                } },
            value: (__VLS_ctx.selectedShapeItem.shapeKind),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "rect",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "circle",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "line",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "arrow",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.selectedItem))
                        return;
                    if (!(__VLS_ctx.selectedShapeItem))
                        return;
                    __VLS_ctx.patchShapeSelected('strokeColor', $event.target.value);
                    // @ts-ignore
                    [selectedShapeItem, patchShapeSelected,];
                } },
            value: (__VLS_ctx.selectedShapeItem.strokeColor),
            type: "color",
            ...{ class: "color-input" },
        });
        /** @type {__VLS_StyleScopedClasses['color-input']} */ ;
        if (__VLS_ctx.selectedShapeItem.shapeKind === 'rect' || __VLS_ctx.selectedShapeItem.shapeKind === 'circle') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onInput: (...[$event]) => {
                        if (!(__VLS_ctx.selectedItem))
                            return;
                        if (!(__VLS_ctx.selectedShapeItem))
                            return;
                        if (!(__VLS_ctx.selectedShapeItem.shapeKind === 'rect' || __VLS_ctx.selectedShapeItem.shapeKind === 'circle'))
                            return;
                        __VLS_ctx.patchShapeSelected('fillColor', $event.target.value);
                        // @ts-ignore
                        [selectedShapeItem, selectedShapeItem, selectedShapeItem, patchShapeSelected,];
                    } },
                value: (__VLS_ctx.selectedShapeItem.fillColor === 'transparent' ? '#ffffff' : __VLS_ctx.selectedShapeItem.fillColor),
                type: "color",
                ...{ class: "color-input" },
            });
            /** @type {__VLS_StyleScopedClasses['color-input']} */ ;
        }
        if (__VLS_ctx.selectedShapeItem.shapeKind === 'rect' || __VLS_ctx.selectedShapeItem.shapeKind === 'circle') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.selectedItem))
                            return;
                        if (!(__VLS_ctx.selectedShapeItem))
                            return;
                        if (!(__VLS_ctx.selectedShapeItem.shapeKind === 'rect' || __VLS_ctx.selectedShapeItem.shapeKind === 'circle'))
                            return;
                        __VLS_ctx.patchShapeSelected('fillColor', 'transparent');
                        // @ts-ignore
                        [selectedShapeItem, selectedShapeItem, selectedShapeItem, selectedShapeItem, patchShapeSelected,];
                    } },
                ...{ class: "ghost-button" },
                type: "button",
            });
            /** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "inspector-inline" },
        });
        /** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.selectedItem))
                        return;
                    if (!(__VLS_ctx.selectedShapeItem))
                        return;
                    __VLS_ctx.patchShapeSelected('strokeWidth', Number($event.target.value));
                    // @ts-ignore
                    [patchShapeSelected,];
                } },
            value: (__VLS_ctx.selectedShapeItem.strokeWidth),
            type: "range",
            min: "1",
            max: "24",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.selectedItem))
                        return;
                    if (!(__VLS_ctx.selectedShapeItem))
                        return;
                    __VLS_ctx.patchShapeSelected('strokeWidth', Number($event.target.value));
                    // @ts-ignore
                    [selectedShapeItem, patchShapeSelected,];
                } },
            value: (__VLS_ctx.selectedShapeItem.strokeWidth),
            type: "number",
            min: "1",
            max: "24",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            ...{ onChange: (...[$event]) => {
                    if (!(__VLS_ctx.selectedItem))
                        return;
                    if (!(__VLS_ctx.selectedShapeItem))
                        return;
                    __VLS_ctx.patchShapeSelected('strokeStyle', $event.target.value);
                    // @ts-ignore
                    [selectedShapeItem, patchShapeSelected,];
                } },
            value: (__VLS_ctx.selectedShapeItem.strokeStyle),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "solid",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "dashed",
        });
        if (__VLS_ctx.selectedShapeItem.shapeKind === 'line' || __VLS_ctx.selectedShapeItem.shapeKind === 'arrow') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "checkbox" },
            });
            /** @type {__VLS_StyleScopedClasses['checkbox']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onChange: (...[$event]) => {
                        if (!(__VLS_ctx.selectedItem))
                            return;
                        if (!(__VLS_ctx.selectedShapeItem))
                            return;
                        if (!(__VLS_ctx.selectedShapeItem.shapeKind === 'line' || __VLS_ctx.selectedShapeItem.shapeKind === 'arrow'))
                            return;
                        __VLS_ctx.patchShapeSelected('arrowStart', $event.target.checked);
                        // @ts-ignore
                        [selectedShapeItem, selectedShapeItem, selectedShapeItem, patchShapeSelected,];
                    } },
                checked: (__VLS_ctx.selectedShapeItem.arrowStart),
                type: "checkbox",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        }
        if (__VLS_ctx.selectedShapeItem.shapeKind === 'line' || __VLS_ctx.selectedShapeItem.shapeKind === 'arrow') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "checkbox" },
            });
            /** @type {__VLS_StyleScopedClasses['checkbox']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onChange: (...[$event]) => {
                        if (!(__VLS_ctx.selectedItem))
                            return;
                        if (!(__VLS_ctx.selectedShapeItem))
                            return;
                        if (!(__VLS_ctx.selectedShapeItem.shapeKind === 'line' || __VLS_ctx.selectedShapeItem.shapeKind === 'arrow'))
                            return;
                        __VLS_ctx.patchShapeSelected('arrowEnd', $event.target.checked);
                        // @ts-ignore
                        [selectedShapeItem, selectedShapeItem, selectedShapeItem, patchShapeSelected,];
                    } },
                checked: (__VLS_ctx.selectedShapeItem.arrowEnd),
                type: "checkbox",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        }
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedItem))
                    return;
                __VLS_ctx.bringToFront(__VLS_ctx.selectedItem.id);
                // @ts-ignore
                [selectedItem, selectedShapeItem, bringToFront,];
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
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "inspector-block" },
    ...{ class: ({ 'inspector-block--secondary': __VLS_ctx.hasSelection }) },
});
/** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-block--secondary']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "320",
    max: "6000",
});
(__VLS_ctx.canvasWidth);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "320",
    max: "6000",
});
(__VLS_ctx.canvasHeight);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "color",
    ...{ class: "color-input" },
});
(__VLS_ctx.backgroundColor);
/** @type {__VLS_StyleScopedClasses['color-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "inspector-block" },
    ...{ class: ({ 'inspector-block--secondary': __VLS_ctx.hasSelection }) },
});
/** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-block--secondary']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.exportFormat),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "png",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "jpeg",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.exportBackground),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "white",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "transparent",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "black",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "320",
    max: "6000",
});
(__VLS_ctx.exportWidth);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "320",
    max: "6000",
});
(__VLS_ctx.exportHeight);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "inspector-inline" },
});
/** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "range",
    min: "1",
    max: "4",
});
(__VLS_ctx.exportScale);
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "1",
    max: "4",
});
(__VLS_ctx.exportScale);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "inspector-inline" },
});
/** @type {__VLS_StyleScopedClasses['inspector-inline']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "range",
    min: "10",
    max: "100",
});
(__VLS_ctx.exportQuality);
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "10",
    max: "100",
});
(__VLS_ctx.exportQuality);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "inspector-actions" },
});
/** @type {__VLS_StyleScopedClasses['inspector-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.applyIphonePreset) },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.useCurrentCanvasSize) },
    ...{ class: "ghost-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.exportBoard) },
    ...{ class: "primary-button" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
if (__VLS_ctx.exportState) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "helper" },
    });
    /** @type {__VLS_StyleScopedClasses['helper']} */ ;
    (__VLS_ctx.exportState);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "inspector-block" },
    ...{ class: ({ 'inspector-block--secondary': __VLS_ctx.hasSelection }) },
});
/** @type {__VLS_StyleScopedClasses['inspector-block']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-block--secondary']} */ ;
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
// @ts-ignore
[canvasWidth, canvasHeight, doodleColor, doodleWidth, doodleWidth, removeSelected, hasSelection, hasSelection, hasSelection, backgroundColor, exportFormat, exportBackground, exportWidth, exportHeight, exportScale, exportScale, exportQuality, exportQuality, applyIphonePreset, useCurrentCanvasSize, exportBoard, exportState, exportState, clearLastDoodle,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
