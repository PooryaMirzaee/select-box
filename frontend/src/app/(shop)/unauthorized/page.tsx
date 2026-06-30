import { ErrorPage } from "@/components/errors/ErrorPage";

export default function UnauthorizedPage() {
  return <ErrorPage kind="unauthorized" surface="shop" />;
}
