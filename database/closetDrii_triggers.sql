USE closetDrii;

-- ============================================================
-- TRIGGER 1: INTEGRIDADE / REGRA DE NEGÓCIO
-- Nome: trg_impedir_exclusao_venda_paga
-- Cenário de uso: Impedir que uma venda com status 'pago' ou 'enviado' seja excluída diretamente da tabela, protegendo o histórico financeiro.
-- Exemplo de ocorrência: ao executar DELETE FROM vendas WHERE id = 1
--   sendo id 1 uma venda paga, o trigger bloqueia a operação com erro.
-- ============================================================
DROP TRIGGER IF EXISTS trg_impedir_exclusao_venda_paga;

DELIMITER $$
CREATE TRIGGER trg_impedir_exclusao_venda_paga
BEFORE DELETE ON vendas
FOR EACH ROW
BEGIN
	IF OLD.status IN ('pago', 'enviado') THEN
		SIGNAL SQLSTATE '45000'
			SET MESSAGE_TEXT = 'Não é permitido excluir vendas pagas ou enviadas.';
	END IF;
END$$
DELIMITER ;

-- Exemplo de ocorrência:
DELETE FROM vendas WHERE id = 17; -- erro se status = 'pago'


-- ============================================================
-- TRIGGER 2: AUDITORIA
-- Nome: trg_log_alteracao_status_venda
-- Cenário de uso: Registrar automaticamente em log_vendas toda vez
--   que o status de uma venda for alterado, permitindo rastrear
--   o histórico completo de mudanças de cada pedido.
-- Exemplo de ocorrência: ao executar UPDATE vendas SET status = 'enviado' WHERE id = 2,
--   uma linha é inserida em log_vendas com status_anterior = 'pago' e status_novo = 'enviado'.
-- ============================================================
DROP TRIGGER IF EXISTS trg_log_alteracao_status_venda;

DELIMITER $$
CREATE TRIGGER trg_log_alteracao_status_venda
AFTER UPDATE ON vendas
FOR EACH ROW
BEGIN
	IF OLD.status != NEW.status THEN
		INSERT INTO log_vendas (venda_id, status_anterior, status_novo)
		VALUES (OLD.id, OLD.status, NEW.status);
	END IF;
END$$
DELIMITER ;

-- Exemplo de ocorrência:
UPDATE vendas SET status = 'enviado' WHERE id = 5;
SELECT * FROM log_vendas;
