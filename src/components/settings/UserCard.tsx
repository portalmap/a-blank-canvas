import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Shield, User, MoreVertical, Edit, Trash2, Eye, Wrench } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Database } from "@/integrations/supabase/types";

type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

interface UserCardProps {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: WorkspaceRole;
  createdAt: string;
  isGlobalOwner?: boolean;
  isOwner?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

const roleConfig: Record<WorkspaceRole, { label: string; icon: any; variant: any }> = {
  owner: { label: "Proprietário", icon: Crown, variant: "default" },
  admin: { label: "Administrador", icon: Shield, variant: "secondary" },
  member: { label: "Membro", icon: User, variant: "outline" },
  limited_member: { label: "Membro Limitado", icon: User, variant: "outline" },
  guest: { label: "Convidado", icon: User, variant: "outline" },
};

export function UserCard({
  userId,
  fullName,
  email,
  avatarUrl,
  role,
  createdAt,
  isGlobalOwner,
  isOwner,
  onEdit,
  onDelete,
  onViewDetails,
  canEdit,
  canDelete,
}: UserCardProps) {
  // Determinar qual badge/ícone mostrar
  let displayConfig = roleConfig[role];
  let displayLabel = displayConfig.label;
  let RoleIcon = displayConfig.icon;
  let badgeVariant = displayConfig.variant;
  
  // Proprietário Global tem prioridade máxima
  if (isGlobalOwner) {
    displayLabel = "Proprietário Global";
    RoleIcon = Crown;
    badgeVariant = "default";
  } 
  // Proprietário (técnico) vem em seguida
  else if (isOwner) {
    displayLabel = "Proprietário";
    RoleIcon = Wrench;
    badgeVariant = "secondary";
  }
  const initials = fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || email[0].toUpperCase();

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
      <Avatar className="h-12 w-12">
        <AvatarImage src={avatarUrl} alt={fullName} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{fullName || email}</p>
          <RoleIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground truncate">{email}</p>
      </div>

      <Badge variant={badgeVariant as any} className="whitespace-nowrap">
        {isGlobalOwner && "👑 "}{isOwner && !isGlobalOwner && "🔧 "}{displayLabel}
      </Badge>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onViewDetails}>
          <Eye className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
