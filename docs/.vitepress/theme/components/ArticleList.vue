<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vitepress";
import { data as posts } from "../posts.data";
import { fromNow, canConvertToNumber } from "../utils";

const router = useRouter();

const curPage = ref<number>(1);
const pageVal = new URLSearchParams(router.route.query).get("page");
if (canConvertToNumber(pageVal) && Number(pageVal) > 0) {
  curPage.value = Number(pageVal);
}

const pageSize = 5;
const pageTotal = Math.ceil(posts.length / pageSize);

const articleList = computed(() => {
  const start = (curPage.value - 1) * pageSize;
  const end = start + pageSize;
  return posts.slice(start, end);
});

const changePage = (num: number) => {
  if (
    (num < 0 && curPage.value === 1) ||
    (num > 0 && curPage.value === pageTotal)
  ) {
    return;
  }
  curPage.value = curPage.value + num;
  const url = new URL(window.location.href); // 解析当前URL
  url.searchParams.set("page", curPage.value.toString()); // 设置参数（自动编码）
  window.history.replaceState(null, "", url); // 更新URL（不刷新页面）
  _scrollToTop();
};

function _scrollToTop() {
  if (typeof window !== "undefined") {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
}
</script>

<template>
  <div class="flex flex-col items-center pt-20 px-5">
    <article
      class="relative block w-full md:w-2xl box-border border-1 border-divider hover:shadow-2 rounded-xl mb-10 p-5"
      v-for="post in articleList"
      :key="post.url"
    >
      <h2 class="!text-xl !font-medium">{{ post.title }}</h2>
      <div class="!py-2 !text-sm" v-html="post.excerpt"></div>
      <div class="text-[13px] text-text-2">
        <span>{{ fromNow(post.date.date) }}</span>
      </div>
      <a class="absolute top-0 right-0 bottom-0 left-0" :href="post.url"></a>
    </article>
    <nav class="flex items-center font-medium">
      <button
        @click="changePage(-1)"
        :class="[curPage === 1 ? '!text-text-3' : '', 'flex items-center']"
      >
        <svg
          class="mr-1"
          xmlns="http://www.w3.org/2000/svg"
          width="18px"
          height="18px"
          viewBox="0 0 32 32"
        >
          <path
            fill="currentColor"
            d="m14 26l1.41-1.41L7.83 17H28v-2H7.83l7.58-7.59L14 6L4 16z"
          />
        </svg>
        Prev
      </button>
      <span class="mx-4">{{ curPage }} / {{ pageTotal }}</span>
      <button
        @click="changePage(1)"
        :class="[
          curPage === pageTotal ? '!text-text-3' : '',
          'flex items-center',
        ]"
      >
        Next
        <svg
          class="ml-1"
          xmlns="http://www.w3.org/2000/svg"
          width="18px"
          height="18px"
          viewBox="0 0 32 32"
        >
          <path
            fill="currentColor"
            d="m18 6l-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10z"
          />
        </svg>
      </button>
    </nav>
  </div>
</template>
