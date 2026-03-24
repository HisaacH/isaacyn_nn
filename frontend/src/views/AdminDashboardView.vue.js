import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { createPost, deletePost, fetchAdminPost, fetchAdminPosts, updatePost } from "../api/client";
import PostEditor from "../components/PostEditor.vue";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore();
const router = useRouter();
const posts = ref([]);
const error = ref("");
const saving = ref(false);
const selectedPostId = ref(null);
const saveMessage = ref("");
const dirty = ref(false);
const emptyForm = () => ({
    title: "",
    slug: null,
    summary: "",
    cover_image: null,
    markdown_content: "",
    video_url: null,
    video_upload_path: null,
    is_published: true,
});
const form = ref(emptyForm());
async function loadPosts() {
    if (!auth.token) {
        await router.push("/login");
        return;
    }
    posts.value = await fetchAdminPosts(auth.token);
}
async function loadPost(postId) {
    if (!auth.token) {
        return;
    }
    const post = await fetchAdminPost(postId, auth.token);
    selectedPostId.value = post.id;
    form.value = {
        title: post.title,
        slug: post.slug,
        summary: post.summary,
        cover_image: post.cover_image,
        markdown_content: post.markdown_content,
        video_url: post.video_url,
        video_upload_path: post.video_upload_path,
        is_published: post.is_published,
    };
    dirty.value = false;
}
function startCreate() {
    selectedPostId.value = null;
    form.value = emptyForm();
    saveMessage.value = "";
    dirty.value = false;
}
function updateForm(value) {
    form.value = value;
    dirty.value = true;
    saveMessage.value = "";
}
async function save() {
    if (!auth.token) {
        await router.push("/login");
        return;
    }
    error.value = "";
    saveMessage.value = "";
    saving.value = true;
    try {
        if (selectedPostId.value) {
            await updatePost(selectedPostId.value, form.value, auth.token);
        }
        else {
            const created = await createPost(form.value, auth.token);
            selectedPostId.value = created.id;
        }
        await loadPosts();
        if (selectedPostId.value) {
            await loadPost(selectedPostId.value);
        }
        dirty.value = false;
        saveMessage.value = "已保存到服务器";
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : "保存失败";
    }
    finally {
        saving.value = false;
    }
}
async function remove(postId) {
    if (!auth.token) {
        return;
    }
    const confirmed = window.confirm("确定删除这篇文章吗？");
    if (!confirmed) {
        return;
    }
    await deletePost(postId, auth.token);
    if (selectedPostId.value === postId) {
        startCreate();
    }
    await loadPosts();
}
onMounted(async () => {
    try {
        await loadPosts();
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : "加载失败";
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
    ...{ class: "admin-layout" },
});
/** @type {__VLS_StyleScopedClasses['admin-layout']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "panel admin-sidebar" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-sidebar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-head" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-head']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
(__VLS_ctx.auth.user?.username || "admin");
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.startCreate) },
    ...{ class: "ghost-button" },
});
/** @type {__VLS_StyleScopedClasses['ghost-button']} */ ;
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "helper error" },
    });
    /** @type {__VLS_StyleScopedClasses['helper']} */ ;
    /** @type {__VLS_StyleScopedClasses['error']} */ ;
    (__VLS_ctx.error);
}
for (const [post] of __VLS_vFor((__VLS_ctx.posts))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.loadPost(post.id);
                // @ts-ignore
                [auth, startCreate, error, error, posts, loadPost,];
            } },
        key: (post.id),
        ...{ class: "post-list-item" },
        ...{ class: ({ active: __VLS_ctx.selectedPostId === post.id }) },
    });
    /** @type {__VLS_StyleScopedClasses['post-list-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (post.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (post.is_published ? "已发布" : "草稿");
    // @ts-ignore
    [selectedPostId,];
}
if (__VLS_ctx.posts.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "helper" },
    });
    /** @type {__VLS_StyleScopedClasses['helper']} */ ;
}
if (__VLS_ctx.selectedPostId) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.selectedPostId))
                    return;
                __VLS_ctx.remove(__VLS_ctx.selectedPostId);
                // @ts-ignore
                [posts, selectedPostId, selectedPostId, remove,];
            } },
        ...{ class: "danger-button" },
    });
    /** @type {__VLS_StyleScopedClasses['danger-button']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "admin-editor" },
});
/** @type {__VLS_StyleScopedClasses['admin-editor']} */ ;
if (__VLS_ctx.auth.token) {
    const __VLS_0 = PostEditor;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        ...{ 'onUpdate:modelValue': {} },
        ...{ 'onSubmit': {} },
        modelValue: (__VLS_ctx.form),
        token: (__VLS_ctx.auth.token),
        saving: (__VLS_ctx.saving),
        statusMessage: (__VLS_ctx.saveMessage || __VLS_ctx.error),
        dirty: (__VLS_ctx.dirty),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onUpdate:modelValue': {} },
        ...{ 'onSubmit': {} },
        modelValue: (__VLS_ctx.form),
        token: (__VLS_ctx.auth.token),
        saving: (__VLS_ctx.saving),
        statusMessage: (__VLS_ctx.saveMessage || __VLS_ctx.error),
        dirty: (__VLS_ctx.dirty),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_5;
    const __VLS_6 = ({ 'update:modelValue': {} },
        { 'onUpdate:modelValue': (__VLS_ctx.updateForm) });
    const __VLS_7 = ({ submit: {} },
        { onSubmit: (__VLS_ctx.save) });
    var __VLS_3;
    var __VLS_4;
}
// @ts-ignore
[auth, auth, error, form, saving, saveMessage, dirty, updateForm, save,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
