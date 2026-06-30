import { redirect } from "next/navigation";

import { fetchStudioProfile } from "@/lib/studio";
import { studioPath } from "@/lib/studio";

type Props = { params: Promise<{ id: string }> };

/** مسیر قدیمی — هدایت به استودیوی عمومی */
export default async function CreatorRedirectPage({ params }: Props) {
  const { id } = await params;
  try {
    const data = await fetchStudioProfile(id);
    redirect(studioPath(data.studio));
  } catch {
    redirect("/studios");
  }
}
