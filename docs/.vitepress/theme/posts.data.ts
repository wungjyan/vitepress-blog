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
  tags?: string[];
  excerpt?: string;
}

declare const data: Post[];

export { data };

export default createContentLoader("posts/*.md", {
  excerpt: "<!-- more -->",
  transform(raw): Post[] {
    //     .filter((frontmatter)=>!frontmatter.hide)
    return raw
      .map(({ url, frontmatter, excerpt }) => ({
        title: frontmatter.title,
        url,
        excerpt,
        date: _formatDate(frontmatter.date),
        description: frontmatter.description || frontmatter.title,
        tags: frontmatter.tags || [],
        category: frontmatter.category || "",
      }))
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
