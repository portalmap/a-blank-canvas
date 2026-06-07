import { createFileRoute } from "@tanstack/react-router";
import TaskView from "@/page-views/TaskView";

function RouteComponent() {
  return <TaskView />;
}

export const Route = createFileRoute("/_authenticated/task/$taskId")({
  component: RouteComponent,
});
