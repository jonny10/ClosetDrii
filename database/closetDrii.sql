CREATE SCHEMA IF NOT EXISTS `closetDrii`;

use closetDrii;

CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `nome`VARCHAR(250) NOT NULL COMMENT 'Nome do usuário',
    `email` VARCHAR(180) NOT NULL UNIQUE COMMENT 'Email do usuário (login)',
    `senha` VARCHAR(255) NOT NULL COMMENT 'Senha do usuário (login)',
    `telefone` VARCHAR(13) COMMENT 'Telefone do usuário',
    `cpf` CHAR(11) COMMENT 'CPF do usuário',
    `perfil` ENUM('cliente', 'admin') DEFAULT 'cliente' COMMENT 'Perfil do usário no sistema',
    `genero` ENUM('M', 'F', 'N/I') COMMENT 'Gênero do usuário',
    `dt_nascimento` DATE COMMENT 'Data de nascimento do usuário',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME COMMENT 'Data de exclusão do usuário (soft delete)',
    PRIMARY KEY (`id`)
) COMMENT 'Usuários do sistema (clientes e administradores)';


CREATE TABLE IF NOT EXISTS `enderecos` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `usuario_id` INT NOT NULL COMMENT 'FK para usuario.id - id do usuário ao qual pertence esse endereço',
    `rua` VARCHAR(255) NOT NULL COMMENT 'Rua do endereço',
    `numero` VARCHAR(10) NOT NULL COMMENT 'Número do endereço',
    `bairro` VARCHAR(100) NOT NULL COMMENT 'Bairro do endereço',
    `cidade` VARCHAR(255) NOT NULL COMMENT 'Cidade do endereço',
    `estado` CHAR(2) NOT NULL COMMENT 'Estado do endereço',
    `cep` CHAR(8) NOT NULL COMMENT 'CEP do endereço',
    `complemento` VARCHAR(255) COMMENT 'Complemento do endereço',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_endereco_usuario`
        FOREIGN KEY (`usuario_id`)
        REFERENCES `usuarios` (`id`)
        ON DELETE CASCADE
) COMMENT 'Endereços de entrega dos usuários';

CREATE TABLE IF NOT EXISTS `categorias` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(255) NOT NULL COMMENT 'Nome da categoria',
    `descricao` TEXT NOT NULL COMMENT 'Descrição da categoria',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) COMMENT 'Categorias dos produtos';

CREATE TABLE IF NOT EXISTS `produtos` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(255) NOT NULL COMMENT 'Nome do produto',
    `descricao` TEXT NOT NULL COMMENT 'Descrição do produto',
    `preco` DECIMAL(10, 2) NOT NULL COMMENT 'Preço do produto',
    `categoria_id` INT NOT NULL COMMENT 'FK para categoria.id - categoria do produto',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_produto_categoria`
        FOREIGN KEY (`categoria_id`)
        REFERENCES `categorias` (`id`)
) COMMENT 'Produtos disponíveis na loja';

CREATE TABLE IF NOT EXISTS `produto_variantes` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `produto_id` INT NOT NULL COMMENT 'FK para produto.id - variante do produto',
    `cor` VARCHAR(50) NOT NULL COMMENT 'Cor variante do produto',
    `tamanho` VARCHAR(10) NOT NULL COMMENT 'Tamanho variante do produto',
    `imagem_url` VARCHAR(255) COMMENT 'URL da imagem da variante',
    `estoque` INT NOT NULL DEFAULT 0 COMMENT 'Estoque da variante',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE (`produto_id`, `cor`, `tamanho`),
    CONSTRAINT `fk_produto_variante`
        FOREIGN KEY (`produto_id`)
        REFERENCES `produtos` (`id`)
        ON DELETE CASCADE
) COMMENT 'Variantes de cor e tamanho de cada produto';

CREATE TABLE IF NOT EXISTS `vendas` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `valor_total` DECIMAL(10, 2) NOT NULL COMMENT 'Valor total da venda',
    `usuario_id` INT NOT NULL COMMENT 'FK para usuario.id - id do usuário ao qual pertence essa venda',
    `status` ENUM('pendente', 'pago', 'cancelado', 'enviado') DEFAULT 'pendente' COMMENT 'Status da venda',
    `endereco_entrega_id` INT COMMENT 'FK para enderecos.id - endereço de entrega da venda',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_venda_usuario`
        FOREIGN KEY (`usuario_id`)
        REFERENCES `usuarios` (`id`),
    CONSTRAINT `fk_venda_endereco`
        FOREIGN KEY (`endereco_entrega_id`)
        REFERENCES `enderecos` (`id`)
) COMMENT 'Pedidos de compra realizados pelos clientes';

CREATE TABLE IF NOT EXISTS `produto_vendas` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `produto_variante_id` INT NOT NULL COMMENT 'FK para produto_variantes.id - id do produto variante ao qual pertence essa venda',
    `venda_id` INT NOT NULL COMMENT 'FK para venda.id - id do venda ao qual pertence essa produto',
    `quantidade` INT NOT NULL COMMENT 'Quantidade do produto nessa venda',
    `valor` DECIMAL(10, 2) NOT NULL COMMENT 'Valor total desse produto na venda dependendo da quantidade',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_produto_variante_venda`
        FOREIGN KEY (`produto_variante_id`)
        REFERENCES `produto_variantes` (`id`),
    CONSTRAINT `fk_venda_produto`
        FOREIGN KEY (`venda_id`)
        REFERENCES `vendas` (`id`)
) COMMENT 'Itens de produto incluídos em cada venda';

CREATE TABLE IF NOT EXISTS `contatos` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(255) NOT NULL COMMENT 'Nome do contato',
    `email` VARCHAR(255) NOT NULL COMMENT 'Email do contato',
    `assunto` VARCHAR(255) NOT NULL COMMENT 'Assunto da mensagem',
    `mensagem` TEXT NOT NULL COMMENT 'Mensagem do contato',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) COMMENT 'Mensagens enviadas pelo formulário de contato';

CREATE TABLE IF NOT EXISTS `avaliacoes` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `usuario_id` INT NOT NULL COMMENT 'FK para usuario.id - id do usuário que fez a avaliação',
    `produto_id` INT NOT NULL COMMENT 'FK para produto.id - id do produto avaliado',
    `nota` INT NOT NULL COMMENT 'Nota da avaliação (1 a 5)',
    `comentario` TEXT COMMENT 'Comentário da avaliação',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_avaliacao_usuario`
        FOREIGN KEY (`usuario_id`)
        REFERENCES `usuarios` (`id`),
    CONSTRAINT `fk_avaliacao_produto`
        FOREIGN KEY (`produto_id`)
        REFERENCES `produtos` (`id`)
) COMMENT 'Avaliações de produtos feitas pelos clientes';

CREATE TABLE IF NOT EXISTS `log_vendas` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `venda_id` INT NOT NULL COMMENT 'FK para vendas.id - venda que foi alterada',
    `status_anterior` VARCHAR(20) COMMENT 'Status antes da alteração',
    `status_novo` VARCHAR(20) COMMENT 'Status após a alteração',
    `alterado_em` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora da alteração',
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_log_venda`
        FOREIGN KEY (`venda_id`)
        REFERENCES `vendas` (`id`)
) COMMENT 'Log de alterações de status das vendas para auditoria';
