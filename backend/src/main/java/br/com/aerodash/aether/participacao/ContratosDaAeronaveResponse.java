package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * O contrato vigente e o histórico de uma aeronave. Cada participação já chega com nome e cor do
 * proprietário: a tela não deveria fazer N buscas para pintar uma lista.
 */
@Schema(description = "Contratos de participação de uma aeronave")
public record ContratosDaAeronaveResponse(
    @Schema(description = "O contrato em vigor, ou nulo se nenhum foi definido")
        ContratoResponse vigente,
    @Schema(description = "Contratos arquivados, do mais recente para o mais antigo")
        List<ContratoResponse> historico) {

  @Schema(description = "Um contrato de participação")
  public record ContratoResponse(
      Long id,
      Instant inicioDaVigencia,
      Instant fimDaVigencia,
      @Schema(description = "Quem salvou o contrato") String criadoPor,
      List<ParticipacaoResponse> participacoes) {}

  @Schema(description = "A fatia de um proprietário no contrato")
  public record ParticipacaoResponse(
      Long proprietarioId,
      String nome,
      CorDeIdentificacao corDeIdentificacao,
      @Schema(description = "Percentual de propriedade, duas casas", example = "33.34")
          BigDecimal percentual) {}
}
