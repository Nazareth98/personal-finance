# PWA e funcionamento offline

## Instalação

O manifesto `manifest.webmanifest` declara nome, idioma, tema, ícones 192/512 e ícone maskable. O botão “Instalar app” só aparece quando o navegador emite `beforeinstallprompt`; não é simulada disponibilidade em plataformas incompatíveis.

O service worker é registrado somente no build de produção. HTTPS é obrigatório fora de `localhost`.

## Limite offline

Offline significa apenas um shell seguro. A página `offline.html` explica que é necessário reconectar; ela não inicializa autenticação nem renderiza dados do livro.

O cache aceita manifesto, ícones e assets estáticos da mesma origem. Permanecem fora do service worker:

- requisições com `Authorization`;
- `rest/v1`, `auth/v1` e `functions/v1`;
- qualquer host contendo `supabase`;
- respostas de contas, lançamentos, saldos, faturas ou sessão.

## Validação

```bash
pnpm pwa:check
pnpm test:pwa
```

O primeiro comando verifica estaticamente manifesto, ícones e fronteiras de cache. O segundo executa um build de produção, confirma o service worker ativo, desliga a rede no Chromium e valida o fallback sem cache financeiro.
