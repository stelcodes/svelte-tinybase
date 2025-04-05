export interface Post {
  title: string;
  description: string;
  slug: string;
  lastUpdate: string;
  order: number;
}

export function getDocsFiles() {
  let posts: Post[] = [];

  const paths = import.meta.glob("$lib/posts/docs/*.svx", { eager: true });

  for (const path in paths) {
    const file = paths[path];
    const slug = path.split("/").at(-1)?.replace(".svx", "");

    if (file && typeof file === "object" && "metadata" in file && slug) {
      const metadata = file.metadata as Omit<Post, "slug">;
      const post = { ...metadata, slug } satisfies Post;
      posts.push(post);
    }
  }

  posts = posts.sort((first, second) => second.order - first.order);

  return posts;
}

export function getExamplesFiles() {
  let posts: Post[] = [];

  const paths = import.meta.glob("$lib/posts/examples/*.svx", { eager: true });

  for (const path in paths) {
    const file = paths[path];
    const slug = path.split("/").at(-1)?.replace(".svx", "");

    if (file && typeof file === "object" && "metadata" in file && slug) {
      const metadata = file.metadata as Omit<Post, "slug">;
      const post = { ...metadata, slug } satisfies Post;
      posts.push(post);
    }
  }

  posts = posts.sort((first, second) => second.order - first.order);

  return posts;
}
