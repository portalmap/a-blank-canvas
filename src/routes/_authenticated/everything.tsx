import { createFileRoute } from "@tanstack/react-router";
import EverythingView from "@/page-views/EverythingView";

function RouteComponent() {
  return <EverythingView />;
}

export const Route = createFileRoute("/_authenticated/everything")({
  component: RouteComponent,
});
