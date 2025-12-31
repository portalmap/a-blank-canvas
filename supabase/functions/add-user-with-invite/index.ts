import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AddUserRequest {
  email: string;
  role: 'global_owner' | 'owner_technical' | 'workspace_owner' | 'admin' | 'member' | 'limited_member' | 'guest';
  workspaceId?: string;
  temporaryPassword?: string;
  mustChangePassword?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Extract JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the requesting user is authenticated using admin client with token
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !requestingUser) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, role, workspaceId, temporaryPassword, mustChangePassword }: AddUserRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if workspace is required for workspace roles
    const isAppRole = role === 'global_owner' || role === 'owner_technical';
    if (!isAppRole && !workspaceId) {
      return new Response(
        JSON.stringify({ error: "Workspace é obrigatório para roles de workspace" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing add user request for email: ${email}, role: ${role}`);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let userId: string | null = null;
    let userExists = false;

    const existingUser = existingUsers?.users.find(u => u.email === email);
    if (existingUser) {
      userId = existingUser.id;
      userExists = true;
      console.log(`User already exists with ID: ${userId}`);
    } else {
      // Create new user
      console.log("Creating new user...");
      
      // Create user with or without password
      const createUserOptions: any = {
        email,
        email_confirm: true,
      };
      
      if (temporaryPassword) {
        createUserOptions.password = temporaryPassword;
      }
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser(createUserOptions);

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      userId = newUser.user.id;
      console.log(`New user created with ID: ${userId}`);

      // If temporary password was set and must change password is enabled, update profile
      if (temporaryPassword && mustChangePassword) {
        await supabaseAdmin
          .from('profiles')
          .update({ must_change_password: true })
          .eq('id', userId);
        console.log("Set must_change_password flag for user");
      }

      // Only send recovery email if no temporary password was provided
      if (!temporaryPassword) {
        const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
        });

        if (!resetError && resetData?.properties?.action_link) {
          await resend.emails.send({
            from: "Sistema <onboarding@resend.dev>",
            to: [email],
            subject: "Bem-vindo! Defina sua senha",
            html: `
              <h1>Bem-vindo ao Sistema!</h1>
              <p>Você foi adicionado ao sistema. Clique no link abaixo para definir sua senha:</p>
              <p><a href="${resetData.properties.action_link}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Definir Senha</a></p>
              <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
              <p>${resetData.properties.action_link}</p>
              <p>Este link expira em 24 horas.</p>
            `,
          });
          console.log("Welcome email sent successfully");
        }
      } else {
        // Send email with temporary password info
        await resend.emails.send({
          from: "Sistema <onboarding@resend.dev>",
          to: [email],
          subject: "Bem-vindo! Suas credenciais de acesso",
          html: `
            <h1>Bem-vindo ao Sistema!</h1>
            <p>Você foi adicionado ao sistema. Suas credenciais de acesso são:</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Senha:</strong> ${temporaryPassword}</p>
            ${mustChangePassword ? '<p><em>Você será solicitado a alterar sua senha no primeiro login.</em></p>' : ''}
            <p>Acesse o sistema para começar!</p>
          `,
        });
        console.log("Welcome email with credentials sent successfully");
      }
    }

    // Add role to user
    if (isAppRole) {
      // Add to user_roles table
      const appRole = role === 'global_owner' ? 'global_owner' : 'owner';
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: appRole,
        });

      if (roleError) {
        if (roleError.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Usuário já possui este role global' }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        console.error("Error adding app role:", roleError);
        return new Response(
          JSON.stringify({ error: `Erro ao adicionar role: ${roleError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else {
      // Add to workspace_members table
      const workspaceRole = role === 'workspace_owner' ? 'owner' : role;
      const { error: memberError } = await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role: workspaceRole,
        });

      if (memberError) {
        if (memberError.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'Usuário já é membro deste workspace' }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        console.error("Error adding workspace member:", memberError);
        return new Response(
          JSON.stringify({ error: `Erro ao adicionar ao workspace: ${memberError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    let message = 'Usuário adicionado com sucesso!';
    if (!userExists) {
      message = temporaryPassword 
        ? 'Usuário criado com senha temporária! Email com credenciais enviado.'
        : 'Usuário criado! Email para definir senha enviado.';
    }

    return new Response(
      JSON.stringify({ success: true, message, userId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in add-user-with-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
