import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProfile } from "@/components/settings/UserProfile";
import { WorkspaceSettings } from "@/components/settings/WorkspaceSettings";
import { UserInviteForm } from "@/components/settings/UserInviteForm";
import { GuestPermissionsManager } from "@/components/settings/GuestPermissionsManager";
import { UserManagement } from "@/components/settings/UserManagement";
import { StatusSettings } from "@/components/settings/StatusSettings";
import { TagsSettings } from "@/components/settings/TagsSettings";
import { WebhooksSettings } from "@/components/settings/webhooks/WebhooksSettings";
import { SpaceTemplateSettings } from "@/components/settings/SpaceTemplateSettings";
import { ApiSettings } from "@/components/settings/api/ApiSettings";

export default function Settings() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências, workspace e membros da equipe
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-10 lg:w-[1200px]">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="tags">Etiquetas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="invites">Convites</TabsTrigger>
          <TabsTrigger value="guests">Convidados</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <UserProfile />
        </TabsContent>

        <TabsContent value="workspace" className="mt-6">
          <WorkspaceSettings />
        </TabsContent>

        <TabsContent value="status" className="mt-6">
          <StatusSettings />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <SpaceTemplateSettings />
        </TabsContent>

        <TabsContent value="tags" className="mt-6">
          <TagsSettings />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="invites" className="mt-6">
          <UserInviteForm />
        </TabsContent>

        <TabsContent value="guests" className="mt-6">
          <GuestPermissionsManager />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <WebhooksSettings />
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <ApiSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
