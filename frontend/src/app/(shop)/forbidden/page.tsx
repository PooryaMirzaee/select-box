import { ErrorPage } from "@/components/errors/ErrorPage";

export default function ForbiddenPage() {
  return <ErrorPage kind="forbidden" surface="shop" />;
}
