import { createFileRoute } from "@tanstack/react-router";
import Automations from "@/page-views/Automations";
import { AdminRoute } from "@/components/AdminRoute";

function RouteComponent() {
  return <AdminRoute><Automations /></AdminRoute>;
}

export const Route = createFileRoute("/_authenticated/automations")({
  component: RouteComponent,
});
