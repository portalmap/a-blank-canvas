import { createFileRoute } from "@tanstack/react-router";
import Gestao from "@/page-views/Gestao";

export const Route = createFileRoute("/_authenticated/gestao")({
  component: Gestao,
  head: () => ({
    meta: [
      { title: "Gestão | MAP Flow" },
      {
        name: "description",
        content:
          "Relatórios estratégicos do MAP Flow: presença nas reuniões do Google Meet, entradas, saídas e tempo de participação.",
      },
      { property: "og:title", content: "Gestão | MAP Flow" },
      {
        property: "og:description",
        content:
          "Relatórios de presença em reuniões e indicadores estratégicos para administradores e convidados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
