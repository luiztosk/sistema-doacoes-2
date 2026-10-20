# TODO — Sistema Doações 2

> **Superado.** Este arquivo era a lista de pendências do meio da migração para
> o modelo de contadores, e foi escrito antes da decisão que trocou esse modelo
> por um **ledger**. O que resta pendente está em
> [`docs/estado-atual.md`](docs/estado-atual.md), e o contrato novo, em
> [`docs/frozen/`](docs/frozen/README.md).

O que era a lista, e o que aconteceu com cada item:

| Item | Situação |
|---|---|
| 1. Erros de TypeScript em `src/worker/routes/inventory/` | **Superado** — o modelo de contadores foi abandonado; os erros disappear com ele |
| 2. `DeliveryFormValues` com `beneficiaryId: string \| null` | **Superado** — o tipo não existe mais |
| 3. Erros em `scripts/generate.ts` e `scripts/seed.ts` | **Superado** — o seed foi reescrito para o ledger, e ele sorteia movimentos e deriva o saldo |
| 4. Tabela de linhas no formulário de doação | **Ainda vale** — vira a lista de itens do contrato, e é o que faz a entrega reservar estoque. No ledger, a lista de itens **é** o conteúdo do documento |
| 5. Tabela de linhas no formulário de entrega | **Ainda vale** — idem |
| 6. `DonationFormValues` com `lines?` | **Superado** — o tipo não existe mais |
| 7. Rotas de criação precisam do formulário com linhas | **Ainda vale** — o formulário de entrega e o de doação precisam da lista de itens |
| 8. `tests/api.ts` só cobre o modelo antigo | **Superado** — 38 casos do contrato novo, com as rotas montadas e um D1 de mentira |
| 9. `tests/inventory.ts` não roda | **Superado** — a suíte foi reescrita para o ledger, com as rotas montadas, e roda contra o D1 local |
| 10. `docs/frontend-formulario.md` sem exemplo de `SelectField` | **Superado** — o exemplo existe, em `forms/inventory/delivery.tsx` com o `fkOptions` |

## O que entrou depois

Duas decisões tomadas depois deste arquivo, que valem mais que a lista acima:

- **O modelo de estoque é um ledger**, não contadores. O contrato está em
  [`docs/frozen/modelos-db.md`](docs/frozen/modelos-db.md) e
  [`docs/frozen/api.md`](docs/frozen/api.md).
- **A instituição é a instância** — uma instância por instituição, sem
  `organization_id`. Ver
  [`docs/frozen/seguranca.md`](docs/frozen/seguranca.md).
