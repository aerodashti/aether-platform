package br.com.aerodash.aether.troca;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Os campos editáveis da troca, juntos. */
public record DadosDaTroca(
    LocalDate data,
    Long cedenteId,
    Long recebedorId,
    BigDecimal horas,
    BigDecimal km,
    BigDecimal valorPorHora,
    String relatorioDeVoo,
    String observacao) {}
