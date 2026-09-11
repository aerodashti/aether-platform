package br.com.aerodash.aether.manutencao;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Um parâmetro já julgado: o valor atual, o quanto falta e a situação saem do servidor — dois fusos
 * lendo a mesma tela não podem discordar sobre o que está próximo do limite.
 */
@Schema(description = "Parâmetro de controle, julgado")
public record ParametroResponse(
    Long id,
    Long aeronaveId,
    String nome,
    TipoDeParametro tipo,
    BigDecimal limite,
    LocalDate dataLimite,
    BigDecimal aviso,
    @Schema(description = "Horas de célula, ciclos ou o dia de hoje, conforme o tipo")
        BigDecimal atual,
    @Schema(description = "Quanto falta na unidade do tipo; negativo é estouro")
        BigDecimal restante,
    SituacaoDoParametro situacao) {}
