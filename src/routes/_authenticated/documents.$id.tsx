import { createFileRoute } from "@tanstack/react-router";
import DocumentView from "@/page-views/DocumentView";
import { GuestBlockedRoute } from "@/components/GuestRoute";

function RouteComponent() {
  return <GuestBlockedRoute><DocumentView /></GuestBlockedRoute>;
}

export const Route = createFileRoute("/_authenticated/documents/$id")({
  component: RouteComponent,
});
