import Link from "next/link";
import { User } from "@/components/icons";

import { studioPath } from "@/lib/studio";

type Props = {
  creator: { id: number; display_name: string; studio_slug?: string };
};

export function ProductCreator({ creator }: Props) {
  const href = studioPath({
    id: creator.id,
    studio_slug: creator.studio_slug ?? String(creator.id),
  });
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-theme px-4 py-3 text-sm transition hover:border-[var(--accent)]/50 hover:bg-[var(--bg-elevated)]"
    >
      <User className="h-4 w-4 text-[var(--accent)]" />
      <span>
        <span className="text-muted">خالق: </span>
        <span className="font-medium">{creator.display_name}</span>
      </span>
    </Link>
  );
}
