-- O que faltava da ficha para o cadastro completo da tela "Nova aeronave": os pesos máximos
-- estruturais e o terceiro motor (trimotores existem — Falcon 900 — e helicóptero também conta
-- por motor).

ALTER TABLE aeronave
    ADD COLUMN peso_max_decolagem_kg INTEGER,
    ADD COLUMN peso_max_pouso_kg     INTEGER,
    ADD COLUMN horas_motor_3         NUMERIC(10,1);

ALTER TABLE aeronave
    ADD CONSTRAINT aeronave_pesos_positivos
        CHECK (
            (peso_max_decolagem_kg IS NULL OR peso_max_decolagem_kg > 0)
            AND (peso_max_pouso_kg IS NULL OR peso_max_pouso_kg > 0)
        );

COMMENT ON COLUMN aeronave.peso_max_decolagem_kg IS 'MTOW em kg, do certificado. Nulo = não informado.';
COMMENT ON COLUMN aeronave.peso_max_pouso_kg IS 'MLW em kg, do certificado. Nulo = não informado.';
