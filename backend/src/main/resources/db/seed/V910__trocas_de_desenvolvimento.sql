-- Trocas de desenvolvimento na PS-MEP: duas pendentes em sentidos opostos e uma já devolvida.
INSERT INTO troca_de_km (aeronave_id, data, cedente_id, recebedor_id, horas, km, valor_por_hora,
                         relatorio_de_voo, observacao, situacao, concluida_em, criado_em, atualizado_em)
SELECT a.id, (NOW() - v.dias * INTERVAL '1 day')::date, c.id, r.id, v.horas, v.km, v.valor,
       v.rel, v.obs, v.situacao,
       CASE WHEN v.situacao = 'CONCLUIDA' THEN (NOW() - INTERVAL '3 days')::date END,
       NOW(), NOW()
FROM aeronave a
JOIN (VALUES
    (40, 'Ricardo Meirelles', 'Vetor Participações', 2.5, 1320.0, 14800.00, 'RV-2026-031',
     'Vetor voou SBSP–SBRJ–SBSP na cota do Ricardo; devolução combinada em horas.', 'PENDENTE'),
    (18, 'Helena Sarraf', 'Ricardo Meirelles', 1.2, 610.0, 14800.00, NULL,
     'Traslado para Pampulha na cota da Helena.', 'PENDENTE'),
    (75, 'Vetor Participações', 'Helena Sarraf', 3.0, 1650.0, 14200.00, 'RV-2026-012',
     NULL, 'CONCLUIDA')
) AS v (dias, cedente, recebedor, horas, km, valor, rel, obs, situacao) ON TRUE
JOIN proprietario c ON c.nome = v.cedente
JOIN proprietario r ON r.nome = v.recebedor
WHERE a.matricula = 'PS-MEP';
