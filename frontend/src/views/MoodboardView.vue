<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import {
  createMoodboardTemplate,
  deleteMoodboardTemplate,
  fetchImageLibrary,
  fetchMoodboardTemplates,
  resolveAssetUrl,
  updateMoodboardTemplate,
  uploadImage,
} from "../api/client";
import { useAuthStore } from "../stores/auth";
import type { ImageLibraryItem, MoodboardTemplate, MoodboardTemplatePayload } from "../types";

type BoardItemType = "image" | "text" | "shape";
type ShapeKind = "rect" | "circle" | "line" | "arrow";
type StrokeStyle = "solid" | "dashed";
type AlignAction = "left" | "center" | "right" | "top" | "middle" | "bottom";
type ExportFormat = "png" | "jpeg";
type ExportBackground = "white" | "transparent" | "black";

interface BoardItemBase {
  id: string;
  type: BoardItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  radius: number;
  zIndex: number;
}

interface ImageBoardItem extends BoardItemBase {
  type: "image";
  libraryId: string;
  url: string;
  title: string;
}

interface TextBoardItem extends BoardItemBase {
  type: "text";
  title: string;
  text: string;
  textColor: string;
  backgroundColor: string;
  fontSize: number;
  fontFamily: string;
  autoSize: boolean;
}

interface ShapeBoardItem extends BoardItemBase {
  type: "shape";
  title: string;
  shapeKind: ShapeKind;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  arrowStart: boolean;
  arrowEnd: boolean;
}

interface Doodle {
  id: string;
  path: string;
  color: string;
  width: number;
}

type BoardItem = ImageBoardItem | TextBoardItem | ShapeBoardItem;

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

const library = ref<ImageLibraryItem[]>([]);
const savedBoards = ref<MoodboardTemplate[]>([]);
const boardItems = ref<BoardItem[]>([]);
const doodles = ref<Doodle[]>([]);
const loading = ref(true);
const error = ref("");
const uploadState = ref("");
const boardState = ref("");
const exportState = ref("");
const selectedIds = ref<string[]>([]);
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
const boardCanvasRef = ref<HTMLElement | null>(null);
const activeBoardId = ref<number | null>(null);
const exportFormat = ref<ExportFormat>("png");
const exportWidth = ref(IPHONE_13_PRO_WIDTH);
const exportHeight = ref(IPHONE_13_PRO_HEIGHT);
const exportScale = ref(2);
const exportQuality = ref(92);
const exportBackground = ref<ExportBackground>("white");
const clipboardItems = ref<BoardItem[]>([]);

let dragState:
  | {
      ids: string[];
      startX: number;
      startY: number;
      origins: Record<string, { x: number; y: number }>;
    }
  | null = null;

let marqueeState:
  | {
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
      additive: boolean;
    }
  | null = null;

let doodlePoints: string[] = [];

const measureCanvas = document.createElement("canvas");
const measureContext = measureCanvas.getContext("2d");

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isInputLike(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(element?.closest("input, textarea, select, [contenteditable='true']"));
}

function shapeDefaults(shapeKind: ShapeKind): Pick<
  ShapeBoardItem,
  "width" | "height" | "shapeKind" | "strokeColor" | "fillColor" | "strokeWidth" | "strokeStyle" | "arrowStart" | "arrowEnd"
