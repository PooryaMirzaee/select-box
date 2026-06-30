import { ErrorPage } from "@/components/errors/ErrorPage";

export default function MaintenancePage() {
  return <ErrorPage kind="maintenance" surface="shop" />;
}
