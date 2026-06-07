import { createFileRoute } from "@tanstack/react-router";
import Settings from "@/page-views/Settings";
import { AdminRoute } from "@/components/AdminRoute";

function RouteComponent() {
  return <AdminRoute><Settings /></AdminRoute>;
}

export const Route = createFileRoute("/_authenticated/settings")({
  component: RouteComponent,
});
