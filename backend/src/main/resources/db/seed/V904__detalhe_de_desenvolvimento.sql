-- O detalhe da aeronave em desenvolvimento: ficha técnica preenchida na PS-MEP, um contrato de
-- participação vigente com histórico e uma tripulação com os três estados de validade
-- (em dia, vencida e não informada).

UPDATE aeronave
SET fabricante        = 'Cessna',
    numero_de_serie   = '560-6321',
    hangar            = 'Hangar 7 — Congonhas',
    apolice_do_seguro = 'RETA-88412-7',
    horas_de_celula   = 3412.5,
    ciclos            = 2890,
    km_voados         = 1482300,
    horas_motor_1     = 3390.2,
    horas_motor_2     = 3388.7,
    horas_apu         = 1204.0,
    valor_do_aporte   = 85000.00,
    dia_de_fechamento = 5
WHERE matricula = 'PS-MEP';

-- Contrato arquivado: a foto anterior, com dois proprietários.
INSERT INTO contrato_de_participacao (aeronave_id, inicio_da_vigencia, fim_da_vigencia, criado_por)
SELECT a.id, NOW() - INTERVAL '18 months', NOW() - INTERVAL '2 months', 'Leonardo Andrade'
FROM aeronave a WHERE a.matricula = 'PS-MEP';

INSERT INTO participacao (contrato_id, proprietario_id, percentual)
SELECT c.id, p.id, v.percentual
FROM contrato_de_participacao c
JOIN aeronave a ON a.id = c.aeronave_id AND a.matricula = 'PS-MEP'
JOIN (VALUES ('Ricardo Meirelles', 60.00), ('Vetor Participações', 40.00)) AS v (nome, percentual)
  ON TRUE
JOIN proprietario p ON p.nome = v.nome
WHERE c.fim_da_vigencia IS NOT NULL;

-- Contrato vigente: entrou a Helena, redistribuindo.
INSERT INTO contrato_de_participacao (aeronave_id, inicio_da_vigencia, fim_da_vigencia, criado_por)
SELECT a.id, NOW() - INTERVAL '2 months', NULL, 'Leonardo Andrade'
FROM aeronave a WHERE a.matricula = 'PS-MEP';

INSERT INTO participacao (contrato_id, proprietario_id, percentual)
SELECT c.id, p.id, v.percentual
FROM contrato_de_participacao c
JOIN aeronave a ON a.id = c.aeronave_id AND a.matricula = 'PS-MEP'
JOIN (VALUES ('Ricardo Meirelles', 50.00), ('Vetor Participações', 30.00), ('Helena Sarraf', 20.00)) AS v (nome, percentual)
  ON TRUE
JOIN proprietario p ON p.nome = v.nome
WHERE c.fim_da_vigencia IS NULL;

-- Tripulação da PS-MEP: CMA em dia, CHT vencido e validades não informadas.
INSERT INTO tripulante (aeronave_id, nome, canac, funcao, validade_cma, validade_cht, horas_totais, telefone, email, situacao, criado_em, atualizado_em)
SELECT a.id, t.nome, t.canac, t.funcao, t.validade_cma, t.validade_cht, t.horas, t.fone, t.email, t.situacao, NOW(), NOW()
FROM aeronave a
JOIN (VALUES
    ('Marcos Vilela', '112233', 'COMANDANTE',
     (NOW() + INTERVAL '7 months')::date, (NOW() + INTERVAL '4 months')::date,
     8420.0, '+55 11 97777-0001', 'marcos.vilela@exemplo.com.br', 'ATIVO'),
    ('Juliana Prates', '445566', 'COPILOTO',
     (NOW() + INTERVAL '2 months')::date, (NOW() - INTERVAL '12 days')::date,
     3115.5, '+55 11 97777-0002', 'juliana.prates@exemplo.com.br', 'ATIVO'),
    ('Sérgio Tanaka', NULL, 'INSTRUTOR', NULL, NULL, NULL, NULL, NULL, 'INATIVO')
) AS t (nome, canac, funcao, validade_cma, validade_cht, horas, fone, email, situacao) ON TRUE
WHERE a.matricula = 'PS-MEP';
