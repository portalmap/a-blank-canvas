import { createFileRoute } from "@tanstack/react-router";
import DashboardView from "@/page-views/DashboardView";
import { GuestBlockedRoute } from "@/components/GuestRoute";

function RouteComponent() {
  return <GuestBlockedRoute><DashboardView /></GuestBlockedRoute>;
}

export const Route = createFileRoute("/_authenticated/dashboards/$id")({
  component: RouteComponent,
});
