import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function MobileHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex items-center justify-between p-4 border-b bg-background md:hidden">
      <div className="flex items-center gap-2">
        <div className="bg-primary rounded-lg p-2">
          <span className="text-primary-foreground font-bold text-sm">M</span>
        </div>
        <span className="font-semibold text-foreground">MAP Flow</span>
      </div>
      <Button variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>
    </header>
  );
}
