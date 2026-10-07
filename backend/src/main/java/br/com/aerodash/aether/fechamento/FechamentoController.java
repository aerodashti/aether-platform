package br.com.aerodash.aether.fechamento;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.YearMonth;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * O fechamento é só leitura: calculado a cada pedido a partir de custos, voos, aportes e contratos.
 * Ler é de quem tem sessão — o proprietário vê o próprio saldo.
 */
@RestController
@RequestMapping("/fechamentos")
@Tag(name = "Fechamento", description = "Rateio por competência e saldo de cada proprietário")
public class FechamentoController {

  private final FechamentoService fechamentos;
  private final ResumoDaFrotaService frota;

  public FechamentoController(FechamentoService fechamentos, ResumoDaFrotaService frota) {
    this.fechamentos = fechamentos;
    this.frota = frota;
  }

  @GetMapping("/frota")
  @Operation(summary = "Resumo de cada aeronave numa competência, para a Visão geral")
  public List<ResumoDaAeronaveResponse> frota(
      @RequestParam(name = "competencia", required = false) YearMonth competencia) {
    return frota.frota(competencia);
  }

  @GetMapping("/mensal")
  @Operation(summary = "O rateio de uma competência, uma linha por proprietário")
  public FechamentoMensalResponse mensal(
      @RequestParam(name = "aeronave") Long aeronaveId,
      @RequestParam(name = "competencia") YearMonth competencia) {
    return fechamentos.mensal(aeronaveId, competencia);
  }

  @GetMapping("/periodo")
  @Operation(summary = "Uma linha por competência do período, com o saldo do fundo de cada uma")
  public FechamentoDoPeriodoResponse periodo(
      @RequestParam(name = "aeronave") Long aeronaveId,
      @RequestParam(name = "de") YearMonth de,
      @RequestParam(name = "ate") YearMonth ate) {
    return fechamentos.periodo(aeronaveId, de, ate);
  }

  @GetMapping("/saldos")
  @Operation(summary = "O saldo do fundo de cada aeronave e de cada proprietário, hoje")
  public List<SaldoDaAeronaveResponse> saldos() {
    return fechamentos.saldos();
  }
}
