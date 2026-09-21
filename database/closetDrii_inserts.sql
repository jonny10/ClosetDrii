USE closetDrii;

-- ============================================================
-- 1. USUARIOS (20 linhas)
-- ============================================================
INSERT INTO `usuarios` (`nome`, `email`, `senha`, `telefone`, `cpf`, `perfil`, `genero`, `dt_nascimento`) VALUES
('Jedson Henrique', 'jedson@email.com', '$2b$10$abc123hash1', '19987650001', '12345678901', 'admin', 'M', '2005-03-14'),
('Fabricio Onofre', 'fabricio@email.com', '$2b$10$abc123hash2', '19987650002', '12345678902', 'admin', 'M', '2003-07-22'),
('Jonny Araujo', 'jonny@email.com', '$2b$10$abc123hash3', '19987650003', '12345678903', 'admin', 'M', '2003-05-30'),
('Ana Paula Ferreira', 'ana.paula@email.com', '$2b$10$abc123hash4', '11987650004', '12345678904', 'cliente', 'F', '1998-01-20'),
('Beatriz Costa', 'beatriz@email.com', '$2b$10$abc123hash5', '11987650005', '12345678905', 'cliente', 'F', '2000-06-15'),
('Camila Rodrigues', 'camila@email.com', '$2b$10$abc123hash6', '11987650006', '12345678906', 'cliente', 'F', '1996-09-30'),
('Daniela Martins', 'daniela@email.com', '$2b$10$abc123hash7', '11987650007', '12345678907', 'cliente', 'F', '1994-04-08'),
('Eduarda Pereira', 'eduarda@email.com', '$2b$10$abc123hash8', '11987650008', '12345678908', 'cliente', 'F', '2001-12-03'),
('Fernanda Oliveira', 'fernanda@email.com', '$2b$10$abc123hash9', '11987650009', '12345678909', 'cliente', 'F', '1999-08-17'),
('Gabriela Santos', 'gabriela@email.com', '$2b$10$abc123hash0', '11987650010', '12345678910', 'cliente', 'F', '1997-02-25'),
('Helena Carvalho', 'helena@email.com', '$2b$10$abc123hashA', '11987650011', '12345678911', 'cliente', 'F', '2002-05-11'),
('Isabela Nascimento', 'isabela@email.com', '$2b$10$abc123hashB', '11987650012', '12345678912', 'cliente', 'F', '1995-10-29'),
('Juliana Mendes', 'juliana@email.com', '$2b$10$abc123hashC', '11987650013', '12345678913', 'cliente', 'F', '1993-07-04'),
('Karen Ribeiro', 'karen@email.com', '$2b$10$abc123hashD', '11987650014', '12345678914', 'cliente', 'F', '2000-03-18'),
('Larissa Gomes', 'larissa@email.com', '$2b$10$abc123hashE', '11987650015', '12345678915', 'cliente', 'F', '1998-11-22'),
('Mariana Dias', 'mariana@email.com', '$2b$10$abc123hashF', '11987650016', '12345678916', 'cliente', 'F', '1996-06-07'),
('Natalia Araujo', 'natalia@email.com', '$2b$10$abc123hashG', '11987650017', '12345678917', 'cliente', 'F', '2001-09-14'),
('Patricia Vieira', 'patricia@email.com', '$2b$10$abc123hashH', '11987650018', '12345678918', 'cliente', 'F', '1994-01-31'),
('Rafaela Teixeira', 'rafaela@email.com', '$2b$10$abc123hashI', '11987650019', '12345678919', 'cliente', 'F', '1999-04-26'),
('Sabrina Cardoso', 'sabrina@email.com', '$2b$10$abc123hashJ', '11987650020', '12345678920', 'cliente', 'F', '2003-08-09');

