import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const username = ref("admin");
const password = ref("admin123456");
const error = ref("");
async function submit() {
    error.value = "";
    try {
        await auth.signIn(username.value, password.value);
        const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/admin";
        await router.push(redirect);
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : "登录失败";
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "auth-layout" },
});
/** @type {__VLS_StyleScopedClasses['auth-layout']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
    ...{ onSubmit: (__VLS_ctx.submit) },
    ...{ class: "panel auth-card" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    value: (__VLS_ctx.username),
    type: "text",
    autocomplete: "username",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "password",
    autocomplete: "current-password",
});
(__VLS_ctx.password);
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ class: "primary-button" },
    type: "submit",
    disabled: (__VLS_ctx.auth.loading),
});
/** @type {__VLS_StyleScopedClasses['primary-button']} */ ;
(__VLS_ctx.auth.loading ? "登录中..." : "登录");
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "helper error" },
    });
    /** @type {__VLS_StyleScopedClasses['helper']} */ ;
    /** @type {__VLS_StyleScopedClasses['error']} */ ;
    (__VLS_ctx.error);
}
// @ts-ignore
[submit, username, password, auth, auth, error, error,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
