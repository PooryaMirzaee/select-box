import type { Metadata } from "next";

import { CartProvider } from "@/components/shop/CartProvider";

export const metadata: Metadata = {
  title: "آزمایشگاه طراحی",
  robots: { index: false, follow: false },
};

/** Design Lab — تم فروشگاه، بدون Header/Footer سنگین */
export default function DesignLabRootLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
