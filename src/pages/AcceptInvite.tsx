import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    if (!token) {
      setError("Token de convite inválido");
      setLoading(false);
      return;
    }

    try {
      // Buscar convite
      const { data, error: fetchError } = await supabase
        .from("user_invitations")
        .select("*, workspaces(name)")
        .eq("token", token)
        .single();

      if (fetchError || !data) {
        setError("Convite não encontrado");
        setLoading(false);
        return;
      }

      // Verificar se expirou
      if (new Date(data.expires_at) < new Date()) {
        setError("Este convite expirou");
        setLoading(false);
        return;
      }

      // Verificar status
      if (data.status !== "pending") {
        if (data.status === "accepted") {
          setError("Este convite já foi aceito");
        } else if (data.status === "cancelled") {
          setError("Este convite foi cancelado");
        } else {
          setError("Este convite não está mais válido");
        }
        setLoading(false);
        return;
      }

      setInvitation(data);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao carregar convite:", err);
      setError("Erro ao carregar convite");
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!invitation || !user) return;

    setLoading(true);

    try {
      // Verificar se o email do usuário logado corresponde ao email do convite
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        toast.error("Este convite foi enviado para outro email");
        setLoading(false);
        return;
      }

      // Adicionar membro ao workspace
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: invitation.workspace_id,
          user_id: user.id,
          role: invitation.role,
        });

      if (memberError) {
        if (memberError.code === "23505") {
          toast.error("Você já é membro deste workspace");
        } else {
          throw memberError;
        }
        setLoading(false);
        return;
      }

      // Atualizar status do convite
      await supabase
        .from("user_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      toast.success("Convite aceito com sucesso!");
      navigate("/");
    } catch (err) {
      console.error("Erro ao aceitar convite:", err);
      toast.error("Erro ao aceitar convite");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Verificando convite...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Convite Inválido</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate("/")} className="w-full">
              Ir para o Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Faça login para aceitar o convite</CardTitle>
            <CardDescription>
              Você precisa estar logado para aceitar este convite
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            <CardTitle>Convite para Workspace</CardTitle>
          </div>
          <CardDescription>
            Você foi convidado para participar do workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted">
              <p className="font-semibold text-lg">{invitation.workspaces.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Como: <span className="font-medium">{invitation.role}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={acceptInvitation}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aceitando...
                  </>
                ) : (
                  "Aceitar Convite"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="w-full"
              >
                Recusar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}