-- Termina, nos dados de desenvolvimento, a V21: dá o dia da conclusão às concluídas que o seed V907
-- gravou sem ele (num banco novo ele roda depois da V21) e só então cria a regra que a V21 cria
-- direto fora do desenvolvimento. Em banco que já tinha as manutenções, a V21 preencheu tudo e a
-- cópia aqui não acha nada a fazer.

UPDATE manutencao
SET concluida_em = LEAST(data, (atualizado_em AT TIME ZONE 'America/Sao_Paulo')::date)
WHERE status = 'CONCLUIDA' AND concluida_em IS NULL;

ALTER TABLE manutencao ADD CONSTRAINT manutencao_conclusao_coerente
    CHECK ((status = 'CONCLUIDA') = (concluida_em IS NOT NULL));
