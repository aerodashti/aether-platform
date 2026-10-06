package br.com.aerodash.aether.fechamento;

import br.com.aerodash.aether.aeronave.BaseDoRateio;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Stream;

/**
 * O rateio de uma aeronave, competência a competência, desde o primeiro movimento.
 *
 * <p>As regras, na ordem em que valem para cada custo:
 *
 * <ol>
 *   <li>atribuído a um proprietário no lançamento → inteiro para ele;
 *   <li>fixo → pelo % de propriedade do contrato vigente na data do custo;
 *   <li>variável com Rel. Voo → pelas horas de cada proprietário naquele voo;
 *   <li>variável, base por uso, com horas no mês → pelas horas de cada um no mês;
 *   <li>senão → pelo % de propriedade.
 * </ol>
 *
 * <p>Rendimentos e o saldo de abertura vão pelo % de propriedade. Voo de manutenção não é uso de
 * ninguém: conta nas horas da aeronave, não nas de um proprietário. É uma classe sem estado de
 * banco: entra a história da aeronave, sai a apuração — e é testada assim.
 */
final class CalculadoraDoFechamento {

  private final MovimentosDaAeronave movimentos;

  CalculadoraDoFechamento(MovimentosDaAeronave movimentos) {
    this.movimentos = movimentos;
  }

  /** Todas as competências, da primeira com movimento até {@code ate}, com o saldo acumulado. */
  List<ApuracaoDaCompetencia> apurarAte(YearMonth ate) {
    YearMonth inicio = primeiraCompetencia().filter(primeira -> primeira.isBefore(ate)).orElse(ate);
    Map<Long, BigDecimal> saldos = new HashMap<>(abertura());
    BigDecimal saldoDoFundo = movimentos.saldoDeAbertura();
    List<ApuracaoDaCompetencia> apuracoes = new ArrayList<>();
    for (YearMonth mes = inicio; !mes.isAfter(ate); mes = mes.plusMonths(1)) {
      ApuracaoDaCompetencia apuracao = apurar(mes, saldos, saldoDoFundo);
      apuracao.contas().forEach((id, conta) -> saldos.put(id, conta.saldoFinal()));
      saldoDoFundo = apuracao.saldoFinalDoFundo();
      apuracoes.add(apuracao);
    }
    return apuracoes;
  }

  private ApuracaoDaCompetencia apurar(
      YearMonth mes, Map<Long, BigDecimal> saldos, BigDecimal saldoInicialDoFundo) {
    Map<Long, ContaDoProprietario> contas = new TreeMap<>();
    percentuaisEm(mes.atEndOfMonth())
        .forEach((id, pct) -> conta(contas, id).definirPercentual(pct));
    saldos.forEach((id, saldo) -> conta(contas, id).definirSaldoAnterior(saldo));

    Map<Long, BigDecimal> horasPorDono = new HashMap<>();
    BigDecimal horas = somarHoras(mes, contas, horasPorDono);
    Custos custos = somarCustos(mes, contas, horasPorDono);
    BigDecimal aportes = somarAportes(mes, contas);
    BigDecimal rendimentos = somarRendimentos(mes, contas);

    contas.values().removeIf(ContaDoProprietario::estaVazia);
    return new ApuracaoDaCompetencia(
        mes,
        horas,
        custos.fixos,
        custos.variaveis,
        aportes,
        rendimentos,
        custos.naoRateado,
        saldoInicialDoFundo,
        contas,
        custos.criterios);
  }

  /** Os totais de custo do mês, acumulados enquanto cada um é rateado. */
  private static final class Custos {
    private BigDecimal fixos = BigDecimal.ZERO;
    private BigDecimal variaveis = BigDecimal.ZERO;
    private BigDecimal naoRateado = BigDecimal.ZERO;
    private final Map<CriterioDeRateio, Integer> criterios = new EnumMap<>(CriterioDeRateio.class);
  }

  private BigDecimal somarHoras(
      YearMonth mes, Map<Long, ContaDoProprietario> contas, Map<Long, BigDecimal> horasPorDono) {
    BigDecimal horas = BigDecimal.ZERO;
    for (MovimentosDaAeronave.Horas trecho :
        doMes(movimentos.horas(), mes, MovimentosDaAeronave.Horas::data)) {
      horas = horas.add(trecho.horas());
      if (trecho.proprietarioId() != null) {
        conta(contas, trecho.proprietarioId()).somarHoras(trecho.horas());
        horasPorDono.merge(trecho.proprietarioId(), trecho.horas(), BigDecimal::add);
      }
    }
    horasPorDono.values().removeIf(valor -> valor.signum() <= 0);
    return horas;
  }

  private Custos somarCustos(
      YearMonth mes, Map<Long, ContaDoProprietario> contas, Map<Long, BigDecimal> horasPorDono) {
    Custos custos = new Custos();
    for (MovimentosDaAeronave.Custo custo :
        doMes(movimentos.custos(), mes, MovimentosDaAeronave.Custo::data)) {
      if (custo.fixo()) {
        custos.fixos = custos.fixos.add(custo.valor());
      } else {
        custos.variaveis = custos.variaveis.add(custo.valor());
      }
      CriterioDeRateio criterio = ratear(custo, horasPorDono, contas);
      custos.criterios.merge(criterio, 1, Integer::sum);
      if (criterio == CriterioDeRateio.SEM_CONTRATO) {
        custos.naoRateado = custos.naoRateado.add(custo.valor());
      }
    }
    return custos;
  }

