import { createFileRoute } from "@tanstack/react-router";
import Documents from "@/page-views/Documents";
import { GuestBlockedRoute } from "@/components/GuestRoute";

function RouteComponent() {
  return <GuestBlockedRoute><Documents /></GuestBlockedRoute>;
}

export const Route = createFileRoute("/_authenticated/documents")({
  component: RouteComponent,
});
