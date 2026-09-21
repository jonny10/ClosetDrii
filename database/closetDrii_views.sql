USE closetDrii;

-- ============================================================
-- VIEW 1: RELATÓRIO (agregações)
-- Nome: vw_relatorio_vendas_por_produto
-- Cenário de uso: Ver o desempenho de cada produto em vendas, receita e avaliação para apoiar decisões de estoque.
-- ============================================================
CREATE OR REPLACE VIEW vw_relatorio_vendas_por_produto AS
SELECT
	p.id AS "ID do produto",
	p.nome AS "Nome do produto",
	c.nome AS "Categoria",
	COUNT(DISTINCT pv.venda_id) AS "Quantidade de vendas do produto",
	SUM(pv.quantidade) AS "Quantidade de produtos vendidos",
	SUM(pv.valor) AS "Valor total das vendas desse produto",
	ROUND(AVG(a.nota), 2) AS "Avaliação média desse produto"
FROM produto_vendas pv
	LEFT JOIN produto_variantes pvt ON pv.produto_variante_id = pvt.id
	LEFT JOIN produtos p ON pvt.produto_id = p.id
	LEFT JOIN categorias c ON p.categoria_id = c.id
	LEFT JOIN vendas v ON pv.venda_id = v.id
	LEFT JOIN avaliacoes a ON p.id = a.produto_id
WHERE v.status IN ('pago', 'enviado')
GROUP BY p.id
ORDER BY SUM(pv.valor) DESC;

-- Exemplo de uso:
SELECT * FROM vw_relatorio_vendas_por_produto;
SELECT * FROM vw_relatorio_vendas_por_produto WHERE Categoria = 'Blusas';


-- ============================================================
-- VIEW 2: CONVENIÊNCIA (simplifica joins)
-- Nome: vw_itens_venda
-- Cenário de uso: Consultar os itens de uma venda com dados do cliente e produto sem repetir os joins.
-- ============================================================
CREATE OR REPLACE VIEW vw_itens_venda AS
SELECT
	v.id AS "ID da venda",
	v.status AS "Status da venda",
	v.created_at AS "Data da venda",
	u.id AS "ID do usuário",
	u.nome AS "Cliente",
	p.id AS "ID do produto",
	p.nome AS "Produto",
	pvt.cor AS "Cor",
	pvt.tamanho AS "Tamanho",
	pv.quantidade AS "Quantidade",
	pv.valor AS "Valor do item",
	v.valor_total AS "Valor total da venda"
FROM produto_vendas pv
	JOIN produto_variantes pvt ON pv.produto_variante_id = pvt.id
	JOIN produtos p ON pvt.produto_id = p.id
	JOIN vendas v ON pv.venda_id = v.id
	JOIN usuarios u ON v.usuario_id = u.id;

-- Exemplo de uso:
SELECT * FROM vw_itens_venda WHERE `ID da venda` = 1;
SELECT * FROM vw_itens_venda WHERE `ID do usuário` = 3 ORDER BY `Data da venda` DESC;


-- ============================================================
-- VIEW 3: PARAMETRIZÁVEL (genérica — joins e campos prontos, filtros abertos)
-- Nome: vw_vendas_clientes
-- Cenário de uso: Base genérica para filtrar vendas por período, status, faixa etária ou localidade sem reescrever os joins.
-- ============================================================d
CREATE OR REPLACE VIEW vw_vendas_clientes AS
SELECT
	v.id AS "ID da venda",
	v.status AS "Status da venda",
	v.valor_total AS "Valor total",
	v.created_at AS "Data da venda",
	u.id AS "ID do usuário",
	u.nome AS "Cliente",
	u.email AS "Email",
	u.genero AS "Gênero",
	u.dt_nascimento AS "Data de nascimento",
	e.cidade AS "Cidade",
	e.estado AS "Estado"
FROM vendas v
	LEFT JOIN usuarios u ON v.usuario_id = u.id
	LEFT JOIN enderecos e ON v.endereco_entrega_id = e.id
WHERE u.deleted_at IS NULL;a

-- Exemplos de uso (aplicando filtros externamente):
-- -- Vendas pagas em 2024:
SELECT * FROM vw_vendas_clientes WHERE `Status da venda` = 'pago' AND YEAR(`Data da venda`) = 2026;

-- -- Clientes da geração Z (nascidos entre 2000 e 2010):
SELECT
	Cliente,
	SUM(`Valor total`)
FROM vw_vendas_clientes
WHERE `Data de nascimento` BETWEEN '2000-01-01' AND '2010-12-31'
GROUP BY `ID do usuário`, Cliente;

-- -- Vendas por estado:
SELECT Estado, COUNT(*) FROM vw_vendas_clientes GROUP BY Estado;


-- ============================================================
-- VIEW 4: SEGURANÇA (oculta colunas sensíveis)
-- Nome: vw_usuarios_publico
-- Cenário de uso: Listar usuários sem expor senha, CPF e telefone para partes do sistema que não precisam desses dados.
-- ============================================================
CREATE OR REPLACE VIEW vw_usuarios_publico AS
SELECT
	id AS "ID do usuário",
	nome AS "Nome",
	email AS "Email",
	perfil AS "Perfil",
	genero AS "Gênero",
	created_at AS "Criado em"
FROM usuarios
WHERE deleted_at IS NULL;

-- Exemplo de uso:
SELECT * FROM vw_usuarios_publico;
SELECT * FROM vw_usuarios_publico WHERE Perfil = 'cliente';
