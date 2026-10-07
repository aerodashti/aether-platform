-- O dia em que a manutenção foi feita. Até aqui, concluir só trocava o status, e a coluna
-- "Conclusão" do histórico mostrava a data programada — que podia até estar no futuro.
--
-- Nas já concluídas, a melhor estimativa é a data programada, a menos que ela viesse depois do
-- clique em concluir (o atualizado_em): aí vale o dia do clique, no horário de Brasília.

ALTER TABLE manutencao ADD COLUMN concluida_em DATE;

UPDATE manutencao
SET concluida_em = LEAST(data, (atualizado_em AT TIME ZONE 'America/Sao_Paulo')::date)
WHERE status = 'CONCLUIDA';

COMMENT ON COLUMN manutencao.concluida_em IS 'Dia em que a manutenção foi feita; nulo enquanto programada.';

-- Concluída tem a data; programada não. Com os dados de desenvolvimento, o seed V907 — que num banco
-- novo roda depois desta migration — ainda grava concluídas sem ela, e quem cria a regra é o V912.
DO $$
BEGIN
    IF '${dadosDeDesenvolvimento}' <> 'sim' THEN
        ALTER TABLE manutencao ADD CONSTRAINT manutencao_conclusao_coerente
            CHECK ((status = 'CONCLUIDA') = (concluida_em IS NOT NULL));
    END IF;
END $$;
