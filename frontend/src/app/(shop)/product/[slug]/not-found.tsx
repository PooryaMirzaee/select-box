import { ErrorPage } from "@/components/errors/ErrorPage";

export default function ProductNotFound() {
  return <ErrorPage kind="product_not_found" surface="shop" compact />;
}
