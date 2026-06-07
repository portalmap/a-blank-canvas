import { createFileRoute } from "@tanstack/react-router";
import Dashboards from "@/page-views/Dashboards";
import { GuestBlockedRoute } from "@/components/GuestRoute";

function RouteComponent() {
  return <GuestBlockedRoute><Dashboards /></GuestBlockedRoute>;
}

export const Route = createFileRoute("/_authenticated/dashboards")({
  component: RouteComponent,
});
