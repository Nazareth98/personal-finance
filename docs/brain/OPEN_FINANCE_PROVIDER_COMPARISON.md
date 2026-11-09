# Comparação de provedores

Pesquisa documental em 09/11/2026. Nenhuma chamada autenticada de produção, contrato, piloto ou contratação realizado. Consentimento do consumidor não equivale a API comercial gratuita.

| Critério | Pluggy | Belvo |
|---|---|---|
| Sandbox | Dados sintéticos no Pluggy Bank | Dados fictícios para prototipação |
| Produção/custo | Open Finance descrito como recurso premium, requer contato comercial | Exige validação comercial e acesso de produção; preço não confirmado nesta pesquisa |
| Itaú / Nubank / Caixa | Instituições constam na cobertura Open Finance | ofitau_br_retail, ofnubank_br_retail e ofcaixa_br_retail constam no status público |
| Contas/transações/cartões | Matriz pública marca os três produtos para as instituições; união de contextos, não garantia de cada conta PF | Catálogo autenticado necessário para confirmar recursos por instituição/conta; status não comprova cartões/faturas |
| Faturas/limites/histórico/frequência | Validar conector, produto, escopo e contrato no piloto | Validar instituição, recurso, escopo e contrato no piloto |
| Webhooks/revogação/retenção/exportação | Implementar após validar documentação específica e termos | Implementar após validar documentação específica e termos |
| Escolha atual | Não habilitado | Não habilitado |

Fontes oficiais: [Pluggy Open Finance](https://v2.docs.pluggy.ai/en/docs/open-finance/overview), [cobertura por produto](https://v2.docs.pluggy.ai/en/docs/open-finance/institutions-coverage), [sandbox Pluggy](https://v2.docs.pluggy.ai/en/docs/guides/sandbox), [sandbox Belvo](https://developers.belvo.com/developer_resources/resources-sandbox), [instituições Belvo](https://institutions.belvo.com/), [catálogo Belvo](https://developers.belvo.com/pt-br/apis/belvoopenapispec/institutions/listinstitutions).

Pendências antes de escolha: cotação e franquia, responsabilidade do participante, elegibilidade contratual, habilitação de produção, limites/retries, escopos por produto, retroatividade real, revogação e exclusão, assinatura/anti-replay de webhooks, exportação e retenção de payloads. Nenhuma célula documental é evidência de homologação de conta real. Adaptador local mock permite operar gratuitamente sem resolver essas pendências.
