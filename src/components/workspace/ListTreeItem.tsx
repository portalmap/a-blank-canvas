import { List } from "lucide-react";
import { NavLink } from "@/components/NavLink";

interface ListTreeItemProps {
  list: {
    id: string;
    name: string;
  };
}

export function ListTreeItem({ list }: ListTreeItemProps) {
  return (
    <NavLink
      to={`/list/${list.id}`}
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-sidebar-accent rounded-md text-sm"
      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
    >
      <List className="h-4 w-4 flex-shrink-0 ml-4" />
      <span className="truncate">{list.name}</span>
    </NavLink>
  );
}
