import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/page-views/Auth";

function RouteComponent() {
  return <Auth />;
}

export const Route = createFileRoute("/auth")({
  component: RouteComponent,
});
