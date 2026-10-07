package br.com.aerodash.aether.fechamento;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.aporte.JanelaDeCompetencias;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.YearMonth;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A frota inteira numa competência — o que a Visão geral compara. Uma apuração por aeronave, a
 * mesma do fechamento, e nenhum número novo gravado: tudo é derivado a cada leitura (ADR-0019).
 */
@Service
public class ResumoDaFrotaService {

  private final AeronaveRepository aeronaves;
  private final LeitorDeMovimentos leitor;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public ResumoDaFrotaService(
      AeronaveRepository aeronaves,
      LeitorDeMovimentos leitor,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.aeronaves = aeronaves;
    this.leitor = leitor;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  /** Sem competência, a corrente — a que a Visão geral abre. */
  @Transactional(readOnly = true)
  public List<ResumoDaAeronaveResponse> frota(YearMonth pedida) {
    YearMonth agora = YearMonth.now(relogio);
    JanelaDeCompetencias janela = JanelaDeCompetencias.aPartirDa(agora);
    boolean aceita = janela.aceita(pedida);
    contexto.decisao("frota.competenciaNaJanela", aceita);
    if (!aceita) {
      throw new FechamentoInvalidoException(janela.recusa(), "competencia");
    }
    boolean corrente = pedida == null;
    contexto.decisao("frota.competenciaCorrente", corrente);
    YearMonth competencia = corrente ? agora : pedida;
    List<ResumoDaAeronaveResponse> frota =
        aeronaves.findAllByOrderByMatriculaAsc().stream()
            .map(aeronave -> resumoDe(aeronave, competencia))
            .toList();
    contexto.registrar("frota.aeronaves", frota.size());
    contexto.registrar(
        "frota.semCobertura",
        frota.stream().filter(linha -> linha.coberturaEmMeses() == null).count());
    return frota;
  }

  private ResumoDaAeronaveResponse resumoDe(Aeronave aeronave, YearMonth competencia) {
    List<ApuracaoDaCompetencia> apuracoes =
        new CalculadoraDoFechamento(leitor.ler(aeronave)).apurarAte(competencia);
    ApuracaoDaCompetencia mes = apuracoes.get(apuracoes.size() - 1);
    List<BigDecimal> custosAnteriores =
        apuracoes.subList(0, apuracoes.size() - 1).stream()
            .map(ApuracaoDaCompetencia::totalDeCustos)
            .toList();
    return new ResumoDaAeronaveResponse(
        aeronave.getId(),
        aeronave.getMatricula(),
        competencia,
        mes.saldoFinalDoFundo(),
        mes.custosFixos(),
        mes.custosVariaveis(),
        mes.horas(),
        CoberturaDoFundo.emMeses(mes.saldoFinalDoFundo(), custosAnteriores).orElse(null));
  }
}
