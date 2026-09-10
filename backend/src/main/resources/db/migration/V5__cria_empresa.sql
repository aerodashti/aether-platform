-- A empresa dona desta instalação: os dados que a tela de Configurações edita.
--
-- É UMA linha, garantida pelo CHECK abaixo. Isto NÃO é multi-inquilino: o brief do produto
-- descreve um SaaS multi-inquilino, mas isolar dados por inquilino é decisão de arquitetura com
-- ADR próprio, e nada no produto hoje a exige. Aqui é só "os dados desta conta".

CREATE TABLE empresa (
    id                      BIGINT       PRIMARY KEY,
    nome_fantasia           VARCHAR(120) NOT NULL,
    razao_social            VARCHAR(180) NOT NULL,
    -- Só dígitos, sem máscara: formatar é trabalho da interface. Imutável depois de criada —
    -- é o documento do contrato, e trocá-lo é trocar de empresa, não editar um campo.
    cnpj                    VARCHAR(14)  NOT NULL,
    email                   VARCHAR(180) NOT NULL,
    telefone                VARCHAR(20)  NOT NULL,
    -- Com quantos dias de antecedência avisar antes de um documento vencer. Governa a coluna
    -- Situação da tela de Aeronaves; antes era constante no application.yml.
    dias_de_aviso           INTEGER      NOT NULL,
    criado_em               TIMESTAMPTZ  NOT NULL,
    atualizado_em           TIMESTAMPTZ  NOT NULL,
    -- Uma linha só. O CHECK é o que torna "a empresa" um singular verificável, em vez de uma
    -- convenção que alguém quebra com um INSERT distraído.
    CONSTRAINT empresa_linha_unica CHECK (id = 1),
    CONSTRAINT empresa_cnpj_valido CHECK (cnpj ~ '^[0-9]{14}$'),
    -- A janela precisa caber num ano: avisar com 400 dias não é aviso, é ruído permanente.
    CONSTRAINT empresa_dias_de_aviso_plausivel CHECK (dias_de_aviso BETWEEN 1 AND 365)
);

COMMENT ON TABLE empresa IS 'A empresa dona desta instalação. Sempre uma linha.';
COMMENT ON COLUMN empresa.cnpj IS 'Somente dígitos. Imutável: é o documento do contrato.';
COMMENT ON COLUMN empresa.dias_de_aviso IS 'Antecedência do aviso de vencimento, em dias.';

-- A linha nasce aqui, e não no seed, porque produção também precisa dela: a tela de
-- Configurações não pode abrir vazia. Os valores são de partida e existem para ser editados.
INSERT INTO empresa (id, nome_fantasia, razao_social, cnpj, email, telefone, dias_de_aviso, criado_em, atualizado_em)
VALUES (1, 'Administra Air', 'Administra Air Gestão de Aeronaves LTDA', '19274653000188',
        'contato@administraair.com.br', '+55 11 3000-0000', 30, NOW(), NOW());
