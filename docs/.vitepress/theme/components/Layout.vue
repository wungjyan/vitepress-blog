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
  </Layout>
</template>
