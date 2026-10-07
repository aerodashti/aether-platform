-- Termina, nos dados de desenvolvimento, a troca da V19: copia para as colunas novas o que o seed
-- V905 gravou nas antigas (num banco novo ele roda depois da V19) e só então apaga as antigas e
-- renomeia as novas. Em banco que já tinha os trechos, a V19 copiou tudo e a cópia aqui não acha
-- nada a fazer.

UPDATE trecho SET
    partida_prevista_utc  = (data + partida_prevista) AT TIME ZONE 'America/Sao_Paulo',
    pouso_previsto_utc    = (data + pouso_previsto
                             + CASE WHEN pouso_previsto <= partida_prevista
                                    THEN INTERVAL '1 day' ELSE INTERVAL '0' END)
                            AT TIME ZONE 'America/Sao_Paulo',
    partida_realizada_utc = (data + partida_realizada) AT TIME ZONE 'America/Sao_Paulo',
    pouso_realizado_utc   = (data + pouso_realizado
                             + CASE WHEN pouso_realizado <= partida_realizada
                                    THEN INTERVAL '1 day' ELSE INTERVAL '0' END)
                            AT TIME ZONE 'America/Sao_Paulo'
WHERE partida_prevista_utc IS NULL AND partida_realizada_utc IS NULL;

ALTER TABLE trecho DROP COLUMN partida_prevista, DROP COLUMN pouso_previsto,
                   DROP COLUMN partida_realizada, DROP COLUMN pouso_realizado;
ALTER TABLE trecho RENAME COLUMN partida_prevista_utc TO partida_prevista;
ALTER TABLE trecho RENAME COLUMN pouso_previsto_utc TO pouso_previsto;
ALTER TABLE trecho RENAME COLUMN partida_realizada_utc TO partida_realizada;
ALTER TABLE trecho RENAME COLUMN pouso_realizado_utc TO pouso_realizado;
