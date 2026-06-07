import { createFileRoute } from "@tanstack/react-router";
import Teams from "@/page-views/Teams";
import { GuestBlockedRoute } from "@/components/GuestRoute";

function RouteComponent() {
  return <GuestBlockedRoute><Teams /></GuestBlockedRoute>;
}

export const Route = createFileRoute("/_authenticated/teams")({
  component: RouteComponent,
});
