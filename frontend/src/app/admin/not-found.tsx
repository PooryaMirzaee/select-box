import { ErrorPage } from "@/components/errors/ErrorPage";

export default function AdminNotFound() {
  return <ErrorPage kind="not_found" surface="admin" compact />;
}
