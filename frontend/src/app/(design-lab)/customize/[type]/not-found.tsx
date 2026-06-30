import { ErrorPage } from "@/components/errors/ErrorPage";

export default function CustomizerTemplateNotFound() {
  return <ErrorPage kind="customizer_unavailable" surface="lab" />;
}
