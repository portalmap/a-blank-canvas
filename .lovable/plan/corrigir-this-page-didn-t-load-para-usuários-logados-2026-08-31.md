# Corrigir "This page didn't load" para usuários logados

## O que já foi confirmado

- O servidor está saudável: todas as requisições de preview (`/`, `/documents`, `/sso/login`, `/sso/callback`) retornam **200**. Não é erro de SSR nem de rota.
- Sem sessão salva, a aplicação abre normalmente e redireciona para o login do MAP Hub (testado no sandbox).
- Na sua janela de preview existe uma sessão salva (`sb-...-auth-token`) e a tela mostra exatamente a mensagem de erro do limite de erro do React ("This page didn't load"). Ou seja: **o erro acontece ao renderizar a área autenticada no navegador**, depois do login.
- Tipos e build local estão limpos, então é um erro de execução — a mensagem real está sendo engolida pela tela de erro genérica.
- A única camada nova desde a última vez que o app abria é a central de notificações (sino, modal de 30 min, listener), montada dentro de `_authenticated`.

Causa exata ainda **não confirmada** — por isso o primeiro passo do plano é fazer o erro aparecer.

## Passo 1 — Fazer o erro real aparecer (diagnóstico)

Na tela de erro raiz (`src/routes/__root.tsx`), exibir, apenas fora de produção, a mensagem e o stack do erro em um bloco recolhível, além de continuar enviando para o log. Assim o próximo carregamento mostra o nome do componente/arquivo que quebrou em vez do texto genérico.

## Passo 2 — Isolar a área autenticada

Envolver o layout autenticado em um limite de erro próprio e, dentro dele, isolar a camada de notificações (`NotificationListener`, `NotificationReminderProvider`, `NotificationBell`) em um limite de erro silencioso. Consequência: se qualquer coisa da central de notificações falhar, o sino/modal simplesmente não aparece — o sistema inteiro não cai mais. Isso vale como proteção permanente, não só para este bug.

## Passo 3 — Corrigir a causa

Com o erro identificado no Passo 1, aplicar a correção pontual no arquivo culpado (provável: algo na cadeia da central de notificações). Se o erro apontar para outro módulo, a correção vai para lá — sem alterar o restante do sistema.

## Passo 4 — Validar

- Recarregar o preview logado e confirmar que a home, Documentos, Spaces e Configurações abrem.
- Confirmar que o sino carrega a lista e que o modal de não lidas continua funcionando (abrir, adiar, marcar todas).
- Conferir que o console fica sem erros.

## Notas técnicas

- Módulos afetados: `src/routes/__root.tsx` (exibição do erro em dev), `src/routes/_authenticated/route.tsx` (limites de erro) e um novo componente pequeno de limite de erro reutilizável.
- Nada de mudanças em banco de dados, RLS, SSO ou Edge Functions.
- Sem sessão do Hub disponível no ambiente de teste automatizado, a validação final precisa ser feita no seu preview logado.