> {
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

function migrateBoardItem(rawItem: Partial<BoardItem>): BoardItem | null {
  if (!rawItem.id) {
    return null;
  }

  if (rawItem.type === "text") {
    return {
      id: rawItem.id,
      type: "text",
      title: rawItem.title || "文字卡片",
      text: (rawItem as Partial<TextBoardItem>).text || "输入你的主标题、副标题或方向说明。",
      textColor: (rawItem as Partial<TextBoardItem>).textColor || "#f8fbff",
      backgroundColor: (rawItem as Partial<TextBoardItem>).backgroundColor || "transparent",
      fontSize: Number((rawItem as Partial<TextBoardItem>).fontSize) || 24,
      fontFamily: (rawItem as Partial<TextBoardItem>).fontFamily || TEXT_FONT_OPTIONS[0].value,
      autoSize: (rawItem as Partial<TextBoardItem>).autoSize ?? true,
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
    const shape = rawItem as Partial<ShapeBoardItem>;
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
    libraryId: (rawItem as Partial<ImageBoardItem>).libraryId || rawItem.id,
    url: (rawItem as Partial<ImageBoardItem>).url || "",
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

function migrateDoodle(rawDoodle: Partial<Doodle>): Doodle | null {
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

function normalizeBoardItems(rawItems: Partial<BoardItem>[] | undefined) {
  return (rawItems ?? [])
    .map((item) => migrateBoardItem(item))
    .filter((item): item is BoardItem => Boolean(item));
}

function normalizeDoodles(rawDoodles: Partial<Doodle>[] | undefined) {
  return (rawDoodles ?? [])
    .map((item) => migrateDoodle(item))
    .filter((item): item is Doodle => Boolean(item));
}

function nextZIndex() {
  return boardItems.value.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1;
}

function tokenizeParagraph(paragraph: string) {
  return Array.from(paragraph || "");
}

function wrapTextLines(text: string, font: string, maxWidth: number) {
  if (!measureContext) {
    return text.split("\n");
  }

  measureContext.font = font;
  const paragraphs = text.split("\n");
  const lines: string[] = [];

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
      } else {
        lines.push(current);
        current = token;
      }
    }
    lines.push(current);
  }

  return lines;
}

function getTextLayout(item: TextBoardItem) {
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
    const measuredBodyWidth = Math.max(
      ...item.text.split("\n").map((line) => measureContext.measureText(line || " ").width),
      120,
    );
    const targetWidth = Math.max(140, Math.min(920, Math.ceil(Math.max(measuredTitleWidth, measuredBodyWidth) + padding * 2)));
    const titleLines = wrapTextLines(item.title || "", titleFont, targetWidth - padding * 2);
    const bodyLines = wrapTextLines(item.text || "", bodyFont, targetWidth - padding * 2);
    const targetHeight = Math.max(
      72,
      Math.ceil(padding * 2 + titleLines.length * (titleFontSize * 1.18) + 12 + bodyLines.length * bodyLineHeight),
    );
    return { width: targetWidth, height: targetHeight, overflow: false };
  }

  const usableWidth = Math.max(60, item.width - padding * 2);
  const titleLines = wrapTextLines(item.title || "", titleFont, usableWidth);
  const bodyLines = wrapTextLines(item.text || "", bodyFont, usableWidth);
  const requiredHeight = Math.ceil(
    padding * 2 + titleLines.length * (titleFontSize * 1.18) + 12 + bodyLines.length * bodyLineHeight,
  );
  return {
    width: item.width,
    height: item.height,
    overflow: requiredHeight > item.height + 1,
  };
}

function syncTextAutoSize(itemId?: string) {
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

function isTextOverflow(item: BoardItem) {
  return item.type === "text" && !item.autoSize && getTextLayout(item).overflow;
}

function bringToFront(id: string) {
  boardItems.value = boardItems.value.map((item) =>
    item.id === id
      ? {
          ...item,
          zIndex: nextZIndex(),
        }
      : item,
  );
}

function isSelected(itemId: string) {
  return selectedIds.value.includes(itemId);
}

function setSelected(itemId: string, mode: "replace" | "add" | "toggle" = "replace") {
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

function patchSelected<K extends keyof BoardItem>(key: K, value: BoardItem[K]) {
  if (!selectedIds.value.length) {
    return;
  }

  boardItems.value = boardItems.value.map((item) =>
    selectedIds.value.includes(item.id)
      ? {
          ...item,
          [key]: value,
        }
      : item,
  );
}

function patchTextSelected<K extends keyof TextBoardItem>(key: K, value: TextBoardItem[K]) {
  if (!selectedIds.value.length) {
    return;
  }

  boardItems.value = boardItems.value.map((item) =>
    selectedIds.value.includes(item.id) && item.type === "text"
      ? {
          ...item,
          [key]: value,
        }
      : item,
  );

  if (key === "text" || key === "title" || key === "fontSize" || key === "autoSize" || key === "fontFamily") {
    for (const itemId of selectedIds.value) {
      syncTextAutoSize(itemId);
    }
  }
}

function patchShapeSelected<K extends keyof ShapeBoardItem>(key: K, value: ShapeBoardItem[K]) {
  if (!selectedIds.value.length) {
    return;
  }

  boardItems.value = boardItems.value.map((item) =>
    selectedIds.value.includes(item.id) && item.type === "shape"
      ? {
          ...item,
          [key]: value,
        }
      : item,
  );
}

function addImageToBoard(item: ImageLibraryItem) {
  const boardItem: ImageBoardItem = {
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

function replaceSelectedImage(item: ImageLibraryItem) {
  const selected = boardItems.value.find((entry) => entry.id === selectedIds.value[selectedIds.value.length - 1]);
  if (!selected || selected.type !== "image") {
    return;
  }

  boardItems.value = boardItems.value.map((boardItem) =>
    boardItem.id === selected.id
      ? {
          ...boardItem,
          libraryId: item.id,
          url: resolveAssetUrl(item.url) ?? item.url,
          title: item.title,
        }
      : boardItem,
  );
}

function addTextCard() {
  const textItem: TextBoardItem = {
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

function addShape(shapeKind: ShapeKind) {
  const defaults = shapeDefaults(shapeKind);
  const shapeItem: ShapeBoardItem = {
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

function cloneBoardItem(item: BoardItem, offset = 24): BoardItem {
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

function alignSelected(action: AlignAction) {
  const selected = boardItems.value.filter((item) => selectedIds.value.includes(item.id));
  if (!selected.length) {
    return;
  }

  boardItems.value = boardItems.value.map((item) =>
    !selectedIds.value.includes(item.id)
      ? item
      : ({
          ...item,
          ...(action === "left" ? { x: 0 } : {}),
          ...(action === "center" ? { x: Math.round((canvasWidth.value - item.width) / 2) } : {}),
          ...(action === "right" ? { x: Math.max(0, canvasWidth.value - item.width) } : {}),
          ...(action === "top" ? { y: 0 } : {}),
          ...(action === "middle" ? { y: Math.round((canvasHeight.value - item.height) / 2) } : {}),
          ...(action === "bottom" ? { y: Math.max(0, canvasHeight.value - item.height) } : {}),
        } as BoardItem),
  );
}

function startDrag(id: string, event: PointerEvent) {
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
  } else {
    setSelected(id, "add");
  }
  const activeIds = selectedIds.value.length ? [...selectedIds.value] : [id];
  dragState = {
    ids: activeIds,
    startX: event.clientX,
    startY: event.clientY,
    origins: Object.fromEntries(
      boardItems.value
        .filter((entry) => activeIds.includes(entry.id))
        .map((entry) => [entry.id, { x: entry.x, y: entry.y }]),
    ),
  };
}

function boardPoint(event: PointerEvent) {
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

function startCanvasSelection(event: PointerEvent) {
  if (drawMode.value) {
    startDoodle(event);
    return;
  }

  if ((event.target as HTMLElement | null)?.closest(".board-item")) {
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

function startDoodle(event: PointerEvent) {
  if (!drawMode.value) {
    return;
  }

  event.preventDefault();
  const point = boardPoint(event);
  doodlePoints = [`M ${point.x} ${point.y}`];
  activeDoodlePath.value = doodlePoints.join(" ");
  clearSelection();
}

function onPointerMove(event: PointerEvent) {
  if (dragState) {
    const zoomFactor = canvasZoom.value / 100;
    const dx = (event.clientX - dragState.startX) / zoomFactor;
    const dy = (event.clientY - dragState.startY) / zoomFactor;
    boardItems.value = boardItems.value.map((item) =>
      dragState?.ids.includes(item.id)
        ? {
            ...item,
            x: Math.max(0, (dragState.origins[item.id]?.x ?? item.x) + dx),
            y: Math.max(0, (dragState.origins[item.id]?.y ?? item.y) + dy),
          }
        : item,
    );
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

function boardItemStyle(item: BoardItem) {
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

function shapeDashArray(item: ShapeBoardItem) {
  return item.strokeStyle === "dashed" ? `${item.strokeWidth * 3} ${item.strokeWidth * 2}` : undefined;
}

function shapeGeometry(item: ShapeBoardItem) {
  const padding = Math.max(10, item.strokeWidth * 2.5);
  return {
    x1: padding,
    y1: item.height / 2,
    x2: Math.max(padding + 2, item.width - padding),
    y2: item.height / 2,
  };
}

function arrowHeadPoints(x: number, y: number, direction: 1 | -1, size: number) {
  return [
    `${x},${y}`,
    `${x - size * direction},${y - size * 0.65}`,
    `${x - size * direction},${y + size * 0.65}`,
  ].join(" ");
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, direction: 1 | -1, size: number, color: string) {
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

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
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

function isTransparent(value: string) {
  return value === "transparent" || value === "rgba(0, 0, 0, 0)";
}

function drawGridBackground(ctx: CanvasRenderingContext2D, width: number, height: number, gridX: number, gridY: number, fill: string) {
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

function drawWrappedText(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number) {
  let cursorY = y;
  for (const line of lines) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
}

function pathCommands(path: string) {
  return path.match(/[ML][^ML]+/g) ?? [];
}

async function loadImageElement(url: string) {
  const src = resolveAssetUrl(url) ?? url;
  return new Promise<HTMLImageElement>((resolve, reject) => {
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

function exportFillColor(mode: ExportBackground) {
  if (mode === "black") {
    return "#000000";
  }
  if (mode === "transparent") {
    return "transparent";
  }
  return "#ffffff";
}

async function renderBoardCanvas(outputWidth: number, outputHeight: number, renderScale: number, exportMode?: ExportBackground) {
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
    await (document as Document & { fonts: FontFaceSet }).fonts.ready;
  }

  ctx.scale(renderScale, renderScale);
  if (exportMode === "transparent") {
    ctx.clearRect(0, 0, outputWidth, outputHeight);
  } else if (exportMode) {
    ctx.fillStyle = exportFillColor(exportMode);
    ctx.fillRect(0, 0, outputWidth, outputHeight);
  } else {
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
      } else if (item.shapeKind === "circle") {
        ctx.beginPath();
        ctx.ellipse(0, 0, drawWidth / 2, drawHeight / 2, 0, 0, Math.PI * 2);
        if (!isTransparent(item.fillColor)) {
          ctx.fillStyle = item.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      } else {
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
      } else {
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

async function snapshotBoardPayload(name: string): Promise<MoodboardTemplatePayload> {
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

function applyBoard(template: MoodboardTemplate) {
  boardItems.value = normalizeBoardItems(template.board_items as Partial<BoardItem>[]);
  doodles.value = normalizeDoodles(template.doodles as Partial<Doodle>[]);
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
    boardState.value = err instanceof Error ? err.message : "更新失败";
  }
}

async function deleteBoardRecord(template: MoodboardTemplate) {
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
  } catch (err) {
    boardState.value = err instanceof Error ? err.message : "删除失败";
  }
}

async function onUploadChange(event: Event) {
  const input = event.target as HTMLInputElement;
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
    const uploadedItem: ImageLibraryItem = {
      id: createId("upload"),
      url: result.url,
      title: file.name.replace(/\.[^.]+$/, ""),
      source: "upload",
      slug: null,
    };
    library.value = [uploadedItem, ...library.value];
    addImageToBoard(uploadedItem);
    uploadState.value = "上传成功，已加入画板";
  } catch (err) {
    uploadState.value = err instanceof Error ? err.message : "上传失败";
  } finally {
    input.value = "";
  }
}

async function onReplaceUploadChange(event: Event) {
  const input = event.target as HTMLInputElement;
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
    const uploadedItem: ImageLibraryItem = {
      id: createId("upload"),
      url: result.url,
      title: file.name.replace(/\.[^.]+$/, ""),
      source: "upload",
      slug: null,
    };
    library.value = [uploadedItem, ...library.value];
    replaceSelectedImage(uploadedItem);
    uploadState.value = "图片已替换，原有尺寸和位置已保留";
  } catch (err) {
    uploadState.value = err instanceof Error ? err.message : "替换失败";
  } finally {
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

function downloadBlob(blob: Blob, filename: string) {
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
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error("导出失败，浏览器没有生成图片文件"));
            return;
          }
          resolve(result);
        },
        exportFormat.value === "png" ? "image/png" : "image/jpeg",
        quality,
      );
    });

    const filenameBase = (boardName.value || boardTitle.value || "moodboard")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "moodboard";

    downloadBlob(blob, `${filenameBase}.${exportFormat.value === "png" ? "png" : "jpg"}`);
    exportState.value = `导出完成：${outputWidth} x ${outputHeight} / ${renderScale}x`;
  } catch (err) {
    exportState.value = err instanceof Error ? err.message : "导出失败";
  }
}

function formatTemplateTime(value: string) {
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
    const parsed = JSON.parse(raw) as {
      boardItems?: Partial<BoardItem>[];
      doodles?: Partial<Doodle>[];
      boardName?: string;
      boardGroup?: string;
      boardTitle?: string;
      boardNote?: string;
      canvasWidth?: number;
      canvasHeight?: number;
      backgroundColor?: string;
      canvasZoom?: number;
      activeBoardId?: number | null;
    };

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
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function onKeydown(event: KeyboardEvent) {
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

  return library.value.filter((item) =>
    [item.title, item.source, item.slug ?? ""].some((value) => value.toLowerCase().includes(keyword)),
  );
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
  const groups = new Map<string, MoodboardTemplate[]>();
  for (const board of savedBoards.value) {
    const key = board.group_name || "默认分组";
    groups.set(key, [...(groups.get(key) ?? []), board]);
  }
  return [...groups.entries()];
});

watch(
  [boardItems, doodles, boardName, boardGroup, boardTitle, boardNote, canvasWidth, canvasHeight, backgroundColor, canvasZoom, activeBoardId],
  () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
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
      }),
    );
  },
  { deep: true },
);

watch(
  () => auth.token,
  async (token) => {
    if (!token) {
      savedBoards.value = [];
      activeBoardId.value = null;
      return;
    }
    await refreshBoards();
  },
);

onMounted(async () => {
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", stopPointer);
  window.addEventListener("keydown", onKeydown);
  loadStoredBoard();
  syncAllAutoText();

  try {
    const [images] = await Promise.all([fetchImageLibrary(), auth.token ? refreshBoards() : Promise.resolve()]);
    library.value = images;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", stopPointer);
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <section class="moodboard-shell">
    <aside class="panel moodboard-sidebar">
      <div class="moodboard-sidebar__head">
        <div>
          <p class="eyebrow">Moodboards</p>
          <h1>拼贴板</h1>
          <p class="helper">新建、保存、分组、图片库和已保存板子都放在左侧。</p>
        </div>
        <div class="moodboard-stack">
          <button class="primary-button" type="button" @click="newBoard">新建 Moodboard</button>
          <button class="ghost-button" type="button" @click="saveCurrentBoard">保存当前</button>
          <button class="ghost-button" type="button" @click="saveBoardAsNew">另存为新板</button>
        </div>
      </div>

      <div class="inspector-block">
        <p class="eyebrow">Board Meta</p>
        <label>
          板子名称
          <input v-model="boardName" type="text" placeholder="给这张板子命名" />
        </label>
        <label>
          分组
          <input v-model="boardGroup" type="text" placeholder="例如：春夏灵感 / 包装 / 室内" />
        </label>
        <p v-if="boardState" class="helper">{{ boardState }}</p>
      </div>

      <div class="inspector-block">
        <p class="eyebrow">Saved Boards</p>
        <div v-if="savedBoards.length" class="template-list">
          <div v-for="[groupName, items] in groupedBoards" :key="groupName" class="template-group">
            <div class="template-group__title">{{ groupName }}</div>
            <div v-for="board in items" :key="board.id" class="template-row">
              <button class="template-card" :class="{ 'is-active': activeBoardId === board.id }" type="button" @click="applyBoard(board)">
                <img v-if="board.preview_image" class="template-card__preview" :src="board.preview_image" :alt="board.name" />
                <strong>{{ board.name }}</strong>
                <small>{{ formatTemplateTime(board.updated_at) }}</small>
              </button>
              <button class="template-delete" type="button" @click="deleteBoardRecord(board)">删除</button>
            </div>
          </div>
        </div>
        <div v-else class="inspector-empty">
          <p>还没有保存的 moodboard，先做一张再存。</p>
        </div>
      </div>

      <div class="moodboard-sidebar__head">
        <div>
          <p class="eyebrow">Image Library</p>
          <p class="helper">上传新图、加到画板、替换当前图片都在这里。</p>
        </div>
        <label class="primary-button upload-button">
          上传新图片
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onUploadChange" />
        </label>
      </div>

      <p v-if="uploadState" class="helper">{{ uploadState }}</p>
      <p v-if="error" class="helper error">{{ error }}</p>

      <label>
        搜索图片
        <input v-model="search" type="text" placeholder="按标题、来源或 slug 搜索" />
      </label>

      <div v-if="loading" class="state-panel">图片库加载中...</div>
      <div v-else class="library-grid">
        <div v-for="item in filteredLibrary" :key="item.id" class="library-card">
          <button class="library-card__surface" type="button" @click="addImageToBoard(item)">
            <div
              class="library-card__thumb"
              :style="{ backgroundImage: `linear-gradient(180deg, rgba(10, 18, 32, 0.06), rgba(10, 18, 32, 0.52)), url('${resolveAssetUrl(item.url) ?? item.url}')` }"
            ></div>
            <div class="library-card__body">
              <span class="tag">{{ item.source }}</span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.slug || '独立图片' }}</small>
            </div>
          </button>
          <div class="library-card__actions">
            <button class="ghost-button" type="button" @click="addImageToBoard(item)">添加到画板</button>
            <button v-if="selectedImageItem" class="ghost-button" type="button" @click="replaceSelectedImage(item)">替换当前图</button>
          </div>
        </div>
      </div>
    </aside>

    <section class="moodboard-stage">
      <div class="panel moodboard-topbar">
        <div class="moodboard-topbar__meta">
          <p class="eyebrow">Board</p>
          <input v-model="boardTitle" class="board-title-input" type="text" placeholder="Moodboard 标题" />
          <textarea v-model="boardNote" rows="2" placeholder="写一句关于这张 moodboard 的说明"></textarea>
          <p class="helper moodboard-size-note">当前画布：{{ canvasWidth }} x {{ canvasHeight }}</p>
          <p class="helper">快捷键：Ctrl/Cmd + C/X/V/D 复制、剪切、粘贴、复制一份，Delete 删除。</p>
        </div>
        <div class="moodboard-actions">
          <button class="ghost-button" type="button" @click="addTextCard">添加文字</button>
          <button class="ghost-button" type="button" @click="addShape('rect')">矩形</button>
          <button class="ghost-button" type="button" @click="addShape('circle')">圆形</button>
          <button class="ghost-button" type="button" @click="addShape('line')">线条</button>
          <button class="ghost-button" type="button" @click="addShape('arrow')">箭头</button>
          <button class="ghost-button" type="button" :class="{ 'is-active': drawMode }" @click="drawMode = !drawMode">
            {{ drawMode ? '退出涂鸦' : '涂鸦模式' }}
          </button>
          <button class="ghost-button" type="button" @click="clearBoard">清空画板</button>
          <RouterLink class="ghost-button" to="/flow">浏览图片流</RouterLink>
        </div>
      </div>

      <div class="panel moodboard-board">
        <div class="board-caption">
          <h2>{{ boardTitle }}</h2>
          <p>{{ boardNote }}</p>
        </div>

        <div class="moodboard-zoombar">
          <span class="eyebrow">Zoom</span>
          <div class="inspector-inline moodboard-zoombar__controls">
            <input v-model="canvasZoom" type="range" min="25" max="200" />
            <input v-model="canvasZoom" type="number" min="25" max="200" />
          </div>
          <button class="ghost-button" type="button" @click="canvasZoom = 100">100%</button>
        </div>

        <div class="board-viewport">
          <div class="board-zoom-shell" :style="zoomShellStyle">
            <div ref="boardCanvasRef" class="board-canvas" :style="boardCanvasStyle" @pointerdown.self="startCanvasSelection">
              <svg class="doodle-layer" :class="{ 'is-enabled': drawMode }" @pointerdown="startDoodle">
                <path
                  v-for="doodle in doodles"
                  :key="doodle.id"
                  :d="doodle.path"
                  fill="none"
                  :stroke="doodle.color"
                  :stroke-width="doodle.width"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  v-if="activeDoodlePath"
                  :d="activeDoodlePath"
                  fill="none"
                  :stroke="doodleColor"
                  :stroke-width="doodleWidth"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>

              <button
                v-for="item in boardItems"
                :key="item.id"
                class="board-item"
                :class="{
                  'is-selected': isSelected(item.id),
                  'board-item--text': item.type === 'text',
                  'board-item--shape': item.type === 'shape',
                  'board-item--overflow': item.type === 'text' && isTextOverflow(item),
                }"
                :style="boardItemStyle(item)"
                type="button"
                @pointerdown="startDrag(item.id, $event)"
                @click.stop="setSelected(item.id, ($event.ctrlKey || $event.metaKey || $event.shiftKey) ? 'toggle' : (isSelected(item.id) ? 'add' : 'replace'))"
              >
                <template v-if="item.type === 'image'">
                  <span class="board-item__label">{{ item.title }}</span>
                </template>

                <template v-else-if="item.type === 'shape'">
                  <svg class="board-shape-svg" :viewBox="`0 0 ${item.width} ${item.height}`" preserveAspectRatio="none">
                    <rect
                      v-if="item.shapeKind === 'rect'"
                      :x="item.strokeWidth"
                      :y="item.strokeWidth"
                      :width="Math.max(0, item.width - item.strokeWidth * 2)"
                      :height="Math.max(0, item.height - item.strokeWidth * 2)"
                      :rx="item.radius"
                      :fill="item.fillColor"
                      :stroke="item.strokeColor"
                      :stroke-width="item.strokeWidth"
                      :stroke-dasharray="shapeDashArray(item)"
                    />
                    <ellipse
                      v-else-if="item.shapeKind === 'circle'"
                      :cx="item.width / 2"
                      :cy="item.height / 2"
                      :rx="Math.max(0, item.width / 2 - item.strokeWidth)"
                      :ry="Math.max(0, item.height / 2 - item.strokeWidth)"
                      :fill="item.fillColor"
                      :stroke="item.strokeColor"
                      :stroke-width="item.strokeWidth"
                      :stroke-dasharray="shapeDashArray(item)"
                    />
                    <template v-else>
                      <line
                        :x1="shapeGeometry(item).x1"
                        :y1="shapeGeometry(item).y1"
                        :x2="shapeGeometry(item).x2"
                        :y2="shapeGeometry(item).y2"
                        :stroke="item.strokeColor"
                        :stroke-width="item.strokeWidth"
                        stroke-linecap="round"
                        :stroke-dasharray="shapeDashArray(item)"
                      />
                      <polygon
                        v-if="item.arrowStart"
                        :points="arrowHeadPoints(shapeGeometry(item).x1, shapeGeometry(item).y1, -1, item.strokeWidth * 4)"
                        :fill="item.strokeColor"
                      />
                      <polygon
                        v-if="item.arrowEnd"
                        :points="arrowHeadPoints(shapeGeometry(item).x2, shapeGeometry(item).y2, 1, item.strokeWidth * 4)"
                        :fill="item.strokeColor"
                      />
                    </template>
                  </svg>
                </template>

                <template v-else>
                  <div class="board-text-card" :class="{ 'is-overflow': isTextOverflow(item) }" :style="{ fontSize: `${item.fontSize}px`, fontFamily: item.fontFamily }">
                    <div class="board-text-card__title">{{ item.title }}</div>
                    <div class="board-text-card__content">{{ item.text }}</div>
                  </div>
                </template>
              </button>

              <div v-if="marqueeStyle" class="board-marquee" :style="marqueeStyle"></div>

              <div v-if="boardItems.length === 0 && doodles.length === 0" class="board-empty">
                <p class="eyebrow">Start Here</p>
                <h3>现在已经支持多板子、对齐、字体、导出背景和矢量图形</h3>
                <p>文字默认自适应边界，固定尺寸时溢出会红框提醒；保存后的 moodboard 也会出现在图片流里。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <aside class="panel moodboard-inspector">
      <div>
        <p class="eyebrow">Inspector</p>
        <h2>{{ inspectorTitle }}</h2>
        <p class="helper">{{ inspectorHelper }}</p>
      </div>

      <template v-if="selectedTextItem">
        <div class="inspector-block">
          <p class="eyebrow">Text</p>
          <label>
            标题
            <input :value="selectedTextItem.title" type="text" @input="patchTextSelected('title', ($event.target as HTMLInputElement).value)" />
          </label>
          <label>
            正文
            <textarea :value="selectedTextItem.text" rows="6" @input="patchTextSelected('text', ($event.target as HTMLTextAreaElement).value)"></textarea>
          </label>
          <label>
            字体
            <select :value="selectedTextItem.fontFamily" @change="patchTextSelected('fontFamily', ($event.target as HTMLSelectElement).value)">
              <option v-for="font in TEXT_FONT_OPTIONS" :key="font.label" :value="font.value">{{ font.label }}</option>
            </select>
          </label>
          <label class="checkbox">
            <input :checked="selectedTextItem.autoSize" type="checkbox" @change="patchTextSelected('autoSize', ($event.target as HTMLInputElement).checked)" />
            <span>自动贴合文字边界</span>
          </label>
          <label>
            字号
            <div class="inspector-inline">
              <input :value="selectedTextItem.fontSize" type="range" min="14" max="72" @input="patchTextSelected('fontSize', Number(($event.target as HTMLInputElement).value))" />
              <input :value="selectedTextItem.fontSize" type="number" min="14" max="72" @input="patchTextSelected('fontSize', Number(($event.target as HTMLInputElement).value))" />
            </div>
          </label>
          <label>
            文字颜色
            <input :value="selectedTextItem.textColor" type="color" class="color-input" @input="patchTextSelected('textColor', ($event.target as HTMLInputElement).value)" />
          </label>
          <label>
            背景颜色
            <input
              :value="selectedTextItem.backgroundColor === 'transparent' ? '#ffffff' : selectedTextItem.backgroundColor"
              type="color"
              class="color-input"
              @input="patchTextSelected('backgroundColor', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <button class="ghost-button" type="button" @click="patchTextSelected('backgroundColor', 'transparent')">设为透明背景</button>
          <p v-if="isTextOverflow(selectedTextItem)" class="helper error">固定尺寸下文字已溢出，红框提示已显示。</p>
        </div>
      </template>

      <template v-if="selectedItem">
        <div class="inspector-block">
          <p class="eyebrow">Align</p>
          <p class="helper">当前选中 {{ selectedIds.length }} 个元素</p>
          <div class="inspector-actions">
            <button class="ghost-button" type="button" @click="alignSelected('left')">左对齐</button>
            <button class="ghost-button" type="button" @click="alignSelected('center')">水平居中</button>
            <button class="ghost-button" type="button" @click="alignSelected('right')">右对齐</button>
            <button class="ghost-button" type="button" @click="alignSelected('top')">顶对齐</button>
            <button class="ghost-button" type="button" @click="alignSelected('middle')">垂直居中</button>
            <button class="ghost-button" type="button" @click="alignSelected('bottom')">底对齐</button>
          </div>
          <div class="inspector-actions">
            <button class="ghost-button" type="button" @click="copySelected(false)">复制</button>
            <button class="ghost-button" type="button" @click="copySelected(true)">剪切</button>
            <button class="ghost-button" type="button" @click="pasteClipboard">粘贴</button>
            <button class="ghost-button" type="button" @click="duplicateSelected">复制一份</button>
          </div>
        </div>

        <div class="inspector-block">
          <p class="eyebrow">Position</p>
          <p class="helper">这里的通用位置和尺寸参数会同步应用到所有选中元素。</p>
          <label>
            X
            <input :value="selectedItem.x" type="number" min="0" @input="patchSelected('x', Number(($event.target as HTMLInputElement).value))" />
          </label>
          <label>
            Y
            <input :value="selectedItem.y" type="number" min="0" @input="patchSelected('y', Number(($event.target as HTMLInputElement).value))" />
          </label>
        </div>

        <div class="inspector-block">
          <p class="eyebrow">Size</p>
          <label>
            宽度
            <div class="inspector-inline">
              <input :value="selectedItem.width" type="range" min="40" max="1600" :disabled="selectedTextItem?.autoSize" @input="patchSelected('width', Number(($event.target as HTMLInputElement).value))" />
              <input :value="selectedItem.width" type="number" min="40" max="1600" :disabled="selectedTextItem?.autoSize" @input="patchSelected('width', Number(($event.target as HTMLInputElement).value))" />
            </div>
          </label>
          <label>
            高度
            <div class="inspector-inline">
              <input :value="selectedItem.height" type="range" min="40" max="1600" :disabled="selectedTextItem?.autoSize" @input="patchSelected('height', Number(($event.target as HTMLInputElement).value))" />
              <input :value="selectedItem.height" type="number" min="40" max="1600" :disabled="selectedTextItem?.autoSize" @input="patchSelected('height', Number(($event.target as HTMLInputElement).value))" />
            </div>
          </label>
          <p v-if="selectedTextItem?.autoSize" class="helper">文字卡片开启自动贴边时，尺寸由文本内容决定。</p>
        </div>

        <div class="inspector-block">
          <p class="eyebrow">Style</p>
          <label>
            旋转
            <div class="inspector-inline">
              <input :value="selectedItem.rotation" type="range" min="-180" max="180" @input="patchSelected('rotation', Number(($event.target as HTMLInputElement).value))" />
              <input :value="selectedItem.rotation" type="number" min="-180" max="180" @input="patchSelected('rotation', Number(($event.target as HTMLInputElement).value))" />
            </div>
          </label>
          <label>
            透明度
            <div class="inspector-inline">
              <input :value="selectedItem.opacity" type="range" min="20" max="100" @input="patchSelected('opacity', Number(($event.target as HTMLInputElement).value))" />
              <input :value="selectedItem.opacity" type="number" min="20" max="100" @input="patchSelected('opacity', Number(($event.target as HTMLInputElement).value))" />
            </div>
          </label>
          <label>
            圆角
            <div class="inspector-inline">
              <input :value="selectedItem.radius" type="range" min="0" max="120" @input="patchSelected('radius', Number(($event.target as HTMLInputElement).value))" />
              <input :value="selectedItem.radius" type="number" min="0" max="120" @input="patchSelected('radius', Number(($event.target as HTMLInputElement).value))" />
            </div>
          </label>
        </div>

        <div v-if="selectedImageItem" class="inspector-block">
          <p class="eyebrow">Image</p>
          <label class="ghost-button upload-button">
            上传替换当前图片
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onReplaceUploadChange" />
          </label>
        </div>

        <div v-if="selectedShapeItem" class="inspector-block">
          <p class="eyebrow">Shape</p>
          <label>
            形状
            <select :value="selectedShapeItem.shapeKind" @change="patchShapeSelected('shapeKind', ($event.target as HTMLSelectElement).value as ShapeKind)">
              <option value="rect">矩形</option>
              <option value="circle">圆形</option>
              <option value="line">线条</option>
              <option value="arrow">箭头</option>
            </select>
          </label>
          <label>
            线条颜色
            <input :value="selectedShapeItem.strokeColor" type="color" class="color-input" @input="patchShapeSelected('strokeColor', ($event.target as HTMLInputElement).value)" />
          </label>
          <label v-if="selectedShapeItem.shapeKind === 'rect' || selectedShapeItem.shapeKind === 'circle'">
            填充颜色
            <input :value="selectedShapeItem.fillColor === 'transparent' ? '#ffffff' : selectedShapeItem.fillColor" type="color" class="color-input" @input="patchShapeSelected('fillColor', ($event.target as HTMLInputElement).value)" />
          </label>
          <button v-if="selectedShapeItem.shapeKind === 'rect' || selectedShapeItem.shapeKind === 'circle'" class="ghost-button" type="button" @click="patchShapeSelected('fillColor', 'transparent')">设为透明填充</button>
          <label>
            粗细
            <div class="inspector-inline">
              <input :value="selectedShapeItem.strokeWidth" type="range" min="1" max="24" @input="patchShapeSelected('strokeWidth', Number(($event.target as HTMLInputElement).value))" />
              <input :value="selectedShapeItem.strokeWidth" type="number" min="1" max="24" @input="patchShapeSelected('strokeWidth', Number(($event.target as HTMLInputElement).value))" />
            </div>
          </label>
          <label>
            线型
            <select :value="selectedShapeItem.strokeStyle" @change="patchShapeSelected('strokeStyle', ($event.target as HTMLSelectElement).value as StrokeStyle)">
              <option value="solid">实线</option>
              <option value="dashed">虚线</option>
            </select>
          </label>
          <label v-if="selectedShapeItem.shapeKind === 'line' || selectedShapeItem.shapeKind === 'arrow'" class="checkbox">
            <input :checked="selectedShapeItem.arrowStart" type="checkbox" @change="patchShapeSelected('arrowStart', ($event.target as HTMLInputElement).checked)" />
            <span>起点箭头</span>
          </label>
          <label v-if="selectedShapeItem.shapeKind === 'line' || selectedShapeItem.shapeKind === 'arrow'" class="checkbox">
            <input :checked="selectedShapeItem.arrowEnd" type="checkbox" @change="patchShapeSelected('arrowEnd', ($event.target as HTMLInputElement).checked)" />
            <span>终点箭头</span>
          </label>
        </div>

        <button class="ghost-button" type="button" @click="bringToFront(selectedItem.id)">置顶</button>
        <button class="danger-button" type="button" @click="removeSelected">删除元素</button>
      </template>

      <div class="inspector-block" :class="{ 'inspector-block--secondary': hasSelection }">
        <p class="eyebrow">Canvas</p>
        <label>
          画布宽度
          <input v-model="canvasWidth" type="number" min="320" max="6000" />
        </label>
        <label>
          画布高度
          <input v-model="canvasHeight" type="number" min="320" max="6000" />
        </label>
        <label>
          背景色
          <input v-model="backgroundColor" type="color" class="color-input" />
        </label>
      </div>

      <div class="inspector-block" :class="{ 'inspector-block--secondary': hasSelection }">
        <p class="eyebrow">Export</p>
        <label>
          格式
          <select v-model="exportFormat">
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
        </label>
        <label>
          导出背景
          <select v-model="exportBackground">
            <option value="white">白色</option>
            <option value="transparent">透明</option>
            <option value="black">黑色</option>
          </select>
        </label>
        <label>
          导出宽度
          <input v-model="exportWidth" type="number" min="320" max="6000" />
        </label>
        <label>
          导出高度
          <input v-model="exportHeight" type="number" min="320" max="6000" />
        </label>
        <label>
          分辨率倍率
          <div class="inspector-inline">
            <input v-model="exportScale" type="range" min="1" max="4" />
            <input v-model="exportScale" type="number" min="1" max="4" />
          </div>
        </label>
        <label>
          清晰度
          <div class="inspector-inline">
            <input v-model="exportQuality" type="range" min="10" max="100" />
            <input v-model="exportQuality" type="number" min="10" max="100" />
          </div>
        </label>
        <div class="inspector-actions">
          <button class="ghost-button" type="button" @click="applyIphonePreset">iPhone 13 Pro</button>
          <button class="ghost-button" type="button" @click="useCurrentCanvasSize">当前画布</button>
        </div>
        <button class="primary-button" type="button" @click="exportBoard">导出图片</button>
        <p v-if="exportState" class="helper">{{ exportState }}</p>
      </div>

      <div class="inspector-block" :class="{ 'inspector-block--secondary': hasSelection }">
        <p class="eyebrow">Doodle</p>
        <label>
          涂鸦颜色
          <input v-model="doodleColor" type="color" class="color-input" />
        </label>
        <label>
          画笔粗细
          <div class="inspector-inline">
            <input v-model="doodleWidth" type="range" min="1" max="24" />
            <input v-model="doodleWidth" type="number" min="1" max="24" />
          </div>
        </label>
        <button class="ghost-button" type="button" @click="clearLastDoodle">撤销一笔</button>
      </div>
    </aside>
  </section>
</template>
