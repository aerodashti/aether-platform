-- Diário de voos de desenvolvimento: trechos do mês corrente na PS-MEP, com os estados que a
-- tela precisa — voo completo de duas pernas com horários realizados, trecho só com previsto e
-- um voo de manutenção (sem atribuição). Os contadores do seed V904 já contemplam estes voos.

INSERT INTO trecho (aeronave_id, relatorio_de_voo, numero_do_trecho, data, origem, destino, km,
                    partida_prevista, pouso_previsto, partida_realizada, pouso_realizado,
                    proprietario_id, observacoes, criado_em, atualizado_em)
SELECT a.id, t.rel, t.num, t.data, t.orig, t.dest, t.km,
       t.dep_prev::time, t.arr_prev::time, t.dep_real::time, t.arr_real::time,
       p.id, t.obs, NOW(), NOW()
FROM aeronave a
JOIN (VALUES
    ('RV-2026-041', 1, (NOW() - INTERVAL '9 days')::date, 'SBSP', 'SBRJ', 365.0,
     '08:30', '09:20', '08:42', '09:31', 'Ricardo Meirelles', NULL),
    ('RV-2026-041', 2, (NOW() - INTERVAL '7 days')::date, 'SBRJ', 'SBSP', 365.0,
     '17:00', '17:50', '17:05', '17:58', 'Ricardo Meirelles', NULL),
    ('RV-2026-042', 1, (NOW() - INTERVAL '4 days')::date, 'SBSP', 'SBSV', 1962.0,
     '09:00', '11:40', NULL, NULL, 'Vetor Participações', 'Horários realizados pendentes.'),
    ('RV-2026-043', 1, (NOW() - INTERVAL '2 days')::date, 'SBSP', 'SBJD', 58.0,
     '14:00', '14:25', '14:03', '14:27', NULL, 'Voo de translado para manutenção.')
) AS t (rel, num, data, orig, dest, km, dep_prev, arr_prev, dep_real, arr_real, dono, obs) ON TRUE
LEFT JOIN proprietario p ON p.nome = t.dono
WHERE a.matricula = 'PS-MEP';
