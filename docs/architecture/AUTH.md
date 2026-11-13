# Acesso do proprietário

## Contrato

- Supabase Auth com email e senha; cadastro público e acesso anônimo desativados.
- A aplicação só libera o dashboard quando a sessão pertence ao único registro de `public.profiles` com `is_owner = true`.
- A recuperação de senha sempre exibe uma resposta neutra, evitando revelar se um email existe.
- A senha deve ter no mínimo 12 caracteres.
- A chave pública do Supabase pode estar no frontend; `service_role` e credenciais MeuPluggy nunca podem usar o prefixo `VITE_`.

## Provisionamento no Supabase hospedado

1. Aplique as migrations versionadas em `supabase/migrations` pelo fluxo hospedado do Supabase.
2. Em Authentication, mantenha **Allow new users to sign up** desativado.
3. Crie um único usuário de email e senha pelo painel administrativo.
4. Copie o UUID desse usuário e execute no SQL Editor:

```sql
insert into public.profiles (id, email, is_owner)
values ('UUID_DO_USUARIO', 'EMAIL_DO_PROPRIETARIO', true);
```

5. Configure a URL pública da aplicação e adicione a mesma origem às Redirect URLs do Auth.
6. Defina no frontend `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.

O índice `profiles_single_owner` impede um segundo proprietário. A tabela não concede escrita ao navegador; o provisionamento é administrativo.

## Validação sem Docker

Nesta máquina, não execute `supabase start`, `supabase db reset` ou testes locais do banco. Use:

```bash
pnpm auth:check
pnpm test:auth
```

O primeiro comando verifica estaticamente RLS, grants e ausência de acesso anônimo na migration. O segundo simula as respostas do Supabase e valida login, logout, recuperação e bloqueio de uma sessão sem perfil proprietário. A execução real das policies deve ocorrer em um projeto Supabase hospedado antes de usar dados financeiros.
