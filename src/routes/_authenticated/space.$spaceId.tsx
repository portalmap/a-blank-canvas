import { createFileRoute } from "@tanstack/react-router";
import SpaceDetailView from "@/page-views/SpaceDetailView";
import { GuestBlockedRoute } from "@/components/GuestRoute";

function RouteComponent() {
  return <GuestBlockedRoute><SpaceDetailView /></GuestBlockedRoute>;
}

export const Route = createFileRoute("/_authenticated/space/$spaceId")({
  component: RouteComponent,
});
