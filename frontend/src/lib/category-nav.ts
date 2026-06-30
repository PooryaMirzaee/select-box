/** نوع درخت دسته برای مگامenu هدر — جدا از api.ts تا باندل کلاینت سبک بماند */

export type CategoryNavNode = {
  id: number;
  slug: string;
  name_fa: string;
  path: string;
  image_url?: string | null;
  child_count: number;
  children: CategoryNavNode[];
};
