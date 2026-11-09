# Homologação no ambiente real

Por decisão do proprietário em 09/11/2026, não executar Supabase local. A homologação de Auth, PostgREST e Storage será feita após disponibilização do projeto real. Nenhum passo abaixo foi executado ou é evidência de aprovação.

## Preparação

1. Revisar migrations e políticas; aplicar ao projeto explicitamente escolhido. Em base existente, gerar backup antes de qualquer alteração e identificar usuários anteriores ao trigger.
2. Configurar URL e chave pública anon/publishable no build Cloudflare Pages. Segredos ficam exclusivamente no backend/secret manager. O build bloqueia chaves privilegiadas.
3. Configurar domínio e URLs exatas no Supabase Auth, confirmação por e-mail, senha mínima, SMTP e limites de envio. Validar os headers de segurança no domínio publicado.
4. Criar duas contas de homologação com dados exclusivamente sintéticos e consentimento dos responsáveis. Não utilizar histórico pessoal como fixture.

## Verificação funcional e de isolamento

- Cadastro A/B cria workspaces distintos e vazios; confirmar e-mail, login, recuperação, troca de senha e logout.
- A cria conta, categoria, regra, meta, caixinha, holerite e movimento. B não encontra esses dados em tabelas, filtros, agregados, exportação, UUIDs conhecidos ou endpoints RPC.
- Testar INSERT/UPDATE/DELETE cruzados via API autenticada; a segurança deve resistir sem depender de filtros da UI.
- Storage financial-files permanece privado; B não lê, lista ou altera arquivos do prefixo de A, inclusive tentativas de traversal.
- Importação idêntica não duplica; compras legítimas iguais podem ser mantidas distintas; vínculo arquivo/mock preserva categoria manual.
- Transferência, aporte e pagamento de fatura têm duas pernas e não geram consumo duplicado. Competência pode diferir da data bancária.
- Revogar/expirar consentimento mock impede sync; integrações reais continuam desabilitadas.
- Backup/restauração no mesmo workspace preserva centavos, vínculos e decisões. Arquivo de outro workspace é recusado. Não simular perda apagando dados reais.
- Verificar tamanho/tempo de consultas e cotas do plano gratuito com volume sintético representativo.

Registrar data, ambiente, versão/commit, resultado e pendências por cenário. Não anexar tokens, senhas, IDs pessoais, dados bancários reais ou screenshots de histórico do titular. Não habilitar provedor comercial com base apenas nesta homologação: contratação e autorização explícita são etapas separadas.
