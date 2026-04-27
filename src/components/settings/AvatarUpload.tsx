import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AvatarUploadProps {
  userId: string;
  currentUrl?: string | null;
  fullName?: string;
  size?: number;
  /** Quando true, usa a RPC de admin para atualizar o profile (admin editando outro usuário) */
  useAdminRpc?: boolean;
  onChange?: (newUrl: string | null) => void;
}

const MAX_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_DIMENSION = 1024;

async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return file;
  }
  const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
  );
}

export function AvatarUpload({
  userId,
  currentUrl,
  fullName,
  size = 80,
  useAdminRpc = false,
  onChange,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const queryClient = useQueryClient();

  const initials = fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const updateProfile = async (avatarUrl: string | null) => {
    if (useAdminRpc) {
      const { error } = await supabase.rpc("update_user_avatar_as_admin", {
        target_user_id: userId,
        new_avatar_url: avatarUrl,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId);
      if (error) throw error;
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  const handleFile = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("A imagem deve ter no máximo 3 MB.");
      return;
    }
    setUploading(true);
    try {
      const blob = await resizeImage(file);
      const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: blob.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      await updateProfile(publicUrl);
      setPreviewUrl(publicUrl);
      onChange?.(publicUrl);
      invalidate();
      toast.success("Foto atualizada!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      await updateProfile(null);
      setPreviewUrl(null);
      onChange?.(null);
      invalidate();
      toast.success("Foto removida.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover foto.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar style={{ width: size, height: size }}>
          <AvatarImage src={previewUrl || undefined} alt={fullName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="h-4 w-4 mr-2" />
          {previewUrl ? "Alterar" : "Enviar foto"}
        </Button>
        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={handleRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
