<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import ArticleList from "./ArticleList.vue";
import ArticleMeta from "./ArticleMeta.vue";
const { Layout } = DefaultTheme;
</script>
<template>
  <Layout>
    <!-- 文章顶部模块 -->
    <template #doc-before>
      <ArticleMeta />
    </template>
    <template #home-hero-after>
      <ArticleList />
    </template>
    <template #aside-top>
      <div
        class="py-1 mb-2 text-sm text-center border border-dashed cursor-pointer text-text-1 border-divider hover:border-indigo-500 hover:text-indigo-800"
      >
        <a
          href="javascript:history.go(-1)"
          class="flex items-center justify-center w-full h-full"
          ><svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 32 32"
          >
            <path
              fill="currentColor"
              d="M22 8v2c2.206 0 4 1.794 4 4s-1.794 4-4 4H10v-5l-6 6l6 6v-5h12c3.309 0 6-2.691 6-6s-2.691-6-6-6"
            />
          </svg>
          <span class="ml-2">返回上一页</span>
        </a>
      </div>
    </template>
  </Layout>
</template>
