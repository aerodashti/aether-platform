-- Papéis para os usuários de desenvolvimento. Migration nova em vez de edição do V900 porque o
-- V900 já foi aplicado em banco de quem está com o ambiente de pé, e alterar migration aplicada
-- quebra o checksum do Flyway.
--
-- Os quatro papéis aparecem, para que o filtro da tela de Usuários seja testável sem editar o
-- banco à mão. Leonardo é o administrador: é com ele que se entra para ver a tela restrita.

UPDATE usuario SET papel = 'ADMINISTRADOR' WHERE email = 'leonardo@administraair.com.br';
UPDATE usuario SET papel = 'GESTOR'        WHERE email = 'patricia@administraair.com.br';
UPDATE usuario SET papel = 'PROPRIETARIO'  WHERE email = 'camila@administraair.com.br';
UPDATE usuario SET papel = 'PILOTO'        WHERE email = 'diego.furtado@administraair.com.br';

-- Um último acesso plausível para que a coluna da tela não nasça toda vazia. Camila continua nula:
-- ela é a PENDENTE, e quem nunca entrou não tem último acesso.
UPDATE usuario SET ultimo_acesso = NOW() - INTERVAL '2 hours' WHERE email = 'leonardo@administraair.com.br';
UPDATE usuario SET ultimo_acesso = NOW() - INTERVAL '3 days'  WHERE email = 'patricia@administraair.com.br';
UPDATE usuario SET ultimo_acesso = NOW() - INTERVAL '4 months' WHERE email = 'diego.furtado@administraair.com.br';