  private BigDecimal somarAportes(YearMonth mes, Map<Long, ContaDoProprietario> contas) {
    BigDecimal aportes = BigDecimal.ZERO;
    for (MovimentosDaAeronave.Aporte aporte : movimentos.aportes()) {
      if (aporte.competencia().equals(mes)) {
        aportes = aportes.add(aporte.valor());
        conta(contas, aporte.proprietarioId()).somarAporte(aporte.valor());
      }
    }
    return aportes;
  }

  private BigDecimal somarRendimentos(YearMonth mes, Map<Long, ContaDoProprietario> contas) {
    BigDecimal rendimentos = BigDecimal.ZERO;
    for (MovimentosDaAeronave.Rendimento rendimento :
        doMes(movimentos.rendimentos(), mes, MovimentosDaAeronave.Rendimento::data)) {
      rendimentos = rendimentos.add(rendimento.valor());
      Reparticao.repartir(rendimento.valor(), percentuaisEm(rendimento.data()))
          .forEach((id, parte) -> conta(contas, id).somarRendimento(parte));
    }
    return rendimentos;
  }

  /** Aplica as regras da classe a um custo e devolve qual delas valeu. */
  private CriterioDeRateio ratear(
      MovimentosDaAeronave.Custo custo,
      Map<Long, BigDecimal> horasDoMes,
      Map<Long, ContaDoProprietario> contas) {
    if (custo.proprietarioId() != null) {
      conta(contas, custo.proprietarioId()).somarCusto(custo.fixo(), custo.valor());
      return CriterioDeRateio.DIRETO;
    }
    CriterioDeRateio criterio = CriterioDeRateio.PROPRIEDADE;
    Map<Long, BigDecimal> pesos = Map.of();
    if (!custo.fixo()) {
      Map<Long, BigDecimal> doVoo = horasDoVoo(custo.relatorioDeVoo());
      if (!doVoo.isEmpty()) {
        criterio = CriterioDeRateio.VOO;
        pesos = doVoo;
      } else if (movimentos.baseDoRateio() == BaseDoRateio.POR_USO && !horasDoMes.isEmpty()) {
        criterio = CriterioDeRateio.USO;
        pesos = horasDoMes;
      }
    }
    if (pesos.isEmpty()) {
      pesos = percentuaisEm(custo.data());
    }
    if (pesos.isEmpty()) {
      return CriterioDeRateio.SEM_CONTRATO;
    }
    Reparticao.repartir(custo.valor(), pesos)
        .forEach((id, parte) -> conta(contas, id).somarCusto(custo.fixo(), parte));
    return criterio;
  }

  private Map<Long, BigDecimal> horasDoVoo(String relatorioDeVoo) {
    Map<Long, BigDecimal> horas = new HashMap<>();
    if (relatorioDeVoo == null) {
      return horas;
    }
    for (MovimentosDaAeronave.Horas trecho : movimentos.horas()) {
      if (relatorioDeVoo.equals(trecho.relatorioDeVoo()) && trecho.proprietarioId() != null) {
        horas.merge(trecho.proprietarioId(), trecho.horas(), BigDecimal::add);
      }
    }
    horas.values().removeIf(valor -> valor.signum() <= 0);
    return horas;
  }

  /**
   * Os percentuais do contrato vigente no fim do dia. Antes do primeiro contrato vale o primeiro;
   * sem contrato nenhum, não há com que ratear.
   */
  private Map<Long, BigDecimal> percentuaisEm(LocalDate data) {
    List<QuadroDeParticipacao> quadros = movimentos.quadros();
    if (quadros.isEmpty()) {
      return Map.of();
    }
    Instant fimDoDia = data.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant().minusNanos(1);
    return quadros.stream()
        .filter(quadro -> quadro.vigenteEm(fimDoDia))
        .findFirst()
        .orElse(
            fimDoDia.isBefore(quadros.get(0).inicio())
                ? quadros.get(0)
                : quadros.get(quadros.size() - 1))
        .percentuais();
  }

  private Map<Long, BigDecimal> abertura() {
    if (movimentos.quadros().isEmpty()) {
      return Map.of();
    }
    return Reparticao.repartir(
        movimentos.saldoDeAbertura(), movimentos.quadros().get(0).percentuais());
  }

  private java.util.Optional<YearMonth> primeiraCompetencia() {
    return Stream.of(
            movimentos.custos().stream().map(custo -> YearMonth.from(custo.data())),
            movimentos.horas().stream().map(trecho -> YearMonth.from(trecho.data())),
            movimentos.aportes().stream().map(MovimentosDaAeronave.Aporte::competencia),
            movimentos.rendimentos().stream().map(r -> YearMonth.from(r.data())))
        .flatMap(competencias -> competencias)
        .filter(Objects::nonNull)
        .min(YearMonth::compareTo);
  }

  private static <T> List<T> doMes(
      List<T> itens, YearMonth mes, java.util.function.Function<T, LocalDate> data) {
    return itens.stream().filter(item -> YearMonth.from(data.apply(item)).equals(mes)).toList();
  }

  private static ContaDoProprietario conta(Map<Long, ContaDoProprietario> contas, Long id) {
    return contas.computeIfAbsent(id, chave -> new ContaDoProprietario());
  }
}
