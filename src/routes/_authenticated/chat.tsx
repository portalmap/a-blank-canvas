import { createFileRoute } from "@tanstack/react-router";
import Chat from "@/page-views/Chat";
import { GuestBlockedRoute } from "@/components/GuestRoute";

function RouteComponent() {
  return <GuestBlockedRoute><Chat /></GuestBlockedRoute>;
}

export const Route = createFileRoute("/_authenticated/chat")({
  component: RouteComponent,
});
