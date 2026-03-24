<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";

import { fetchImageLibrary, resolveAssetUrl, uploadImage } from "../api/client";
import { useAuthStore } from "../stores/auth";
import type { ImageLibraryItem } from "../types";

interface BoardItemBase {
  id: string;
  type: "image" | "text";
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
}

interface Doodle {
  id: string;
  path: string;
  color: string;
  width: number;
}

type BoardItem = ImageBoardItem | TextBoardItem;

const auth = useAuthStore();

const library = ref<ImageLibraryItem[]>([]);
const boardItems = ref<BoardItem[]>([]);
const doodles = ref<Doodle[]>([]);
const loading = ref(true);
const error = ref("");
const uploadState = ref("");
const selectedId = ref<string | null>(null);
const search = ref("");
const boardTitle = ref("My Moodboard");
const boardNote = ref("把喜欢的封面、灵感图和新上传的图片拖进来，拼成一张更完整的视觉情绪板。");
const drawMode = ref(false);
const doodleColor = ref("#ffd6c8");
const doodleWidth = ref(6);
const activeDoodlePath = ref("");
const boardCanvasRef = ref<HTMLElement | null>(null);

const STORAGE_KEY = "dora-moodboard-state";

let dragState:
  | {
      id: string;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    }
  | null = null;

let doodlePoints: string[] = [];

function migrateBoardItem(rawItem: Partial<BoardItem>): BoardItem | null {
  if (!rawItem.id) {
    return null;
  }

  if (rawItem.type === "text") {
    return {
      id: rawItem.id,
      type: "text",
      title: rawItem.title || "文字卡片",
      text: (rawItem as Partial<TextBoardItem>).text || "双击右侧输入更多说明",
      textColor: (rawItem as Partial<TextBoardItem>).textColor || "#f8fbff",
      backgroundColor: (rawItem as Partial<TextBoardItem>).backgroundColor || "transparent",
      fontSize: Number((rawItem as Partial<TextBoardItem>).fontSize) || 22,
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
    libraryId: (rawItem as Partial<ImageBoardItem>).libraryId || rawItem.id,
    url: (rawItem as Partial<ImageBoardItem>).url || "",
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
    const parsed = JSON.parse(raw) as {
      boardItems?: Partial<BoardItem>[];
      doodles?: Doodle[];
      boardTitle?: string;
      boardNote?: string;
    };

    boardItems.value = (parsed.boardItems ?? [])
      .map((item) => migrateBoardItem(item))
      .filter((item): item is BoardItem => Boolean(item));
    doodles.value = parsed.doodles ?? [];
    boardTitle.value = parsed.boardTitle ?? boardTitle.value;
    boardNote.value = parsed.boardNote ?? boardNote.value;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

watch(
  [boardItems, doodles, boardTitle, boardNote],
  () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        boardItems: boardItems.value,
        doodles: doodles.value,
        boardTitle: boardTitle.value,
        boardNote: boardNote.value,
      }),
    );
  },
  { deep: true },
);

const filteredLibrary = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) {
    return library.value;
  }

  return library.value.filter((item) =>
    [item.title, item.source, item.slug ?? ""].some((value) => value.toLowerCase().includes(keyword)),
  );
});

const selectedItem = computed(() => boardItems.value.find((item) => item.id === selectedId.value) ?? null);
const selectedImageItem = computed(() => (selectedItem.value?.type === "image" ? selectedItem.value : null));

function nextZIndex() {
  return boardItems.value.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1;
}

