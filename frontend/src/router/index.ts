import { createRouter, createWebHistory } from "vue-router";

import HomeView from "../views/HomeView.vue";
import LoginView from "../views/LoginView.vue";
import PostView from "../views/PostView.vue";
import AdminDashboardView from "../views/AdminDashboardView.vue";
import ImageFlowView from "../views/ImageFlowView.vue";
import MoodboardView from "../views/MoodboardView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/flow", name: "flow", component: ImageFlowView },
    { path: "/moodboard", name: "moodboard", component: MoodboardView },
    { path: "/posts/:slug", name: "post", component: PostView, props: true },
    { path: "/login", name: "login", component: LoginView },
    {
      path: "/admin",
      name: "admin",
      component: AdminDashboardView,
      meta: { requiresAdmin: true },
    },
  ],
});

router.beforeEach((to) => {
  if (!to.meta.requiresAdmin) {
    return true;
  }

  const token = localStorage.getItem("blog-admin-token");
  const rawUser = localStorage.getItem("blog-admin-user");
  const user = rawUser ? JSON.parse(rawUser) : null;

  if (token && user?.role === "admin") {
    return true;
  }

  return { name: "login", query: { redirect: to.fullPath } };
});

export default router;
