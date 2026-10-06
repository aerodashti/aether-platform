package br.com.aerodash.aether.troca;

import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Uma troca, com aeronave e proprietários resolvidos no servidor. */
@Schema(description = "Troca de KM")
public record TrocaResponse(
    Long id,
    Long aeronaveId,
    String matricula,
    String modelo,
    LocalDate data,
    Long cedenteId,
    String nomeDoCedente,
    CorDeIdentificacao corDoCedente,
    Long recebedorId,
    String nomeDoRecebedor,
    CorDeIdentificacao corDoRecebedor,
    BigDecimal horas,
    BigDecimal km,
    BigDecimal valorPorHora,
    @Schema(description = "Horas × R$/hora; nulo sem valor combinado") BigDecimal valorTotal,
    String relatorioDeVoo,
    String observacao,
    SituacaoDaTroca situacao,
    @Schema(description = "Data da devolução; nula enquanto pendente") LocalDate concluidaEm) {}
