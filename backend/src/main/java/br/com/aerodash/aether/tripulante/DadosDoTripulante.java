package br.com.aerodash.aether.tripulante;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Os campos editáveis do tripulante, juntos: cadastro e atualização carregam o mesmo bloco. */
public record DadosDoTripulante(
    String nome,
    String canac,
    FuncaoDoTripulante funcao,
    LocalDate validadeCma,
    LocalDate validadeCht,
    BigDecimal horasTotais,
    String telefone,
    String email,
    SituacaoDoTripulante situacao) {}
