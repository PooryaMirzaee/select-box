import { ErrorPage } from "@/components/errors/ErrorPage";

export default function AdminForbiddenPage() {
  return <ErrorPage kind="forbidden" surface="admin" compact />;
}
