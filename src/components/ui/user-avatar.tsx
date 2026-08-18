import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function getInitials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((p) => p[0]!)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface UserAvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

/** Exibição única de avatar: sempre com fallback de iniciais. */
export function UserAvatar({ url, name, size = 40, className }: UserAvatarProps) {
  return (
    <Avatar className={cn(className)} style={{ width: size, height: size }}>
      {url ? <AvatarImage src={url} alt={name ?? "Avatar"} /> : null}
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}