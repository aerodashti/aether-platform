-- Usuários para desenvolvimento local. Esta pasta NÃO entra em produção: o perfil `prod`
-- sobrescreve `spring.flyway.locations` com apenas `classpath:db/migration`.
--
-- A senha de todos os ativos é `aether-dev-2026`. Ela é pública de propósito — está aqui para que
-- `./scripts/ambiente.sh up` entregue uma tela de login funcionando, e por isso mesmo nunca pode
-- valer em nenhum ambiente que não seja a máquina de quem desenvolve.
--
-- Os três estados existem para que a tela seja testável sem editar o banco à mão:
--   ATIVO    — entra normalmente e recupera a senha.
--   PENDENTE — foi convidado e ainda não criou senha: não entra e não recebe código.
--   INATIVO  — teve o acesso revogado: recusado com a mesma mensagem de credencial inválida.

INSERT INTO usuario (nome, email, senha, situacao, tentativas, criado_em, atualizado_em) VALUES
    ('Leonardo Andrade', 'leonardo@administraair.com.br',
     '$2a$12$mBkOwFxGjMl8G2XpSxwEXOYyqO3g.88QkTLTb/vvHzoaWMKOHBLwa', 'ATIVO', 0, NOW(), NOW()),
    ('Patrícia Gomes', 'patricia@administraair.com.br',
     '$2a$12$mBkOwFxGjMl8G2XpSxwEXOYyqO3g.88QkTLTb/vvHzoaWMKOHBLwa', 'ATIVO', 0, NOW(), NOW()),
    ('Camila Nogueira', 'camila@administraair.com.br',
     NULL, 'PENDENTE', 0, NOW(), NOW()),
    ('Diego Furtado', 'diego.furtado@administraair.com.br',
     '$2a$12$mBkOwFxGjMl8G2XpSxwEXOYyqO3g.88QkTLTb/vvHzoaWMKOHBLwa', 'INATIVO', 0, NOW(), NOW());
