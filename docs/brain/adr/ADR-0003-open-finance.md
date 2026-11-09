# ADR 0003 — Mock seguro antes do provedor comercial

Aceita em 09/11/2026. Escolher implementação mock persistida, com consentimentos e regras de autorização no servidor. O contrato TypeScript é substituível; nenhuma implementação de produção é habilitada por variável de frontend.

Motivo: não há contrato, credenciais ou autorização para serviço comercial. Matriz documental indica disponibilidade de instituições, mas não prova todos os produtos em cada conector. Não simular conexão real nem reutilizar credenciais de um usuário.

O mock injeta somente movimentos sintéticos após consentimento explícito e passa pelo mesmo lote/revisão/deduplicação de arquivos. Lock por conexão protege revogação concorrente. State privado de uso único protege autorização. Não implementar webhook real com protocolo inventado. Quando fornecedor for escolhido, uma nova ADR registrará termos, custo, credenciais, cobertura e homologação.
