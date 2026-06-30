import { ErrorPage } from "@/components/errors/ErrorPage";

export default function StudioNotFound() {
  return <ErrorPage kind="studio_not_found" surface="shop" compact />;
}
