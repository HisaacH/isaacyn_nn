<script setup lang="ts">
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
  } catch (err) {
    error.value = err instanceof Error ? err.message : "登录失败";
  }
}
</script>

<template>
  <section class="auth-layout">
    <form class="panel auth-card" @submit.prevent="submit">
      <p class="eyebrow">管理员登录</p>
      <h1>进入博客管理台</h1>
      <label>
        用户名
        <input v-model="username" type="text" autocomplete="username" />
      </label>
      <label>
        密码
        <input v-model="password" type="password" autocomplete="current-password" />
      </label>
      <button class="primary-button" type="submit" :disabled="auth.loading">
        {{ auth.loading ? "登录中..." : "登录" }}
      </button>
      <p v-if="error" class="helper error">{{ error }}</p>
    </form>
  </section>
</template>
