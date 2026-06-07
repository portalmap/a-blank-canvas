import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface CreateTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lists: Array<{ id: string; name: string }>;
  statuses: Array<{ id: string; name: string; color: string | null }>;
  onSubmit: (data: {
    name: string;
    targetListId?: string;
    defaultStatusId?: string;
  }) => void;
  isLoading: boolean;
}

export function CreateTokenDialog({
  open,
  onOpenChange,
  lists,
  statuses,
  onSubmit,
  isLoading,
}: CreateTokenDialogProps) {
  const [name, setName] = useState("");
  const [targetListId, setTargetListId] = useState<string>("");
  const [defaultStatusId, setDefaultStatusId] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      targetListId: targetListId && targetListId !== "none" ? targetListId : undefined,
      defaultStatusId: defaultStatusId && defaultStatusId !== "none" ? defaultStatusId : undefined,
    });

    // Reset form
    setName("");
    setTargetListId("");
    setDefaultStatusId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Token de API</DialogTitle>
          <DialogDescription>
            Crie um novo token para integrar sistemas externos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Token</Label>
            <Input
              id="name"
              placeholder="Ex: GCSM Integration"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="list">Lista de Destino (opcional)</Label>
            <Select value={targetListId} onValueChange={setTargetListId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma lista padrão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (definir na requisição)</SelectItem>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se não definida, será obrigatório enviar list_id na requisição.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status Padrão (opcional)</Label>
            <Select value={defaultStatusId} onValueChange={setDefaultStatusId}>
              <SelectTrigger>
                <SelectValue placeholder="Usar padrão da lista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Usar padrão da lista</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color || "#94a3b8" }}
                      />
                      {status.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Token
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
