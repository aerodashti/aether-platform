package br.com.aerodash.aether.aporte;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Os campos editáveis do rendimento, juntos. */
public record DadosDoRendimento(
    LocalDate data,
    String aplicacao,
    BigDecimal saldoAplicado,
    BigDecimal taxa,
    BigDecimal valor) {}
