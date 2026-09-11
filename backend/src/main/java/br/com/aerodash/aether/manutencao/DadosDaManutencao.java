package br.com.aerodash.aether.manutencao;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

/** Os campos editáveis do evento, juntos. O status muda por ação própria, nunca por edição. */
public record DadosDaManutencao(
    LocalDate data, LocalTime hora, String responsavel, String descricao, BigDecimal valor) {}
