-- A ficha técnica e a configuração financeira da aeronave, que a tela de Detalhe mostra e edita.
--
-- Os contadores (horas de célula, ciclos, motores, APU, km) entram como valores declarados no
-- cadastro: quando o diário de voos existir, é ele que vai alimentá-los — a coluna nasce agora
-- porque a ficha técnica precisa exibi-los, e o valor inicial vem de quem cadastra.
--
-- Os DEFAULTs existem para as linhas já cadastradas; o cadastro novo (tela "Nova aeronave")
-- sempre informa os valores.

ALTER TABLE aeronave
    ADD COLUMN fabricante                    VARCHAR(80),
    ADD COLUMN numero_de_serie               VARCHAR(40),
    ADD COLUMN hangar                        VARCHAR(60),
    -- Número da apólice do seguro. A vigência é o vencimento_reta que já existe: RETA é o seguro.
    ADD COLUMN apolice_do_seguro             VARCHAR(40),
    ADD COLUMN horas_de_celula               NUMERIC(10,1) NOT NULL DEFAULT 0,
    ADD COLUMN ciclos                        INTEGER       NOT NULL DEFAULT 0,
    ADD COLUMN km_voados                     NUMERIC(12,1) NOT NULL DEFAULT 0,
    -- Horas por motor. O segundo é nulo em monomotor; APU é nulo em quem não tem.
    ADD COLUMN horas_motor_1                 NUMERIC(10,1),
    ADD COLUMN horas_motor_2                 NUMERIC(10,1),
    ADD COLUMN horas_apu                     NUMERIC(10,1),
    ADD COLUMN base_do_rateio                VARCHAR(20)   NOT NULL DEFAULT 'POR_USO',
    ADD COLUMN modelo_de_aporte              VARCHAR(20)   NOT NULL DEFAULT 'FIXO',
    ADD COLUMN periodicidade_do_aporte_meses INTEGER       NOT NULL DEFAULT 1,
    ADD COLUMN valor_do_aporte               NUMERIC(14,2),
    -- Até 28 para existir em todo mês: fevereiro decide o teto.
    ADD COLUMN dia_de_fechamento             INTEGER       NOT NULL DEFAULT 1;

ALTER TABLE aeronave
    ADD CONSTRAINT aeronave_base_do_rateio_valida
        CHECK (base_do_rateio IN ('POR_USO', 'POR_PROPRIEDADE')),
    ADD CONSTRAINT aeronave_modelo_de_aporte_valido
        CHECK (modelo_de_aporte IN ('FIXO', 'PROPORCIONAL_AO_USO')),
    ADD CONSTRAINT aeronave_periodicidade_valida
        CHECK (periodicidade_do_aporte_meses IN (1, 2, 3, 4, 6, 12)),
    ADD CONSTRAINT aeronave_dia_de_fechamento_valido
        CHECK (dia_de_fechamento BETWEEN 1 AND 28),
    ADD CONSTRAINT aeronave_contadores_nao_negativos
        CHECK (horas_de_celula >= 0 AND ciclos >= 0 AND km_voados >= 0);

COMMENT ON COLUMN aeronave.apolice_do_seguro IS 'Número da apólice; a vigência é vencimento_reta.';
COMMENT ON COLUMN aeronave.horas_de_celula IS 'Total acumulado da célula, declarado no cadastro até o diário de voos existir.';
COMMENT ON COLUMN aeronave.dia_de_fechamento IS 'Dia do mês em que a fatura fecha, de 1 a 28.';
