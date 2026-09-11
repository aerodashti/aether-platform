-- Manutenção de desenvolvimento na PS-MEP: parâmetros nos três estados (em dia, em atenção e
-- estourado — os contadores do V904 têm 3.412,5 h e 2.890 ciclos) e eventos programados e
-- concluídos.

INSERT INTO parametro_de_controle (aeronave_id, nome, tipo, limite, data_limite, aviso, criado_em, atualizado_em)
SELECT a.id, p.nome, p.tipo, p.limite, p.data_limite, p.aviso, NOW(), NOW()
FROM aeronave a
JOIN (VALUES
    -- Em dia: faltam 587,5 h para o limite, aviso a 100 h.
    ('Inspeção de célula — 4.000 h', 'HORAS', 4000.0, NULL::date, 100.0),
    -- Em atenção: faltam 110 ciclos, aviso a 200.
    ('Trem de pouso — overhaul 3.000 ciclos', 'CICLOS', 3000.0, NULL, 200.0),
    -- Estourado: a data ficou para trás.
    ('Pesagem regulamentar', 'DATA', NULL, (NOW() - INTERVAL '20 days')::date, 30.0)
) AS p (nome, tipo, limite, data_limite, aviso) ON TRUE
WHERE a.matricula = 'PS-MEP';

INSERT INTO manutencao (aeronave_id, data, hora, responsavel, descricao, valor, status, criado_em, atualizado_em)
SELECT a.id, m.data, m.hora::time, m.resp, m.descricao, m.valor, m.status, NOW(), NOW()
FROM aeronave a
JOIN (VALUES
    ((NOW() + INTERVAL '12 days')::date, '09:00', 'Hangar Líder — SBSP',
     'Inspeção de 100 h — célula', 48000.00, 'PROGRAMADA'),
    ((NOW() + INTERVAL '30 days')::date, NULL, 'TAP M&E',
     'Boletim de serviço — trem de pouso', NULL, 'PROGRAMADA'),
    ((NOW() - INTERVAL '45 days')::date, '08:00', 'Hangar Líder — SBSP',
     'Troca de pneus e freios', 36400.00, 'CONCLUIDA')
) AS m (data, hora, resp, descricao, valor, status) ON TRUE
WHERE a.matricula = 'PS-MEP';
