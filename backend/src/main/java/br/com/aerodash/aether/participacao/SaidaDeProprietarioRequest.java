package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.participacao.DefinirContratoRequest.ParticipacaoRequest;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * A saída de um proprietário: o contrato novo de cada aeronave em que ele participa, já sem ele. O
 * percentual liberado vai para os demais, ou para quem entra no lugar.
 */
@Schema(description = "Contratos que redistribuem a participação de quem sai")
public record SaidaDeProprietarioRequest(
    @NotNull(message = "Informe os contratos novos.")
        List<@NotNull(message = "Informe o contrato novo.") @Valid ContratoNovo> contratos) {

  @Schema(description = "O contrato novo de uma aeronave")
  public record ContratoNovo(
      @NotNull(message = "Informe a aeronave.") Long aeronaveId,
      @Schema(
              description =
                  "O contrato vigente que o painel tinha à vista. Se o vigente mudou desde então,"
                      + " a resposta é 409.",
              example = "10")
          @NotNull(message = "Informe o contrato vigente em que a saída se baseou.")
          Long contratoVigenteId,
      @NotEmpty(message = "O contrato precisa de ao menos um proprietário.")
          List<@NotNull(message = "Informe a participação.") @Valid ParticipacaoRequest>
              participacoes) {}
}
