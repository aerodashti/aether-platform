-- Lançamentos de desenvolvimento: a competência corrente da PS-MEP com fixos, variáveis, um
-- custo em USD com câmbio e um atribuído a um proprietário específico.

INSERT INTO custo (aeronave_id, tipo, categoria, data, descricao, relatorio_de_voo,
                   proprietario_id, nota_fiscal, moeda, valor_original, cambio, valor,
                   criado_em, atualizado_em)
SELECT a.id, c.tipo, c.categoria, c.data, c.descricao, c.rel, p.id, c.nf,
       c.moeda, c.valor_original, c.cambio, c.valor, NOW(), NOW()
FROM aeronave a
JOIN (VALUES
    ('FIXO', 'HANGARAGEM', (NOW() - INTERVAL '12 days')::date,
     'Hangaragem mensal — Congonhas', NULL, NULL, 'NF 4.410', 'BRL', NULL, NULL, 18400.00),
    ('FIXO', 'TAXA_DE_ADMINISTRACAO', (NOW() - INTERVAL '10 days')::date,
     'Fee mensal Aether', NULL, NULL, 'NF 1.208', 'BRL', NULL, NULL, 7560.00),
    ('FIXO', 'SEGURO', (NOW() - INTERVAL '8 days')::date,
     'Casco + RETA — parcela 01/12', NULL, NULL, 'AP 774.120', 'BRL', NULL, NULL, 4980.00),
    ('VARIAVEL', 'ABASTECIMENTO', (NOW() - INTERVAL '7 days')::date,
     'Jet A-1 — 1.850 L — SBRJ', 'RV-2026-041', 'Ricardo Meirelles', 'NF 88.213',
     'BRL', NULL, NULL, 15725.00),
    ('VARIAVEL', 'COORDENACAO_VOO_INTERNACIONAL', (NOW() - INTERVAL '4 days')::date,
     'Handling internacional — assistência', 'RV-2026-042', NULL, 'INV-88412',
     'USD', 1200.00, 4.9223, 5906.76)
) AS c (tipo, categoria, data, descricao, rel, dono, nf, moeda, valor_original, cambio, valor)
  ON TRUE
LEFT JOIN proprietario p ON p.nome = c.dono
WHERE a.matricula = 'PS-MEP';
