-- CNPJ alfanumérico (IN RFB 2.229/2024): desde julho de 2026 a Receita emite CNPJ com letras nos
-- 12 primeiros caracteres; os dois verificadores continuam números. Uma holding ou SPE inscrita
-- depois disso não cabia no CHECK de só dígitos da V6.
--
-- O documento segue gravado sem pontuação, agora em maiúsculas. O CPF não muda. A coluna já tem
-- os 14 caracteres que o CNPJ ocupa, com ou sem letras.

ALTER TABLE proprietario DROP CONSTRAINT proprietario_cpf_cnpj_valido;

ALTER TABLE proprietario ADD CONSTRAINT proprietario_cpf_cnpj_valido
    CHECK (cpf_cnpj IS NULL OR cpf_cnpj ~ '^[0-9]{11}$' OR cpf_cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$');

COMMENT ON COLUMN proprietario.cpf_cnpj IS
    'Sem pontuação: 11 dígitos para CPF; 14 caracteres para CNPJ, com letras maiúsculas só nos 12 primeiros. Opcional.';
