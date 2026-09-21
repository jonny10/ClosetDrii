USE closetDrii;

-- ============================================================
-- TRANSAÇÃO 1: TRANSFERÊNCIA DE ESTOQUE ENTRE VARIANTES
-- Cenário de uso: Realocar estoque de uma variante esgotada para
--   outra do mesmo produto, garantindo que nenhuma unidade seja
--   perdida ou duplicada durante a operação.
--
-- Isolamento: READ COMMITTED
--   Evita leitura suja (dirty read): a transação só enxerga dados
--   já confirmados por outras sessões, impedindo que um estoque
--   "fantasma" de outra transação ainda não commitada seja lido.
--   Anomalia mitigada: dirty read.
--   Anomalia ainda possível: non-repeatable read (a mesma linha
--   lida duas vezes na mesma transação pode retornar valores
--   diferentes se outra sessão commitar entre as leituras).
-- ============================================================

SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;

-- Decrementa estoque da variante de origem (id=1)
UPDATE produto_variantes
SET estoque = estoque - 5
WHERE id = 1 AND estoque >= 5;

-- Verifica se a atualização foi aplicada
-- (ROW_COUNT() = 0 significa estoque insuficiente → força rollback)
-- Em ambiente de aplicação, checar ROW_COUNT() antes do próximo passo.

-- Incrementa estoque da variante de destino (id=2)
UPDATE produto_variantes
SET estoque = estoque + 5
WHERE id = 2;

COMMIT;

-- ============================================================
-- Demonstração de falha e recuperação (ROLLBACK)
-- Simula a mesma operação com uma variante inexistente como destino,
-- forçando rollback manual para garantir consistência.
-- ============================================================

SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;

UPDATE produto_variantes
SET estoque = estoque - 5
WHERE id = 1 AND estoque >= 5;

-- Destino inválido: id=9999 não existe, nenhuma linha afetada.
-- Em produção, checar ROW_COUNT() e acionar ROLLBACK se = 0.
UPDATE produto_variantes
SET estoque = estoque + 5
WHERE id = 9999;

-- Rollback manual ao detectar falha
ROLLBACK;

-- Resultado: estoque da variante id=1 não foi alterado,
-- nenhuma unidade foi perdida.
