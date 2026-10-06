-- O saldo do fundo no dia do cadastro: o ponto de partida do fechamento.
--
-- A aeronave chega ao Aether com um fundo que já existe — positivo, ou negativo quando os
-- proprietários devem. O fechamento parte dele e o distribui pela participação do primeiro
-- contrato. As aeronaves já cadastradas começam em zero.

ALTER TABLE aeronave
    ADD COLUMN saldo_de_abertura NUMERIC(14,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN aeronave.saldo_de_abertura IS
    'Saldo do fundo na data do cadastro; distribuído pela participação do primeiro contrato.';
