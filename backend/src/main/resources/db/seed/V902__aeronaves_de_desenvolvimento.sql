-- Frota de desenvolvimento. Como o seed de usuários, esta pasta não entra em produção.
--
-- As datas são relativas a NOW() para que os três estados da coluna Status existam sempre, sem
-- ninguém precisar editar o banco: uma aeronave saudável, uma em atenção (vence dentro de 30
-- dias) e uma com documento vencido.

INSERT INTO aeronave (matricula, modelo, base, vencimento_cva, vencimento_reta, criado_em, atualizado_em) VALUES
    -- Saudável: os dois documentos longe do vencimento.
    ('PS-MEP', 'Cessna Citation XLS+', 'SBSP',
     (NOW() + INTERVAL '8 months')::date, (NOW() + INTERVAL '10 months')::date, NOW(), NOW()),
    ('PR-KRT', 'Embraer Phenom 300E', 'SBJD',
     (NOW() + INTERVAL '6 months')::date, (NOW() + INTERVAL '7 months')::date, NOW(), NOW()),
    -- Atenção: a RETA vence dentro da janela de 30 dias.
    ('PT-XLB', 'Leonardo AW109 GrandNew', 'SBBH',
     (NOW() + INTERVAL '5 months')::date, (NOW() + INTERVAL '12 days')::date, NOW(), NOW()),
    -- Vencido: o CVA já passou. A aeronave não pode voar.
    ('PP-JHF', 'Pilatus PC-12 NGX', 'SBPS',
     (NOW() - INTERVAL '3 days')::date, (NOW() + INTERVAL '4 months')::date, NOW(), NOW());