-- ============================================================
-- 2. ENDERECOS (20 linhas)
-- ============================================================
INSERT INTO `enderecos` (`usuario_id`, `rua`, `numero`, `bairro`, `cidade`, `estado`, `cep`, `complemento`) VALUES
(1, 'R. Sud Mennuci', '455', 'Jardim Aurélia', 'Campinas', 'SP', '13033055', 'Apto 401'),
(2, 'Rua Coronel Quirino', '1500', 'Taquaral', 'Campinas', 'SP', '13025060', NULL),
(3, 'Rua Conceição', '200', 'Centro', 'Campinas', 'SP', '13010050', NULL),
(4, 'Av. José de Souza Campos', '1200', 'Nova Campinas', 'Campinas', 'SP', '13092123', 'Apto 82'),
(5, 'Rua Barão de Jaguara', '901', 'Centro', 'Campinas', 'SP', '13015001', NULL),
(6, 'Rua Culto à Ciência', '340', 'Botafogo', 'Campinas', 'SP', '13020060', NULL),
(7, 'Rua Sete de Setembro', '23', 'Centro', 'Belo Horizonte', 'MG', '30130071', NULL),
(8, 'Rua das Palmeiras', '89', 'Boa Viagem', 'Recife', 'PE', '51020010', 'Apto 301'),
(9, 'Av. Atlântica', '1500','Copacabana', 'Rio de Janeiro', 'RJ', '22021001', NULL),
(10, 'Rua Augusta', '320', 'Consolação', 'São Paulo', 'SP', '01305000', 'Sala 5'),
(11, 'Rua Tiradentes', '67', 'Centro', 'Porto Alegre', 'RS', '90030070', NULL),
(12, 'Av. Getúlio Vargas', '900', 'Funcionários', 'Belo Horizonte', 'MG', '30112020', 'Apto 12'),
(13, 'Rua Padre Chagas', '150', 'Moinhos de Vento','Porto Alegre', 'RS', '90570080', NULL),
(14, 'Rua Oscar Freire', '210', 'Jardins', 'São Paulo', 'SP', '01426001', NULL),
(15, 'Av. Boa Viagem', '3300','Boa Viagem', 'Recife', 'PE', '51111000', 'Cobertura'),
(16, 'Rua das Orquídeas', '55', 'Alphaville', 'Barueri', 'SP', '06453000', NULL),
(17, 'Rua Visconde de Pirajá','400', 'Ipanema', 'Rio de Janeiro', 'RJ', '22410003', 'Apto 201'),
(18, 'Av. Independência', '730', 'Independência', 'Porto Alegre', 'RS', '90035075', NULL),
(19, 'Rua Halfeld', '480', 'Centro', 'Juiz de Fora', 'MG', '36010001', NULL),
(20, 'Rua Barão de Itapetininga','60','República', 'São Paulo', 'SP', '01042000', 'Loja 3');

-- ============================================================
-- 3. CATEGORIAS (8 linhas)
-- ============================================================
INSERT INTO `categorias` (`nome`, `descricao`) VALUES
('Vestidos', 'Vestidos casuais, festivos e de trabalho para todos os estilos'),
('Blusas', 'Blusas, camisetas e tops femininos'),
('Calças', 'Calças jeans, sociais e leggings femininas'),
('Saias', 'Saias curtas, midi e longas'),
('Acessórios', 'Bolsas, cintos, lenços e bijuterias');

-- ============================================================
-- 4. PRODUTOS (20 linhas)
-- ============================================================
INSERT INTO `produtos` (`nome`, `descricao`, `preco`, `categoria_id`) VALUES
('Vestido Floral Midi', 'Vestido midi estampa floral, tecido leve, ideal para o verão', 189.90, 1),
('Vestido Tubinho Preto', 'Vestido tubinho clássico preto, perfeito para ocasiões formais', 249.90, 1),
('Blusa Cropped Listrada', 'Blusa cropped com listras coloridas, tecido algodão', 79.90, 2),
('Blusa de Seda Off-White', 'Blusa de seda com decote V, elegante e versátil', 159.90, 2),
('Calça Jeans Skinny', 'Calça jeans skinny cintura alta, modelagem que valoriza a silhueta', 199.90, 3),
('Calça Social Preta', 'Calça social preta slim fit, ideal para o ambiente de trabalho', 179.90, 3),
('Saia Midi Plissada', 'Saia midi plissada em tecido fluido, várias cores disponíveis', 139.90, 4),
('Saia Jeans Mini', 'Saia jeans mini com botões frontais, estilo retrô', 99.90, 4),
('Vestido Azul Ombro a Ombro', 'Vestido azul ombro a ombro em crepe, elegante e moderno', 229.90, 1),
('Vestido Xadrez Manga Longa', 'Vestido xadrez com manga longa, estilo casual chique', 189.90, 1),
('Bolsa Tote Caramelo', 'Bolsa tote em couro sintético caramelo, espaçosa e resistente', 219.90, 5),
('Cinto Trançado Preto', 'Cinto trançado em couro legítimo preto, tamanho ajustável', 59.90, 5),
('Camisa Florida Viscose', 'Camisa estampada floral em viscose, leve e colorida', 99.90, 2),
('Blusa Tie-Dye Manga Curta', 'Blusa tie-dye manga curta, estilo despojado e moderno', 79.90, 2),
('Saia Longa Estampada', 'Saia longa com estampa geométrica colorida, tecido fluido', 149.90, 4),
('Saia Assimétrica Preta', 'Saia assimétrica preta com fenda lateral, sofisticada', 129.90, 4),
('Vestido Longo Boho', 'Vestido longo estilo boho com bordados, perfeito para festivais', 299.90, 1),
('Blusa Regata Básica', 'Regata básica feminina em algodão, disponível em várias cores', 49.90, 2),
('Legging Fitness', 'Legging fitness cintura alta com cós largo, tecido compressão', 99.90, 3),
('Calça Pantalona Floral', 'Calça pantalona com estampa floral, confortável e estilosa', 169.90, 3);

