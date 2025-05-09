import { defineConfig } from "vitepress";
import tailwindcss from "@tailwindcss/vite";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "瓶子笔记",
  description: "一个爱折腾的前端程序员的网络自留地",
  lastUpdated: false,
  cleanUrls: true,
  ignoreDeadLinks: true,
  vite: {
    plugins: [tailwindcss()],
  },
  sitemap: {
    hostname: "https://wjian.xyz",
  },
  head: [
    [
      "meta",
      {
        name: "author",
        content: "wungjyan",
      },
    ],
  ],
  themeConfig: {
    nav: [{ text: "关于", link: "/about" }],

    sidebar: {},

    // socialLinks: [
    //   { icon: "github", link: "https://github.com/vuejs/vitepress" },
    // ],
    search: {
      provider: "local",
    },
    footer: {
      message: `Powered By <a href="https://vitepress.dev/">VitePress</a>`,
      copyright: `Copyright © 2022-present <a href="https://wjian.xyz">wjian.xyz</a>`,
    },
  },
});
