package br.com.aerodash.aether.voo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

/** Os campos editáveis do trecho, juntos: lançamento e correção carregam o mesmo bloco. */
public record DadosDoTrecho(
    String relatorioDeVoo,
    int numeroDoTrecho,
    LocalDate data,
    String origem,
    String destino,
    BigDecimal km,
    LocalTime partidaPrevista,
    LocalTime pousoPrevisto,
    LocalTime partidaRealizada,
    LocalTime pousoRealizado,
    Long proprietarioId,
    String observacoes) {}
