package br.com.aerodash.aether.participacao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/** O contrato novo por inteiro: quem fica de fora da lista sai do contrato. */
@Schema(description = "Definição de um novo contrato de participação")
public record DefinirContratoRequest(
    @NotEmpty(message = "O contrato precisa de ao menos um proprietário.") @Valid
        List<ParticipacaoRequest> participacoes) {

  @Schema(description = "A fatia de um proprietário")
  public record ParticipacaoRequest(
      @NotNull(message = "Informe o proprietário.") Long proprietarioId,
      @NotNull(message = "Informe o percentual.")
          @DecimalMin(
              value = "0.01",
              message = "Todo proprietário precisa de participação maior que zero.")
          @Digits(
              integer = 3,
              fraction = 2,
              message = "O percentual usa no máximo duas casas decimais.")
          BigDecimal percentual) {}
}
