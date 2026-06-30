import { notFound } from "next/navigation";

import { CustomizeDesignLabClient } from "@/components/design-lab/CustomizeDesignLabClient";
import { fetchCustomizerTemplate } from "@/lib/customizer";

type Props = { params: Promise<{ type: string }> };

export const revalidate = 120;

export default async function CustomizeTypePage({ params }: Props) {
  const { type } = await params;
  const template = await fetchCustomizerTemplate(type).catch(() => null);
  if (!template) notFound();

  return <CustomizeDesignLabClient template={template} />;
}
