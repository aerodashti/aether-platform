package br.com.aerodash.aether.custo;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Os campos editáveis do lançamento, juntos. O tipo não está aqui: ele é consequência da categoria,
 * nunca escolha independente.
 */
public record DadosDoCusto(
    CategoriaDeCusto categoria,
    LocalDate data,
    String descricao,
    String relatorioDeVoo,
    Long proprietarioId,
    String notaFiscal,
    MoedaDoCusto moeda,
    BigDecimal valor,
    BigDecimal cambio) {}
