package br.com.aerodash.aether.fechamento;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.fechamento.FechamentoDoPeriodoResponse.Competencia;
import br.com.aerodash.aether.fechamento.FechamentoMensalResponse.Indicadores;
import br.com.aerodash.aether.fechamento.FechamentoMensalResponse.LinhaDoProprietario;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * O fechamento: o rateio de cada competência e o saldo de cada proprietário no fundo. É calculado a
 * cada leitura, nunca gravado — muda um lançamento antigo, muda o saldo de hoje (ADR-0019).
 */
@Service
public class FechamentoService {

  /** Dez anos de uma vez é o teto: além disso o pedido é engano, não análise. */
  private static final long MESES_NO_PERIODO = 120;

  private final AeronaveRepository aeronaves;
  private final ProprietarioRepository proprietarios;
  private final LeitorDeMovimentos leitor;
  private final ContextoDaRequisicao contexto;

  public FechamentoService(
      AeronaveRepository aeronaves,
      ProprietarioRepository proprietarios,
      LeitorDeMovimentos leitor,
      ContextoDaRequisicao contexto) {
    this.aeronaves = aeronaves;
    this.proprietarios = proprietarios;
    this.leitor = leitor;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public FechamentoMensalResponse mensal(Long aeronaveId, YearMonth competencia) {
    Aeronave aeronave = exigirAeronave(aeronaveId);
    List<ApuracaoDaCompetencia> apuracoes = apurarAte(aeronave, competencia);
    ApuracaoDaCompetencia mes = apuracoes.get(apuracoes.size() - 1);
    contexto.registrar("fechamento.competencias", apuracoes.size());
    mes.criterios()
        .forEach((criterio, vezes) -> contexto.registrar("fechamento.rateio." + criterio, vezes));
    contexto.decisao("fechamento.haCustoSemContrato", mes.naoRateado().signum() != 0);

    List<LinhaDoProprietario> linhas = linhasDe(mes);
    return new FechamentoMensalResponse(
        aeronave.getId(),
        aeronave.getMatricula(),
        competencia,
        aeronave.getConfiguracaoFinanceira().baseDoRateio(),
        aeronave.getConfiguracaoFinanceira().modeloDeAporte(),
        new Indicadores(
            mes.horas(),
            mes.custosFixos(),
            mes.custosVariaveis(),
            mes.totalDeCustos(),
            mes.aportes(),
            mes.rendimentos(),
            mes.resultado()),
        linhas,
        somar(linhas),
        mes.naoRateado(),
        mes.saldoInicialDoFundo(),
        mes.saldoFinalDoFundo());
  }

  @Transactional(readOnly = true)
  public FechamentoDoPeriodoResponse periodo(Long aeronaveId, YearMonth de, YearMonth ate) {
    boolean invertido = de.isAfter(ate);
    contexto.decisao("fechamento.periodoInvertido", invertido);
    if (invertido) {
      throw new FechamentoInvalidoException("A competência inicial vem depois da final.");
    }
    boolean longoDemais = ChronoUnit.MONTHS.between(de, ate) >= MESES_NO_PERIODO;
    contexto.decisao("fechamento.periodoLongoDemais", longoDemais);
    if (longoDemais) {
      throw new FechamentoInvalidoException("O período vai até dez anos.");
    }
    Aeronave aeronave = exigirAeronave(aeronaveId);
    List<Competencia> competencias =
        apurarAte(aeronave, ate).stream()
            .filter(apuracao -> !apuracao.competencia().isBefore(de))
            .map(FechamentoService::resumo)
            .toList();
    contexto.registrar("fechamento.competencias", competencias.size());
    return new FechamentoDoPeriodoResponse(
        aeronave.getId(),
        aeronave.getMatricula(),
        de,
        ate,
        competencias,
        totais(competencias, ate));
  }

  private List<ApuracaoDaCompetencia> apurarAte(Aeronave aeronave, YearMonth ate) {
    return new CalculadoraDoFechamento(leitor.ler(aeronave)).apurarAte(ate);
  }

  private Aeronave exigirAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    return aeronaves
        .findById(aeronaveId)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Aeronave não encontrada."));
  }

