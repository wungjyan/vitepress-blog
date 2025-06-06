import { createContentLoader } from "vitepress";
import { formatDate } from "./utils";

interface Post {
  title: string;
  url: string;
  date: {
    date: Date;
    time: number;
    string: string;
  };
  description?: string;
  categories?: string[];
  tags?: string[];
  excerpt?: string;
  draft?: boolean;
}

declare const data: Post[];

export { data };

export default createContentLoader("posts/*.md", {
  excerpt: "<!-- more -->",
  transform(raw): Post[] {
    return raw
      .map(({ url, frontmatter, excerpt }) => ({
        title: frontmatter.title,
        url,
        excerpt,
        draft: frontmatter.draft,
        date: _formatDate(frontmatter.date),
        description: frontmatter.description || frontmatter.title,
        tags: frontmatter.tags || [],
        categories: frontmatter.categories || [],
      }))
      .filter((frontmatter) => !frontmatter.draft)
      .sort((a, b) => b.date.time - a.date.time);
  },
});

function _formatDate(raw: string): Post["date"] {
  const date = new Date(raw);
  return {
    date,
    time: +date,
    string: formatDate(date),
  };
}
