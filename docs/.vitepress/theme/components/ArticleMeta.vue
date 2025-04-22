<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";
import { formatDate } from "../utils";

const { frontmatter } = useData();
console.log("frontmatter===", frontmatter.value);
const title = computed(() => frontmatter.value.title);
const date = computed(() => formatDate(frontmatter.value.date));
const category = computed(() => frontmatter.value.category);
</script>

<template>
  <div class="mb-10">
    <h1 class="!text-3xl !font-semibold">{{ title }}</h1>
    <div class="text-sm pt-3 text-text-2">
      <span>{{ date }}</span>
      <span class="ml-5">{{ category || "其他" }}</span>
    </div>
  </div>
</template>
