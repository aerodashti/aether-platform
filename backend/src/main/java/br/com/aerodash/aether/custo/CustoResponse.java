package br.com.aerodash.aether.custo;

import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Uma linha dos lançamentos, com nome e cor da atribuição resolvidos no servidor. */
@Schema(description = "Lançamento de custo")
public record CustoResponse(
    Long id,
    Long aeronaveId,
    String matricula,
    TipoDeCusto tipo,
    CategoriaDeCusto categoria,
    LocalDate data,
    String descricao,
    String relatorioDeVoo,
    Long proprietarioId,
    @Schema(description = "Nome de quem paga; nulo quando rateado") String nomeDoProprietario,
    CorDeIdentificacao corDeIdentificacao,
    boolean rateado,
    String notaFiscal,
    MoedaDoCusto moeda,
    @Schema(description = "Valor original na moeda estrangeira; nulo em BRL")
        BigDecimal valorOriginal,
    BigDecimal cambio,
    @Schema(description = "Valor em BRL, o que o rateio consome") BigDecimal valor) {}
