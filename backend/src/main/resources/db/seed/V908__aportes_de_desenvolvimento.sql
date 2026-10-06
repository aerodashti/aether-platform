-- Aportes e rendimentos de desenvolvimento: três competências da PS-MEP, com o aporte do mês
-- caindo no começo do mês seguinte, e o rendimento mensal da aplicação do fundo.

INSERT INTO aporte (aeronave_id, proprietario_id, data, competencia, valor, criado_em, atualizado_em)
SELECT a.id, p.id,
       (date_trunc('month', NOW()) - make_interval(months => v.meses_atras - 1) + INTERVAL '4 days')::date,
       (date_trunc('month', NOW()) - make_interval(months => v.meses_atras))::date,
       v.valor, NOW(), NOW()
FROM aeronave a
JOIN (VALUES
    ('Ricardo Meirelles', 3, 25000.00),
    ('Vetor Participações', 3, 15000.00),
    ('Helena Sarraf', 3, 10000.00),
    ('Ricardo Meirelles', 2, 25000.00),
    ('Vetor Participações', 2, 15000.00),
    ('Helena Sarraf', 2, 10000.00),
    ('Ricardo Meirelles', 1, 25000.00),
    ('Vetor Participações', 1, 15000.00)
) AS v (nome, meses_atras, valor) ON TRUE
JOIN proprietario p ON p.nome = v.nome
WHERE a.matricula = 'PS-MEP';

INSERT INTO rendimento (aeronave_id, data, aplicacao, saldo_aplicado, taxa, valor, criado_em, atualizado_em)
SELECT a.id,
       (date_trunc('month', NOW()) - make_interval(months => v.meses_atras) + INTERVAL '27 days')::date,
       'CDB DI', v.saldo, v.taxa, v.valor, NOW(), NOW()
FROM aeronave a
JOIN (VALUES
    (3, 82000.00, 0.8900, 729.80),
    (2, 96500.00, 0.8700, 839.55),
    (1, 104200.00, 0.9100, 948.22)
) AS v (meses_atras, saldo, taxa, valor) ON TRUE
WHERE a.matricula = 'PS-MEP';
