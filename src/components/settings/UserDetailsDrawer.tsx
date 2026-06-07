import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Crown, Shield, User, Calendar, Phone, Mail, FileText } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

interface UserDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    phone?: string;
    bio?: string;
    role: WorkspaceRole;
    createdAt: string;
  };
}

const roleConfig: Record<WorkspaceRole, { label: string; icon: any; variant: any }> = {
  admin: { label: "Administrador", icon: Shield, variant: "secondary" },
  member: { label: "Membro", icon: User, variant: "outline" },
  limited_member: { label: "Membro Limitado", icon: User, variant: "outline" },
  guest: { label: "Convidado", icon: User, variant: "outline" },
};

export function UserDetailsDrawer({ open, onOpenChange, user }: UserDetailsDrawerProps) {
  const config = roleConfig[user.role];
  const RoleIcon = config.icon;
  const initials = user.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || user.email[0].toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes do Usuário</SheetTitle>
          <SheetDescription>
            Informações completas e histórico de atividades
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Avatar e Info Básica */}
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatarUrl} alt={user.fullName} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{user.fullName || user.email}</h3>
              <div className="flex items-center justify-center gap-2 mt-2">
                <RoleIcon className="h-4 w-4" />
                <Badge variant={config.variant as any}>{config.label}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informações de Contato */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase">
              Informações de Contato
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>

              {user.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Membro desde</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {user.bio && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase">Bio</h4>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{user.bio}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Estatísticas - Placeholder para futuras implementações */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase">
              Estatísticas
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Tasks Criadas</p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Tasks Completadas</p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
