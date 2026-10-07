package br.com.aerodash.aether.participacao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * A saída de um proprietário: o contrato novo de cada aeronave em que ele participa, já sem ele. O
 * percentual liberado vai para os demais, ou para quem entra no lugar.
 */
@Schema(description = "Contratos que redistribuem a participação de quem sai")
public record SaidaDeProprietarioRequest(
    @NotNull(message = "Informe os contratos novos.") @Valid List<ContratoNovo> contratos) {

  @Schema(description = "O contrato novo de uma aeronave")
  public record ContratoNovo(
      @NotNull(message = "Informe a aeronave.") Long aeronaveId,
      @NotNull(message = "Informe as participações.") @Valid
          List<DefinirContratoRequest.ParticipacaoRequest> participacoes) {}
}
