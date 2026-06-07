import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ThemeLogo } from "@/components/ThemeLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function MobileHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex items-center justify-between p-4 border-b bg-background md:hidden">
      <div className="flex items-center gap-2">
        <ThemeLogo className="h-8 w-8 object-contain" />
        <span className="font-semibold text-foreground">MAP Flow</span>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </div>
    </header>
  );
}