function addImageToBoard(item: ImageLibraryItem) {
  const boardItem: ImageBoardItem = {
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

function replaceSelectedImage(item: ImageLibraryItem) {
  if (!selectedImageItem.value) {
    return;
  }

  boardItems.value = boardItems.value.map((boardItem) =>
    boardItem.id === selectedImageItem.value?.id
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

function patchSelected<K extends keyof BoardItem>(key: K, value: BoardItem[K]) {
  if (!selectedId.value) {
    return;
  }

  boardItems.value = boardItems.value.map((item) =>
    item.id === selectedId.value
      ? {
          ...item,
          [key]: value,
        }
      : item,
  );
}

function patchTextSelected<K extends keyof TextBoardItem>(key: K, value: TextBoardItem[K]) {
  if (!selectedId.value) {
    return;
  }

  boardItems.value = boardItems.value.map((item) =>
    item.id === selectedId.value && item.type === "text"
      ? {
          ...item,
          [key]: value,
        }
      : item,
  );
}

function startDrag(id: string, event: PointerEvent) {
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

function boardPoint(event: PointerEvent) {
  const rect = boardCanvasRef.value?.getBoundingClientRect();
  if (!rect) {
    return { x: 0, y: 0 };
  }

  return {
    x: Math.max(0, event.clientX - rect.left),
    y: Math.max(0, event.clientY - rect.top),
  };
}

function startDoodle(event: PointerEvent) {
  if (!drawMode.value) {
    return;
  }

  event.preventDefault();
  const point = boardPoint(event);
  doodlePoints = [`M ${point.x} ${point.y}`];
  activeDoodlePath.value = doodlePoints.join(" ");
  selectedId.value = null;
}

function onPointerMove(event: PointerEvent) {
  if (dragState) {
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;

    boardItems.value = boardItems.value.map((item) =>
      item.id === dragState?.id
        ? {
            ...item,
            x: Math.max(0, dragState.originX + dx),
            y: Math.max(0, dragState.originY + dy),
          }
        : item,
    );
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
      id: `upload-${Date.now()}`,
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
    const uploadedItem: ImageLibraryItem = {
      id: `upload-${Date.now()}`,
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
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", stopPointer);
});
</script>

<template>
  <section class="moodboard-shell">
    <aside class="panel moodboard-sidebar">
      <div class="moodboard-sidebar__head">
        <div>
          <p class="eyebrow">Image Library</p>
          <h1>拼贴板</h1>
          <p class="helper">全站图片库、上传图片、替换当前图片，都在这里处理。</p>
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
        <div
          v-for="item in filteredLibrary"
          :key="item.id"
          class="library-card"
        >
          <button
            class="library-card__surface"
            type="button"
            @click="addImageToBoard(item)"
          >
            <div
              class="library-card__thumb"
              :style="{ backgroundImage: `linear-gradient(180deg, rgba(10, 18, 32, 0.06), rgba(10, 18, 32, 0.52)), url('${resolveAssetUrl(item.url) ?? item.url}')` }"
            ></div>
            <div class="library-card__body">
              <span class="tag">{{ item.source }}</span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.slug || "独立图片" }}</small>
            </div>
          </button>

          <div class="library-card__actions">
            <button class="ghost-button" type="button" @click="addImageToBoard(item)">添加到画板</button>
            <button
              v-if="selectedImageItem"
              class="ghost-button"
              type="button"
              @click="replaceSelectedImage(item)"
            >
              替换当前图
            </button>
          </div>
        </div>
      </div>
    </aside>

    <section class="moodboard-stage">
      <div class="panel moodboard-topbar">
        <div>
          <p class="eyebrow">Board</p>
          <input v-model="boardTitle" class="board-title-input" type="text" placeholder="Moodboard 标题" />
          <textarea v-model="boardNote" rows="2" placeholder="写一句关于这张 moodboard 的说明"></textarea>
        </div>
        <div class="moodboard-actions">
          <button class="ghost-button" type="button" @click="addTextCard">添加文字</button>
          <button class="ghost-button" type="button" :class="{ 'is-active': drawMode }" @click="drawMode = !drawMode">
            {{ drawMode ? "退出涂鸦" : "涂鸦模式" }}
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

        <div ref="boardCanvasRef" class="board-canvas">
          <svg
            class="doodle-layer"
            :class="{ 'is-enabled': drawMode }"
            @pointerdown="startDoodle"
          >
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
            :class="{ 'is-selected': selectedId === item.id, 'board-item--text': item.type === 'text' }"
            :style="boardItemStyle(item)"
            type="button"
            @pointerdown="startDrag(item.id, $event)"
            @click="selectedId = item.id"
          >
            <template v-if="item.type === 'image'">
              <span class="board-item__label">{{ item.title }}</span>
            </template>
            <template v-else>
              <div class="board-text-card" :style="{ fontSize: `${item.fontSize}px` }">
                <div class="board-text-card__title">{{ item.title }}</div>
                <div class="board-text-card__content">{{ item.text }}</div>
              </div>
            </template>
          </button>

          <div v-if="boardItems.length === 0 && doodles.length === 0" class="board-empty">
            <p class="eyebrow">Start Here</p>
            <h3>画布已经加大了，现在可以更自由地拼贴</h3>
            <p>支持图片替换保留参数、文字卡片、自由涂鸦，以及更细的数值输入控制。</p>
          </div>
        </div>
      </div>
    </section>

    <aside class="panel moodboard-inspector">
      <div>
        <p class="eyebrow">Inspector</p>
        <h2>{{ selectedItem?.title || "未选择元素" }}</h2>
        <p class="helper">选中图片或文字后，这里可以直接输入参数，而不是只能拉滑块。</p>
      </div>

      <div class="inspector-block">
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

      <template v-if="selectedItem">
        <div class="inspector-block">
          <p class="eyebrow">Position</p>
          <label>
            X
            <input
              :value="selectedItem.x"
              type="number"
              min="0"
              @input="patchSelected('x', Number(($event.target as HTMLInputElement).value))"
            />
          </label>
          <label>
            Y
            <input
              :value="selectedItem.y"
              type="number"
              min="0"
              @input="patchSelected('y', Number(($event.target as HTMLInputElement).value))"
            />
          </label>
        </div>

        <div class="inspector-block">
          <p class="eyebrow">Size</p>
          <label>
            宽度
            <div class="inspector-inline">
              <input
                :value="selectedItem.width"
                type="range"
                min="120"
                max="900"
                @input="patchSelected('width', Number(($event.target as HTMLInputElement).value))"
              />
              <input
                :value="selectedItem.width"
                type="number"
                min="120"
                max="900"
                @input="patchSelected('width', Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </label>

          <label>
            高度
            <div class="inspector-inline">
              <input
                :value="selectedItem.height"
                type="range"
                min="120"
                max="1200"
                @input="patchSelected('height', Number(($event.target as HTMLInputElement).value))"
              />
              <input
                :value="selectedItem.height"
                type="number"
                min="120"
                max="1200"
                @input="patchSelected('height', Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </label>
        </div>

        <div class="inspector-block">
          <p class="eyebrow">Style</p>
          <label>
            旋转
            <div class="inspector-inline">
              <input
                :value="selectedItem.rotation"
                type="range"
                min="-45"
                max="45"
                @input="patchSelected('rotation', Number(($event.target as HTMLInputElement).value))"
              />
              <input
                :value="selectedItem.rotation"
                type="number"
                min="-45"
                max="45"
                @input="patchSelected('rotation', Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </label>

          <label>
            透明度
            <div class="inspector-inline">
              <input
                :value="selectedItem.opacity"
                type="range"
                min="20"
                max="100"
                @input="patchSelected('opacity', Number(($event.target as HTMLInputElement).value))"
              />
              <input
                :value="selectedItem.opacity"
                type="number"
                min="20"
                max="100"
                @input="patchSelected('opacity', Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </label>

          <label>
            圆角
            <div class="inspector-inline">
              <input
                :value="selectedItem.radius"
                type="range"
                min="0"
                max="48"
                @input="patchSelected('radius', Number(($event.target as HTMLInputElement).value))"
              />
              <input
                :value="selectedItem.radius"
                type="number"
                min="0"
                max="48"
                @input="patchSelected('radius', Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </label>
        </div>

        <div v-if="selectedItem.type === 'image'" class="inspector-block">
          <p class="eyebrow">Replace</p>
          <label class="ghost-button upload-button">
            上传替换当前图片
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="onReplaceUploadChange" />
          </label>
        </div>

        <div v-if="selectedItem.type === 'text'" class="inspector-block">
          <p class="eyebrow">Text</p>
          <label>
            标题
            <input
              :value="selectedItem.title"
              type="text"
              @input="patchTextSelected('title', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label>
            正文
            <textarea
              :value="selectedItem.text"
              rows="6"
              @input="patchTextSelected('text', ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
          </label>
          <label>
            字号
            <div class="inspector-inline">
              <input
                :value="selectedItem.fontSize"
                type="range"
                min="14"
                max="56"
                @input="patchTextSelected('fontSize', Number(($event.target as HTMLInputElement).value))"
              />
              <input
                :value="selectedItem.fontSize"
                type="number"
                min="14"
                max="56"
                @input="patchTextSelected('fontSize', Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </label>
          <label>
            文字颜色
            <input
              :value="selectedItem.textColor"
              type="color"
              class="color-input"
              @input="patchTextSelected('textColor', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label>
            背景颜色
            <input
              :value="selectedItem.backgroundColor"
              type="color"
              class="color-input"
              @input="patchTextSelected('backgroundColor', ($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>

        <button class="ghost-button" type="button" @click="bringToFront(selectedItem.id)">置顶</button>
        <button class="danger-button" type="button" @click="removeSelected">删除元素</button>
      </template>

      <template v-else>
        <div class="inspector-empty">
          <p>从左边加图片，或者点“添加文字”，再在这里精确输入参数。</p>
        </div>
      </template>
    </aside>
  </section>
</template>
