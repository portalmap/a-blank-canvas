import { createFileRoute } from "@tanstack/react-router";

function SignedOut() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-lg font-semibold">Você saiu com segurança.</h1>
        <p className="text-sm text-muted-foreground">
          Pode fechar esta aba.
        </p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/signed-out")({
  component: SignedOut,
});