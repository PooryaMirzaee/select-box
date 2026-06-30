import { ErrorPage } from "@/components/errors/ErrorPage";

export default function NotFound() {
  return <ErrorPage kind="not_found" surface="standalone" standalone />;
}
