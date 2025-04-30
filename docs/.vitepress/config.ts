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
    nav: [
      { text: "笔记", link: "/notes", activeMatch: "/notes/.*" },
      { text: "关于", link: "/about" },
    ],

    sidebar: {
      "/notes/": [
        {
          text: "Go语言随笔",
          items: [
            { text: "01空接口", link: "/notes/Go语言随笔/01空接口" },
            {
              text: "02切片的值传递",
              link: "/notes/Go语言随笔/02切片的值传递",
            },
            { text: "03defer", link: "/notes/Go语言随笔/03defer" },
            {
              text: "04互斥锁与读写锁",
              link: "/notes/Go语言随笔/04互斥锁与读写锁",
            },
            {
              text: "05通道(channel)",
              link: "/notes/Go语言随笔/05通道(channel)",
            },
            {
              text: "06context",
              link: "/notes/Go语言随笔/06context",
            },
          ],
        },
      ],
    },

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
