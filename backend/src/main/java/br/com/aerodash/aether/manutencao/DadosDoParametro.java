package br.com.aerodash.aether.manutencao;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Os campos editáveis do parâmetro, juntos. */
public record DadosDoParametro(
    String nome, TipoDeParametro tipo, BigDecimal limite, LocalDate dataLimite, BigDecimal aviso) {}