-- ============================================================
-- 5. PRODUTO_VARIANTES (32 linhas)
-- ============================================================
INSERT INTO `produto_variantes` (`produto_id`, `cor`, `tamanho`, `imagem_url`, `estoque`) VALUES
(1, 'Rosa', 'P', 'src/assets/img/produtos/vestido-floral-rosa-p.jpg', 5),
(1, 'Rosa', 'M', 'src/assets/img/produtos/vestido-floral-rosa-m.jpg', 7),
(1, 'Azul', 'M', 'src/assets/img/produtos/vestido-floral-azul-m.jpg', 4),
(2, 'Preto', 'P', 'src/assets/img/produtos/vestido-tubinho-preto-p.jpg', 3),
(2, 'Preto', 'M', 'src/assets/img/produtos/vestido-tubinho-preto-m.jpg', 6),
(2, 'Preto', 'G', 'src/assets/img/produtos/vestido-tubinho-preto-g.jpg', 2),
(3, 'Branco', 'P', 'src/assets/img/produtos/blusa-cropped-branco-p.jpg', 8),
(3, 'Colorido', 'M', 'src/assets/img/produtos/blusa-cropped-color-m.jpg', 6),
(4, 'Off-White', 'M', 'src/assets/img/produtos/blusa-seda-offwhite-m.jpg', 5),
(5, 'Azul Escuro', '36', 'src/assets/img/produtos/calca-jeans-36.jpg', 4),
(5, 'Azul Escuro', '38', 'src/assets/img/produtos/calca-jeans-38.jpg', 7),
(5, 'Azul Escuro', '40', 'src/assets/img/produtos/calca-jeans-40.jpg', 5),
(6, 'Preto', '38', 'src/assets/img/produtos/calca-social-preta-38.jpg', 4),
(7, 'Verde', 'M', 'src/assets/img/produtos/saia-midi-verde-m.jpg', 5),
(7, 'Bege', 'G', 'src/assets/img/produtos/saia-midi-bege-g.jpg', 3),
(8, 'Azul', 'P', 'src/assets/img/produtos/saia-jeans-mini-azul-p.jpg', 6),
(9, 'Azul', 'P', 'src/assets/img/produtos/vestido-azul-ombro-p.jpg', 4),
(9, 'Azul', 'M', 'src/assets/img/produtos/vestido-azul-ombro-m.jpg', 5),
(10, 'Xadrez', 'M', 'src/assets/img/produtos/vestido-xadrez-m.jpg', 3),
(11, 'Caramelo', 'U', 'src/assets/img/produtos/bolsa-tote-caramelo.jpg', 8),
(12, 'Preto', 'U', 'src/assets/img/produtos/cinto-trancado-preto.jpg', 10),
(13, 'Branco', 'P', 'src/assets/img/produtos/camisa-florida-branco-p.jpg', 6),
(13, 'Rosa', 'M', 'src/assets/img/produtos/camisa-florida-rosa-m.jpg', 5),
(14, 'Tie-Dye', 'M', 'src/assets/img/produtos/blusa-tiedye-m.jpg', 7),
(15, 'Verde', 'M', 'src/assets/img/produtos/saia-longa-verde-m.jpg', 4),
(15, 'Estampado', 'G', 'src/assets/img/produtos/saia-longa-estampada-g.jpg', 3),
(16, 'Preto', 'M', 'src/assets/img/produtos/saia-assimetrica-preta-m.jpg', 4),
(17, 'Terracota', 'M', 'src/assets/img/produtos/vestido-boho-terracota-m.jpg', 3),
(18, 'Branco', 'P', 'src/assets/img/produtos/regata-basica-branco-p.jpg', 9),
(18, 'Preto', 'M', 'src/assets/img/produtos/regata-basica-preto-m.jpg', 8),
(19, 'Preto', 'M', 'src/assets/img/produtos/legging-fitness-preto-m.jpg', 7),
(20, 'Floral', '38', 'src/assets/img/produtos/calca-pantalona-floral-38.jpg', 5);

