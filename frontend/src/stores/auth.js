import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { login } from "../api/client";
const TOKEN_KEY = "blog-admin-token";
const USER_KEY = "blog-admin-user";
export const useAuthStore = defineStore("auth", () => {
    const token = ref(localStorage.getItem(TOKEN_KEY));
    const user = ref(JSON.parse(localStorage.getItem(USER_KEY) || "null"));
    const loading = ref(false);
    const isAuthenticated = computed(() => Boolean(token.value));
    const isAdmin = computed(() => user.value?.role === "admin");
    async function signIn(username, password) {
        loading.value = true;
        try {
            const result = await login(username, password);
            token.value = result.access_token;
            user.value = result.user;
            localStorage.setItem(TOKEN_KEY, result.access_token);
            localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        }
        finally {
            loading.value = false;
        }
    }
    function signOut() {
        token.value = null;
        user.value = null;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }
    return {
        token,
        user,
        loading,
        isAuthenticated,
        isAdmin,
        signIn,
        signOut,
    };
});
