

# Trocar o Favicon

## Resumo

Substituir o favicon atual (`public/favicon.ico`) pela imagem enviada (`logo_sem_fundo_cortado-2.png`).

## Alteracoes

1. Copiar o arquivo `user-uploads://logo_sem_fundo_cortado-2.png` para `public/favicon.png`
2. Atualizar `index.html` para referenciar o novo favicon:
   - Adicionar `<link rel="icon" href="/favicon.png" type="image/png">`

