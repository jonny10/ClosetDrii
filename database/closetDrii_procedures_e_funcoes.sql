USE closetDrii;

-- ============================================================
-- PROCEDURE 1: CRUD TRANSACIONAL
-- Nome: proc_registrar_venda
-- Pré-condições: usuário e endereço devem existir; itens não vazios;
--   cada produto_variante_id deve existir e ter estoque suficiente.
-- Pós-condições: venda inserida com status 'pendente', estoque
--   decrementado por item, rollback automático em caso de erro.
-- ============================================================
DROP PROCEDURE IF EXISTS proc_registrar_venda;

DELIMITER $$
CREATE PROCEDURE proc_registrar_venda(
	IN p_usuario_id INT,
	IN p_endereco_id INT,
	IN p_variante_id INT,
	IN p_quantidade INT,
	OUT p_venda_id INT
)
BEGIN
	DECLARE v_estoque INT DEFAULT 0;
	DECLARE v_preco DECIMAL(10,2);
	DECLARE v_valor_total DECIMAL(10,2);

	DECLARE EXIT HANDLER FOR SQLEXCEPTION
	BEGIN
		ROLLBACK;
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Erro ao registrar venda. Operação revertida.';
	END;

	IF p_quantidade <= 0 THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Quantidade deve ser maior que zero.';
	END IF;

	SELECT pvt.estoque, p.preco INTO v_estoque, v_preco
	FROM produto_variantes pvt
		JOIN produtos p ON pvt.produto_id = p.id
	WHERE pvt.id = p_variante_id;

	IF v_estoque IS NULL THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Variante de produto não encontrada.';
	END IF;

	IF v_estoque < p_quantidade THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estoque insuficiente para a variante solicitada.';
	END IF;

	SET v_valor_total = v_preco * p_quantidade;

	START TRANSACTION;

		INSERT INTO vendas (usuario_id, endereco_entrega_id, valor_total, status)
		VALUES (p_usuario_id, p_endereco_id, v_valor_total, 'pendente');

		SET p_venda_id = LAST_INSERT_ID();

		INSERT INTO produto_vendas (venda_id, produto_variante_id, quantidade, valor)
		VALUES (p_venda_id, p_variante_id, p_quantidade, v_valor_total);

		UPDATE produto_variantes
        SET estoque = estoque - p_quantidade
        WHERE id = p_variante_id;

	COMMIT;
END$$
DELIMITER ;

-- Exemplo de chamada:
CALL proc_registrar_venda(4, 4, 1, 2, @venda_id);
SELECT @venda_id;


-- ============================================================
-- FUNÇÃO 1: DERIVADA
-- Nome: func_classificar_cliente
-- Pré-condições: usuario_id deve existir e ter ao menos uma compra.
-- Pós-condições: retorna a faixa do cliente com base no total gasto.
-- ============================================================
DROP FUNCTION IF EXISTS func_classificar_cliente;

DELIMITER $$
CREATE FUNCTION func_classificar_cliente(p_usuario_id INT)
RETURNS VARCHAR(20)
DETERMINISTIC
READS SQL DATA
BEGIN
	DECLARE v_total DECIMAL(10,2) DEFAULT 0;

	SELECT COALESCE(SUM(valor_total), 0) INTO v_total
	FROM vendas
	WHERE
        usuario_id = p_usuario_id
        AND status IN ('pago', 'enviado');

	RETURN CASE
		WHEN v_total >= 1000 THEN 'VIP'
		WHEN v_total >= 500  THEN 'Fiel'
		WHEN v_total >= 100  THEN 'Regular'
		ELSE 'Novo'
	END;
END$$
DELIMITER ;

-- Exemplo de chamada:
SELECT
	nome,
	func_classificar_cliente(id) AS "Classificação"
FROM usuarios
WHERE perfil = 'cliente';


-- ============================================================
-- PROCEDURE 2: RELATORIAL
-- Nome: proc_relatorio_vendas_periodo
-- Pré-condições: p_inicio e p_fim devem ser datas válidas (p_inicio <= p_fim).
-- Pós-condições: tabela temporária tmp_relatorio_vendas disponível
--   na sessão com o resumo de vendas por cliente no período.
-- ============================================================
DROP PROCEDURE IF EXISTS proc_relatorio_vendas_periodo;

DELIMITER $$
CREATE PROCEDURE proc_relatorio_vendas_periodo(
	IN p_inicio DATE,
	IN p_fim DATE
)
BEGIN
	IF p_inicio > p_fim THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Data de início não pode ser maior que a data de fim.';
	END IF;

	DROP TEMPORARY TABLE IF EXISTS tmp_relatorio_vendas;

	CREATE TEMPORARY TABLE tmp_relatorio_vendas AS
	SELECT
		u.id AS "ID do usuário",
		u.nome AS "Cliente",
		COUNT(v.id) AS "Total de pedidos",
		SUM(v.valor_total) AS "Valor total gasto",
		func_classificar_cliente(u.id) AS "Classificação"
	FROM vendas v
		LEFT JOIN usuarios u ON v.usuario_id = u.id
	WHERE
		v.status IN ('pago', 'enviado')
		AND DATE(v.created_at) BETWEEN p_inicio AND p_fim
	GROUP BY u.id;

	SELECT * FROM tmp_relatorio_vendas ORDER BY `Valor total gasto` DESC;
END$$
DELIMITER ;

-- Exemplo de chamada:
CALL proc_relatorio_vendas_periodo('2026-01-01', '2026-12-31');


-- ============================================================
-- PROCEDURE 3: NEGÓCIO
-- Nome: proc_cancelar_venda
-- Pré-condições: venda deve existir e estar com status 'pendente'.
-- Pós-condições: status alterado para 'cancelado' e estoque
--   de cada item da venda restaurado.
-- ============================================================
DROP PROCEDURE IF EXISTS proc_cancelar_venda;

DELIMITER $$
CREATE PROCEDURE proc_cancelar_venda(
	IN p_venda_id INT
)
BEGIN
	DECLARE v_status VARCHAR(20);

	DECLARE EXIT HANDLER FOR SQLEXCEPTION
	BEGIN
		ROLLBACK;
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Erro ao cancelar venda. Operação revertida.';
	END;

	SELECT status INTO v_status FROM vendas WHERE id = p_venda_id;

	IF v_status IS NULL THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Venda não encontrada.';
	END IF;

	IF v_status != 'pendente' THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Apenas vendas com status pendente podem ser canceladas.';
	END IF;

	START TRANSACTION;

		UPDATE produto_variantes pvt
			JOIN produto_vendas pv ON pvt.id = pv.produto_variante_id
		SET pvt.estoque = pvt.estoque + pv.quantidade
		WHERE pv.venda_id = p_venda_id;

		UPDATE vendas SET status = 'cancelado' WHERE id = p_venda_id;

	COMMIT;
END$$
DELIMITER ;

-- Exemplo de chamada:
CALL proc_cancelar_venda(1);
