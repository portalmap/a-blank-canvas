import { createFileRoute } from "@tanstack/react-router";
import SpacesView from "@/page-views/SpacesView";
import { GuestBlockedRoute } from "@/components/GuestRoute";

function RouteComponent() {
  return <GuestBlockedRoute><SpacesView /></GuestBlockedRoute>;
}

export const Route = createFileRoute("/_authenticated/spaces")({
  component: RouteComponent,
});
