<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vitepress";
import { data as posts } from "../posts.data";
import { fromNow, canConvertToNumber } from "../utils";
import { categoryMap } from "../constant";

const router = useRouter();
const pageQuery = new URLSearchParams(router.route.query);
const pageSize = 5;

const curPage = ref<number>(1);
curPage.value = _getPage();
function _getPage() {
  const pageVal = pageQuery.get("page");
  if (canConvertToNumber(pageVal) && Number(pageVal) > 0) {
    return Number(pageVal);
  }
  return 1;
}

router.onBeforeRouteChange = () => {
  curPage.value = _getPage();
  curCategory.value = null;
};

const curCategory = ref<string | null>(null);
curCategory.value = pageQuery.get("category");

const filteredPosts = computed(() => {
  if (curCategory.value) {
    return posts.filter((post) =>
      post.categories?.includes(curCategory.value as string)
    );
  }
  return posts;
});

// 分类导航
function goCategory(category: string) {
  curCategory.value = category;
  curPage.value = 1;
  const url = new URL(window.location.href); // 解析当前URL
  url.searchParams.set("page", curPage.value.toString()); // 设置参数（自动编码）
  url.searchParams.set("category", curCategory.value);
  window.history.replaceState(null, "", url); // 更新URL（不刷新页面）
  _scrollToTop();
}

function goHome() {
  curPage.value = 1;
  curCategory.value = null;
  router.go(`${window.location.origin}${router.route.path}`);
}

const isCategoryExist = computed(() => {
  return categoryMap.some((item) => item.text === curCategory.value);
});

const pageTotal = computed(() =>
  Math.ceil(filteredPosts.value.length / pageSize)
);

const articleList = computed(() => {
  const start = (curPage.value - 1) * pageSize;
  const end = start + pageSize;
  return filteredPosts.value.slice(start, end);
});

// 点击分页
const changePage = (num: number) => {
  if (
    (num < 0 && curPage.value === 1) ||
    (num > 0 && curPage.value === pageTotal.value)
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
  <div class="flex flex-col items-center pt-12 px-5">
    <div class="w-full md:w-2xl mb-12 pb-1 space-x-6 border-b-1 border-gutter">
      <ClientOnly>
        <a
          key="all"
          @click="goHome"
          class="text-text-1 cursor-pointer"
          :class="{ '!text-indigo-500': !isCategoryExist }"
        >
          最新
        </a>
        <a
          v-for="category in categoryMap"
          :key="category.text"
          @click="goCategory(category.text)"
          class="text-text-1 cursor-pointer"
          :class="{ '!text-indigo-500': curCategory === category.text }"
        >
          {{ category.name }}
        </a>
      </ClientOnly>
    </div>
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
      <a
        class="absolute top-0 right-0 bottom-0 left-0"
        :href="post.url"
        :aria-label="post.title"
      ></a>
    </article>
    <div v-if="pageTotal > 1" class="flex items-center font-medium">
      <ClientOnly>
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
      </ClientOnly>
    </div>
  </div>
</template>
