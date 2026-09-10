-- Proprietários de desenvolvimento. Como os demais seeds, esta pasta não entra em produção.
--
-- Três estados que a tela precisa mostrar: cadastro completo, cadastro mínimo (sem documento e
-- sem contato) e um inativo.

INSERT INTO proprietario (nome, cpf_cnpj, email, telefone, cor_de_identificacao, situacao, criado_em, atualizado_em) VALUES
    ('Ricardo Meirelles', '52998224725', 'ricardo@meirelles.com.br', '+55 11 98888-0000',
     'PETROLEO', 'ATIVO', NOW(), NOW()),
    ('Vetor Participações', '11444777000161', 'contato@vetorpar.com.br', '+55 11 3000-1000',
     'AMBAR', 'ATIVO', NOW(), NOW()),
    -- Cadastro mínimo: só o nome. O documento chega com o contrato de participação.
    ('Helena Sarraf', NULL, NULL, NULL, 'VERDE', 'ATIVO', NOW(), NOW()),
    -- Inativo: saiu da operação, mas o histórico continua apontando para ele.
    ('Otávio Lins', '15350946056', 'otavio@exemplo.com.br', NULL, 'CINZA', 'INATIVO', NOW(), NOW());
