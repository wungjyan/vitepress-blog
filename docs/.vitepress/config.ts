import { defineConfig } from "vitepress";
import tailwindcss from "@tailwindcss/vite";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "瓶子笔记",
  description: "前端程序员的网络自留地，不仅记录代码",
  lastUpdated: false,
  cleanUrls: true,
  ignoreDeadLinks: true,
  vite: {
    plugins: [tailwindcss()],
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "首页", link: "/" },
      { text: "关于", link: "/about" },
    ],

    sidebar: {},

    // socialLinks: [
    //   { icon: "github", link: "https://github.com/vuejs/vitepress" },
    // ],
    search: {
      provider: "local",
    },
  },
});
