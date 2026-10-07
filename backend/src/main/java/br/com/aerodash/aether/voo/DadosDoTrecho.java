package br.com.aerodash.aether.voo;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Os campos editáveis do trecho, juntos: lançamento e correção carregam o mesmo bloco. */
public record DadosDoTrecho(
    String relatorioDeVoo,
    int numeroDoTrecho,
    LocalDate data,
    String origem,
    String destino,
    BigDecimal km,
    Instant partidaPrevista,
    Instant pousoPrevisto,
    Instant partidaRealizada,
    Instant pousoRealizado,
    Long proprietarioId,
    String observacoes) {}
