# Mocks do banco

Dados fake espelhando o banco de verdade (fonte: `database/closetDrii.sql` + `database/closetDrii_inserts.sql`). Um JSON por tabela, sempre um array de objetos com `id` explícito — isso preserva as FKs (`usuario_id`, `categoria_id`, `produto_id`, etc.) entre os arquivos.

## Arquivos

| Arquivo | Tabela | Carregado no `dev:offline` hoje |
|---|---|---|
| `usuarios.json` | usuarios (20: 3 admins + 17 clientes) | sim |
| `enderecos.json` | enderecos (20) | sim |
| `categorias.json` | categorias (5) | sim |
| `produtos.json` | produtos (20) | sim |
| `produto_variantes.json` | produto_variantes (32) | sim |
| `vendas.json` | vendas (15) | sim |
| `produto_vendas.json` | produto_vendas (18) | sim |
| `contatos.json` | contatos (5) | sim |
| `avaliacoes.json` | avaliacoes (12) | sim |
| `log_vendas.json` | log_vendas (6, sintético) | sim |

O seed do `scripts/dev-offline.js` carrega todos os arquivos na ordem de dependência das FKs (usuarios → enderecos, categorias → produtos → produto_variantes, vendas → produto_vendas, etc.).

## Convenções

- `id` explícito em tudo (FKs estáveis entre arquivos).
- `created_at`/`updated_at`/`deleted_at` são omitidos — o Sequelize preenche sozinho no `bulkCreate`.
- Senhas são os placeholders bcrypt do próprio `closetDrii_inserts.sql` (não correspondem a senha real nenhuma).
- A linha 16 (malformada) do INSERT de `vendas` do SQL oficial foi descartada aqui.