-- ============================================================
-- 6. VENDAS (15 linhas)
-- ============================================================
INSERT INTO `vendas` (`valor_total`, `usuario_id`, `status`, `endereco_entrega_id`) VALUES
(269.80, 4, 'pago', 4),
(249.90, 5, 'enviado', 5),
(199.90, 6, 'pago', 6),
(319.80, 7, 'pago', 7),
(189.90, 8, 'pendente', 8),
(389.90, 9, 'enviado', 9),
(179.80, 10, 'pago', 10),
(229.90, 11, 'cancelado', 11),
(299.80, 12, 'pago', 12),
(149.90, 13, 'enviado', 13),
(459.80, 14, 'pago', 14),
(119.90, 15, 'pendente', 15),
(349.80, 16, 'enviado', 16),
(89.90, 17, 'pago', 17),
(529.70, 18, 'pago', 18),
(4, 4, 189.90, 'pago');

-- ============================================================
-- 7. PRODUTO_VENDAS (18 linhas)
-- ============================================================
INSERT INTO `produto_vendas` (`produto_variante_id`, `venda_id`, `quantidade`, `valor`) VALUES
(1, 1, 1, 189.90),
(7, 1, 1, 79.90),
(5, 2, 1, 249.90),
(9, 3, 1, 199.90),
(8, 4, 2, 159.80),
(4, 4, 1, 159.90),
(1, 5, 1, 189.90),
(14, 6, 1, 229.90),
(12, 7, 1, 59.90),
(23, 7, 1, 119.90),
(14, 8, 1, 229.90),
(17, 9, 2, 199.80),
(21, 9, 1, 119.90),
(16, 10, 1, 149.90),
(10, 11, 1, 199.90),
(13, 11, 1, 259.90),
(19, 12, 1, 149.90),
(22, 13, 2, 99.80);

-- ============================================================
-- 8. CONTATO (5 linhas)
-- ============================================================
INSERT INTO `contatos` (`nome`, `email`, `assunto`, `mensagem`) VALUES
('Leticia Moura', 'leticia.moura@email.com', 'Parceria', 'Olá, gostaria de discutir uma possível parceria comercial com a ClosetDrii.'),
('Bruna Fonseca', 'bruna.fonseca@email.com', 'Sugestão de peça', 'Adoraria ver mais opções de vestidos plus size na loja!'),
('Thiago Campos', 'thiago.campos@email.com', 'Problema no pedido', 'Meu pedido #8 foi cancelado sem motivo aparente, podem verificar?'),
('Tatiane Borges', 'tatiane@email.com', 'Troca de produto', 'Recebi a blusa no tamanho errado, como faço para trocar?'),
('Renata Figueiredo', 'renata@email.com', 'Elogio', 'Amei a qualidade do vestido floral midi! Com certeza voltarei a comprar.');

-- ============================================================
-- 9. AVALIACAO (12 linhas)
-- ============================================================
INSERT INTO `avaliacoes` (`usuario_id`, `produto_id`, `nota`, `comentario`) VALUES
(4, 1, 5, 'Vestido lindo, tecido de ótima qualidade e caimento perfeito!'),
(5, 2, 4, 'Muito elegante, mas o tamanho P ficou um pouco justo.'),
(6, 5, 5, 'Calça incrível, valoriza muito a silhueta. Super recomendo!'),
(7, 3, 4, 'Blusa fofa e confortável, as cores são bem vibrantes.'),
(8, 1, 5, 'Comprei para um casamento e recebi muitos elogios!'),
(9, 10, 5, 'Vestido xadrez incrível, muito versátil para o dia a dia!'),
(10, 7, 3, 'A saia é bonita mas o tecido amassa muito fácil.'),
(11, 9, 5, 'Vestido azul lindo, caimento perfeito e tecido de qualidade.'),
(12, 13, 4, 'Camisa florida super estilosa, recebi muitos elogios!'),
(13, 15, 5, 'Saia longa linda, tecido fluido e muito confortável!'),
(14, 2, 4, 'Vestido tubinho clássico, uso no trabalho toda semana.'),
(15, 17, 5, 'Vestido boho maravilhoso, perfeito para o festival que fui!');