  private List<LinhaDoProprietario> linhasDe(ApuracaoDaCompetencia mes) {
    Map<Long, Proprietario> donos =
        proprietarios.findAllById(mes.contas().keySet()).stream()
            .collect(Collectors.toMap(Proprietario::getId, Function.identity()));
    BigDecimal horasAtribuidas =
        mes.contas().values().stream()
            .map(ContaDoProprietario::horas)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    return mes.contas().entrySet().stream()
        .map(
            entrada -> {
              ContaDoProprietario conta = entrada.getValue();
              Proprietario dono = donos.get(entrada.getKey());
              return new LinhaDoProprietario(
                  entrada.getKey(),
                  dono == null ? null : dono.getNome(),
                  dono == null ? null : dono.getCorDeIdentificacao(),
                  conta.percentual(),
                  conta.horas(),
                  percentualDe(conta.horas(), horasAtribuidas),
                  conta.custoFixo(),
                  conta.custoVariavel(),
                  conta.totalDoMes(),
                  conta.aportes(),
                  conta.rendimentos(),
                  conta.saldoAnterior(),
                  conta.saldoFinal());
            })
        .sorted((a, b) -> b.percentual().compareTo(a.percentual()))
        .toList();
  }

  private static BigDecimal percentualDe(BigDecimal parte, BigDecimal todo) {
    return todo.signum() == 0
        ? BigDecimal.ZERO
        : parte.multiply(BigDecimal.valueOf(100)).divide(todo, 2, RoundingMode.HALF_UP);
  }

  private static LinhaDoProprietario somar(List<LinhaDoProprietario> linhas) {
    Function<Function<LinhaDoProprietario, BigDecimal>, BigDecimal> soma =
        campo -> linhas.stream().map(campo).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new LinhaDoProprietario(
        null,
        null,
        null,
        soma.apply(LinhaDoProprietario::percentual),
        soma.apply(LinhaDoProprietario::horas),
        soma.apply(LinhaDoProprietario::percentualDeUso),
        soma.apply(LinhaDoProprietario::custoFixo),
        soma.apply(LinhaDoProprietario::custoVariavel),
        soma.apply(LinhaDoProprietario::totalDoMes),
        soma.apply(LinhaDoProprietario::aportes),
        soma.apply(LinhaDoProprietario::rendimentos),
        soma.apply(LinhaDoProprietario::saldoAnterior),
        soma.apply(LinhaDoProprietario::saldoAcumulado));
  }

  private static Competencia resumo(ApuracaoDaCompetencia apuracao) {
    return new Competencia(
        apuracao.competencia(),
        apuracao.horas(),
        apuracao.custosFixos(),
        apuracao.custosVariaveis(),
        apuracao.totalDeCustos(),
        apuracao.aportes(),
        apuracao.rendimentos(),
        apuracao.resultado(),
        apuracao.saldoFinalDoFundo());
  }

  private static Competencia totais(List<Competencia> competencias, YearMonth ate) {
    Function<Function<Competencia, BigDecimal>, BigDecimal> soma =
        campo -> competencias.stream().map(campo).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal saldoFinal =
        competencias.isEmpty()
            ? BigDecimal.ZERO
            : competencias.get(competencias.size() - 1).saldoFinal();
    return new Competencia(
        ate,
        soma.apply(Competencia::horas),
        soma.apply(Competencia::custosFixos),
        soma.apply(Competencia::custosVariaveis),
        soma.apply(Competencia::totalDeCustos),
        soma.apply(Competencia::aportes),
        soma.apply(Competencia::rendimentos),
        soma.apply(Competencia::resultado),
        saldoFinal);
  }
}
