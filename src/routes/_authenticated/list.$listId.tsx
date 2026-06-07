import { createFileRoute } from "@tanstack/react-router";
import ListDetailView from "@/page-views/ListDetailView";
import { GuestBlockedRoute } from "@/components/GuestRoute";

function RouteComponent() {
  return <GuestBlockedRoute><ListDetailView /></GuestBlockedRoute>;
}

export const Route = createFileRoute("/_authenticated/list/$listId")({
  component: RouteComponent,
});
