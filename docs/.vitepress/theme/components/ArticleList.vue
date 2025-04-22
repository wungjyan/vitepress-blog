<script setup lang="ts">
import { data as posts } from "../posts.data";
import { fromNow } from "../utils";

console.log("文章数据===", posts);
</script>

<template>
  <div class="flex flex-col items-center pt-20 px-5">
    <a
      class="block w-full md:w-2xl box-border border-1 border-divider hover:shadow-2 rounded-xl mb-10 px-4 py-5"
      v-for="post in posts"
      :key="post.url"
      :href="post.url"
    >
      <h2 class="!text-xl !font-medium">{{ post.title }}</h2>
      <div class="!py-3 !text-sm" v-html="post.excerpt"></div>
      <div class="text-[13px] text-text-2">
        <span>{{ fromNow(post.date.string) }}</span>
        <span class="ml-5">{{ post.category }}</span>
      </div>
    </a>
  </div>
</template>
