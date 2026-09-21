USE closetDrii;

-- ============================================================
-- Consulta:
SELECT
    COUNT(DISTINCT pv.venda_id) AS "Quantidade de vendas",
    SUM(pv.quantidade) AS "Total de produtos vendidos",
    SUM(pv.valor) AS "Valor total das vendas"
FROM produto_vendas pv
	LEFT JOIN vendas v on pv.venda_id = v.id
WHERE v.status IN ('pago', 'enviado');

-- Uso pretendido: Ter uma visão geral de como está as vendas da loja.
-- Possui JOIN e agregação e filtro
-- ============================================================

-- ============================================================
-- Consulta:
SELECT
	p.id AS "Produto ID",
    p.nome AS "Nome do produto",
	COUNT(DISTINCT pvd.venda_id) AS "Quantidade de vendas do produto",
    SUM(pvd.quantidade) AS "Quantidade de produtos vendidos",
    SUM(pvd.valor) AS "Valor total das vendas desse produto"
FROM produto_vendas pvd
	LEFT JOIN vendas v on pvd.venda_id = v.id
	LEFT JOIN produto_variantes pvt ON pvd.produto_variante_id = pvt.id
	LEFT JOIN produtos p ON pvt.produto_id = p.id
WHERE v.status IN ('pago', 'enviado')
GROUP BY p.id
ORDER BY SUM(pvd.valor) DESC;

-- Uso pretendido: Ter uma visão geral de como está as vendas de cada produto, para decidir qual ter mais estoque e qual está gerando mais vendas e assim tomar decisões.
-- Possui 3 JOIN, agregação + ordenação, GROUP e filtro
-- ============================================================

-- ============================================================
-- Consulta:
SELECT
	u.id AS "ID do usuario",
    u.nome AS "nome do usuario",
	SUM(pvd.quantidade) AS "Quantidade de produtos vendidos"
FROM produto_vendas pvd
	LEFT JOIN vendas v on pvd.venda_id = v.id
    LEFT JOIN usuarios u on v.usuario_id = u.id
WHERE
	u.dt_nascimento BETWEEN '2000-01-01' AND '2010-01-01'
    AND v.status IN ('pago', 'enviado')
GROUP BY u.id;

-- Uso pretendido: Verificar o quanto os usuarios da geração Z está comprando, pois a loja é voltada em atrair esse público.
-- Possui filtro por intervalo de datas, agregação, JOIN, GROUP e filtro
-- ============================================================

-- ============================================================
-- Consulta:
SELECT
	u.id AS "ID do usuario",
    u.nome AS "nome do usuario",
    COUNT(v.id) AS "total de compras",
    AVG(a.nota) AS "média das notas"
FROM usuarios u
	LEFT JOIN vendas v ON u.id = v.usuario_id
    LEFT JOIN avaliacoes a ON u.id = a.usuario_id
WHERE v.status IN ('pago', 'enviado')
GROUP BY u.id
HAVING
	COUNT(v.id) > 3
    AND AVG(a.nota) > 3
ORDER BY COUNT(v.id) DESC, AVG(a.nota) DESC;

-- Uso pretendido: Ranquear os melhores clientes da loja e assim dar um tratamento especial ou até desconto para incentivar clientes fiéis.
-- Possui  GROUP BY + HAVING, agregação, JOIN, ordenação e filtro
-- ============================================================

-- ============================================================
-- Consulta:
SELECT
    u.id,
    u.nome,
    u.telefone,
    u.email
FROM usuarios u
WHERE
	EXISTS (
		SELECT 1
		FROM vendas v
		WHERE
			v.usuario_id = u.id
            AND v.status IN ('pago', 'enviado')
	)
    AND u.perfil = 'cliente'
    AND u.deleted_at IS NULL;

-- Uso pretendido: Criar uma lista de clientes ativos que já realizaram compra para campanhas de reativação
-- Possui subconsulta EXISTS e filtro
-- ============================================================

-- ============================================================
-- Consulta:
SELECT
	p.id AS "Produto ID",
    p.nome AS "Nome do produto",
	a.comentario AS "Ponto de melhoria"
FROM avaliacoes a
	LEFT JOIN produtos p ON a.produto_id = p.id
WHERE a.nota <= 3;

-- Uso pretendido: Criar um relatorio de melhoria dos produtos, com os comentários de avalicoes ruins sobre ele.
-- Possui JOIN e filtro
-- ============================================================
