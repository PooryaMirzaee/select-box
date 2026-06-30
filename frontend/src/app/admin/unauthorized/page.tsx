import { ErrorPage } from "@/components/errors/ErrorPage";

export default function AdminUnauthorizedPage() {
  return <ErrorPage kind="unauthorized" surface="admin" compact />;
}
