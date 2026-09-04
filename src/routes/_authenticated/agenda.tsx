import { createFileRoute } from "@tanstack/react-router";
import Agenda from "@/page-views/Agenda";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: Agenda,
  head: () => ({
    meta: [
      { title: "Agenda | MAP Flow" },
      {
        name: "description",
        content:
          "Sua agenda pessoal no MAP Flow: compromissos, lembretes, convites para a equipe e espelho com o Google Agenda.",
      },
      { property: "og:title", content: "Agenda | MAP Flow" },
      {
        property: "og:description",
        content:
          "Compromissos, lembretes e convites da equipe, com integração opcional ao Google Agenda.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
