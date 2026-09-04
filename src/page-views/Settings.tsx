import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProfile } from "@/components/settings/UserProfile";
import { WorkspaceSettings } from "@/components/settings/WorkspaceSettings";
import { UserManagement } from "@/components/settings/UserManagement";
import { StatusSettings } from "@/components/settings/StatusSettings";
import { TagsSettings } from "@/components/settings/TagsSettings";
import { SpaceTemplateSettings } from "@/components/settings/SpaceTemplateSettings";
import { AutomationTemplateSettings } from "@/components/settings/AutomationTemplateSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { ProductivitySettings } from "@/components/settings/ProductivitySettings";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";


export default function Settings() {
  return (
    <div className="container mx-auto space-y-6 p-3 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas preferências, workspace e membros da equipe
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="flex w-full justify-start overflow-x-auto lg:grid lg:w-[1200px] lg:grid-cols-10">
          <TabsTrigger className="shrink-0" value="profile">Perfil</TabsTrigger>
          <TabsTrigger className="shrink-0" value="workspace">Workspace</TabsTrigger>
          <TabsTrigger className="shrink-0" value="status">Status</TabsTrigger>
          <TabsTrigger className="shrink-0" value="tags">Etiquetas</TabsTrigger>
          <TabsTrigger className="shrink-0" value="templates">Templates</TabsTrigger>
          <TabsTrigger className="shrink-0" value="automations">Automações</TabsTrigger>
          <TabsTrigger className="shrink-0" value="productivity">Produtividade</TabsTrigger>
          <TabsTrigger className="shrink-0" value="users">Usuários</TabsTrigger>
          <TabsTrigger className="shrink-0" value="notifications">Notificações</TabsTrigger>
          <TabsTrigger className="shrink-0" value="integrations">Integrações</TabsTrigger>
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

        <TabsContent value="automations" className="mt-6">
          <AutomationTemplateSettings />
        </TabsContent>

        <TabsContent value="productivity" className="mt-6">
          <ProductivitySettings />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationsSettings />
        </TabsContent>
      </Tabs>

    </div>
  );
}
