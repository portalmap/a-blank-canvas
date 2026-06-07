import { createFileRoute } from "@tanstack/react-router";
import ArchivedSpaces from "@/page-views/ArchivedSpaces";
import { AdminRoute } from "@/components/AdminRoute";

function RouteComponent() {
  return <AdminRoute><ArchivedSpaces /></AdminRoute>;
}

export const Route = createFileRoute("/_authenticated/archived-spaces")({
  component: RouteComponent,
});
