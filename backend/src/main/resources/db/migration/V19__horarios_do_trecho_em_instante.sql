-- Os horários do trecho passam a ser instantes (TIMESTAMPTZ, guardados em UTC): a interface mostra
-- no fuso de quem olha. Com hora local solta não se sabia se 10:00 depois de 10:45 era erro de
-- digitação ou um pouso no dia seguinte, e a duração virava 23 horas.
--
-- As colunas novas nascem ao lado das antigas e recebem os dados existentes, lidos como horário de
-- Brasília na data do trecho; pouso antes da partida é pouso no dia seguinte, como a regra antiga.
--
-- A troca de nomes (apagar as antigas e renomear as novas) acontece aqui só sem os dados de
-- desenvolvimento. Com eles, o seed V905 — que roda depois desta migration num banco novo — ainda
-- grava nas colunas antigas, e quem termina a troca é o seed V911.

ALTER TABLE trecho
    ADD COLUMN partida_prevista_utc  TIMESTAMPTZ,
    ADD COLUMN pouso_previsto_utc    TIMESTAMPTZ,
    ADD COLUMN partida_realizada_utc TIMESTAMPTZ,
    ADD COLUMN pouso_realizado_utc   TIMESTAMPTZ;

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
                            AT TIME ZONE 'America/Sao_Paulo';

DO $$
BEGIN
    IF '${dadosDeDesenvolvimento}' <> 'sim' THEN
        ALTER TABLE trecho DROP COLUMN partida_prevista, DROP COLUMN pouso_previsto,
                           DROP COLUMN partida_realizada, DROP COLUMN pouso_realizado;
        ALTER TABLE trecho RENAME COLUMN partida_prevista_utc TO partida_prevista;
        ALTER TABLE trecho RENAME COLUMN pouso_previsto_utc TO pouso_previsto;
        ALTER TABLE trecho RENAME COLUMN partida_realizada_utc TO partida_realizada;
        ALTER TABLE trecho RENAME COLUMN pouso_realizado_utc TO pouso_realizado;
    END IF;
END $$;
