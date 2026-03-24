<script setup lang="ts">
import { useAuthStore } from "./stores/auth";

const auth = useAuthStore();
</script>

<template>
  <div class="shell">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <header class="topbar">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">D</span>
        <span class="brand-copy">
          <strong>Dora Blog</strong>
          <small>Video essays, notes, and longform posts</small>
        </span>
      </RouterLink>
      <nav class="nav">
        <RouterLink to="/">博客</RouterLink>
        <RouterLink to="/flow">图片流</RouterLink>
        <RouterLink to="/moodboard">Moodboard</RouterLink>
        <RouterLink to="/admin">管理台</RouterLink>
        <span class="status-pill">Markdown + Video</span>
        <RouterLink v-if="!auth.isAuthenticated" to="/login">登录</RouterLink>
        <button v-else class="ghost-button" @click="auth.signOut">退出</button>
      </nav>
    </header>
    <main class="page">
      <RouterView />
    </main>
  </div>
</template>
