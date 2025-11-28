import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

interface UserFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  roleFilter: WorkspaceRole | "all" | "global_owner" | "owner";
  onRoleFilterChange: (value: WorkspaceRole | "all" | "global_owner" | "owner") => void;
  sortBy: "name" | "date" | "role";
  onSortByChange: (value: "name" | "date" | "role") => void;
}

export function UserFilters({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  sortBy,
  onSortByChange,
}: UserFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={roleFilter} onValueChange={onRoleFilterChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filtrar por role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os roles</SelectItem>
          <SelectItem value="global_owner">👑 Proprietário Global</SelectItem>
          <SelectItem value="owner">🔧 Proprietário (Técnico)</SelectItem>
          <SelectItem value="admin">Administrador</SelectItem>
          <SelectItem value="member">Membro</SelectItem>
          <SelectItem value="limited_member">Membro Limitado</SelectItem>
          <SelectItem value="guest">Convidado</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Nome</SelectItem>
          <SelectItem value="date">Data de entrada</SelectItem>
          <SelectItem value="role">Role</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
