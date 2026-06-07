import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/page-views/HomePage";

function RouteComponent() {
  return <HomePage />;
}

export const Route = createFileRoute("/_authenticated/")({
  component: RouteComponent,
});
