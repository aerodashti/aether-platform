package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Edição dos dados de identificação da ficha técnica. A matrícula não está aqui: é a identidade
 * pública da aeronave, e trocá-la é outro ato, com outra conversa.
 *
 * <p>Os pesos são inteiros (o Jackson recusa 5.67 em vez de truncar para 5) e têm o teto de
 * plausibilidade do produto: o maior avião em operação não chega a 600 toneladas.
 */
@Schema(description = "Dados de identificação da ficha técnica")
public record FichaTecnicaRequest(
    @Size(max = 80, message = "O fabricante pode ter no máximo 80 caracteres.") String fabricante,
    @NotBlank(message = "Informe o modelo.")
        @Size(max = 120, message = "O modelo pode ter no máximo 120 caracteres.")
        String modelo,
    @Size(max = 40, message = "O número de série pode ter no máximo 40 caracteres.")
        String numeroDeSerie,
    @NotBlank(message = "Informe a base.")
        @Pattern(
            regexp = "[A-Za-z]{4}",
            message = "A base é um código ICAO de quatro letras, como SBSP.")
        String base,
    @Size(max = 60, message = "O hangar pode ter no máximo 60 caracteres.") String hangar,
    @Size(max = 40, message = "A apólice pode ter no máximo 40 caracteres.") String apoliceDoSeguro,
    @Schema(description = "MTOW em kg inteiros, até 600.000")
        @Positive(message = "O peso máximo de decolagem precisa ser maior que zero.")
        @Max(
            value = FichaTecnica.PESO_MAXIMO_KG,
            message = "O peso máximo de decolagem vai até 600.000 kg.")
        Integer pesoMaxDecolagemKg,
    @Schema(description = "MLW em kg inteiros, até 600.000 e nunca acima do MTOW")
        @Positive(message = "O peso máximo de pouso precisa ser maior que zero.")
        @Max(
            value = FichaTecnica.PESO_MAXIMO_KG,
            message = "O peso máximo de pouso vai até 600.000 kg.")
        Integer pesoMaxPousoKg) {}
