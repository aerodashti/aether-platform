package br.com.aerodash.aether.aviso;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.aeronave.PoliticaDeVencimento;
import br.com.aerodash.aether.fechamento.FechamentoService;
import br.com.aerodash.aether.fechamento.SaldoDaAeronaveResponse;
import br.com.aerodash.aether.manutencao.Manutencao;
import br.com.aerodash.aether.manutencao.ManutencaoRepository;
import br.com.aerodash.aether.manutencao.ParametroDeControle;
import br.com.aerodash.aether.manutencao.ParametroDeControleRepository;
import br.com.aerodash.aether.manutencao.SituacaoDoParametro;
import br.com.aerodash.aether.manutencao.StatusDaManutencao;
import br.com.aerodash.aether.manutencao.TipoDeParametro;
import br.com.aerodash.aether.tripulante.Tripulante;
import br.com.aerodash.aether.tripulante.TripulanteRepository;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Deriva os avisos da frota a partir das features donas, a cada leitura. Como o fechamento, é uma
 * leitura que consolida: importa os repositórios delas, e nenhuma delas importa a Central.
 *
 * <p>A janela de "próximo" é a antecedência da empresa (Configurações) para vencimentos por data;
 * para os parâmetros de manutenção, a faixa de aviso de cada parâmetro.
 */
@Component
class ColetorDeAvisos {

  private static final Locale BRASIL = Locale.forLanguageTag("pt-BR");
  private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final AeronaveRepository aeronaves;
  private final PoliticaDeVencimento politica;
  private final ParametroDeControleRepository parametros;
  private final ManutencaoRepository manutencoes;
  private final TripulanteRepository tripulantes;
  private final FechamentoService fechamento;

  ColetorDeAvisos(
      AeronaveRepository aeronaves,
      PoliticaDeVencimento politica,
      ParametroDeControleRepository parametros,
      ManutencaoRepository manutencoes,
      TripulanteRepository tripulantes,
      FechamentoService fechamento) {
    this.aeronaves = aeronaves;
    this.politica = politica;
    this.parametros = parametros;
    this.manutencoes = manutencoes;
    this.tripulantes = tripulantes;
    this.fechamento = fechamento;
  }

  List<Aviso> coletar(LocalDate hoje) {
    Map<Long, Aeronave> frota =
        aeronaves.findAllByOrderByMatriculaAsc().stream()
            .collect(Collectors.toMap(Aeronave::getId, Function.identity()));
    int antecedencia = politica.diasDeAviso();
    List<Aviso> avisos = new ArrayList<>();
    for (Aeronave aeronave : frota.values()) {
      porData(
          avisos,
          new PrazoPorData(
              "CVA",
              aeronave.getId(),
              aeronave.getVencimentoCva(),
              CategoriaDoAviso.DOCUMENTOS,
              "CVA",
              "a aeronave não pode voar",
              "/aeronaves/" + aeronave.getId()),
          hoje,
          antecedencia);
      porData(
          avisos,
          new PrazoPorData(
              "RETA",
              aeronave.getId(),
              aeronave.getVencimentoReta(),
              CategoriaDoAviso.DOCUMENTOS,
              "Seguro RETA",
              "a aeronave não pode voar",
              "/aeronaves/" + aeronave.getId()),
          hoje,
          antecedencia);
    }
    parametrosDeManutencao(avisos, frota, hoje);
    manutencoesAtrasadas(avisos, frota, hoje);
    tripulacao(avisos, frota, hoje, antecedencia);
    fundos(avisos, frota);
    avisos.sort(Aviso.POR_URGENCIA);
    return avisos;
  }

  /**
   * Um prazo por data e como ele vira aviso: de quem é, como se chama e o que acontece ao vencer.
   */
  private record PrazoPorData(
      String tipo,
      Long aeronaveId,
      LocalDate vencimento,
      CategoriaDoAviso categoria,
      String nome,
      String consequencia,
      String destino) {}

  /** Um vencimento por data: vencido, dentro da antecedência, ou nada. */
  private static void porData(
      List<Aviso> avisos, PrazoPorData prazo, LocalDate hoje, int antecedencia) {
    if (prazo.vencimento() == null) {
      return;
    }
    long dias = ChronoUnit.DAYS.between(hoje, prazo.vencimento());
    if (dias > antecedencia) {
      return;
    }
    boolean vencido = dias < 0;
    avisos.add(
        new Aviso(
            prazo.tipo() + ":" + prazo.aeronaveId() + ":" + prazo.vencimento(),
            prazo.categoria(),
            vencido ? GravidadeDoAviso.VENCIDO : GravidadeDoAviso.PROXIMO,
            vencido ? prazo.nome() + " vencido" : prazo.nome() + " vence " + emDias(dias),
            vencido
                ? "Venceu em "
                    + DATA.format(prazo.vencimento())
                    + " — "
                    + prazo.consequencia()
                    + "."
                : "Vencimento em " + DATA.format(prazo.vencimento()) + ".",
            prazo.aeronaveId(),
            prazo.vencimento(),
            prazo.destino()));
  }

  private void parametrosDeManutencao(
      List<Aviso> avisos, Map<Long, Aeronave> frota, LocalDate hoje) {
    for (ParametroDeControle parametro : parametros.findAll()) {
      Aeronave aeronave = frota.get(parametro.getAeronaveId());
      if (aeronave == null) {
        continue;
      }
      SituacaoDoParametro situacao = parametro.situacaoEm(aeronave.getContadores(), hoje);
      if (situacao == SituacaoDoParametro.REGULAR) {
        continue;
      }
      BigDecimal atual = parametro.atualEm(aeronave.getContadores());
      BigDecimal falta = parametro.restante(atual == null ? BigDecimal.ZERO : atual, hoje);
      boolean estourado = situacao == SituacaoDoParametro.ESTOURADO;
      String quanto = numero(falta.abs()) + " " + unidade(parametro.getTipo());
      avisos.add(
          new Aviso(
              "PARAMETRO:" + parametro.getId() + ":" + limiteDe(parametro),
              CategoriaDoAviso.MANUTENCAO,
              estourado ? GravidadeDoAviso.VENCIDO : GravidadeDoAviso.PROXIMO,
              estourado
                  ? "Limite estourado: " + parametro.getNome()
                  : parametro.getNome() + " perto do limite",
              estourado ? "Passou " + quanto + " do limite." : "Faltam " + quanto + ".",
              aeronave.getId(),
              parametro.getDataLimite(),
              "/manutencao?aeronave=" + aeronave.getId()));
    }
  }

  private void manutencoesAtrasadas(List<Aviso> avisos, Map<Long, Aeronave> frota, LocalDate hoje) {
    for (Manutencao manutencao :
        manutencoes.findByStatusAndDataBeforeOrderByDataAsc(StatusDaManutencao.PROGRAMADA, hoje)) {
      if (!frota.containsKey(manutencao.getAeronaveId())) {
        continue;
      }
      avisos.add(
          new Aviso(
              "MANUTENCAO:" + manutencao.getId() + ":" + manutencao.getData(),
              CategoriaDoAviso.MANUTENCAO,
              GravidadeDoAviso.VENCIDO,
              "Manutenção programada atrasada",
              manutencao.getDescricao() + " · era para " + DATA.format(manutencao.getData()) + ".",
              manutencao.getAeronaveId(),
              manutencao.getData(),
              "/manutencao?aeronave=" + manutencao.getAeronaveId()));
    }
  }

  private void tripulacao(
      List<Aviso> avisos, Map<Long, Aeronave> frota, LocalDate hoje, int antecedencia) {
    for (Tripulante tripulante : tripulantes.findAll()) {
      if (!tripulante.estaAtivo() || !frota.containsKey(tripulante.getAeronaveId())) {
        continue;
      }
      String destino = "/aeronaves/" + tripulante.getAeronaveId();
      porData(
          avisos,
          new PrazoPorData(
              "CMA:" + tripulante.getId(),
              tripulante.getAeronaveId(),
              tripulante.getValidadeCma(),
              CategoriaDoAviso.TRIPULACAO,
              "CMA de " + tripulante.getNome(),
              "não pode tripular",
              destino),
          hoje,
          antecedencia);
      porData(
          avisos,
          new PrazoPorData(
              "CHT:" + tripulante.getId(),
              tripulante.getAeronaveId(),
              tripulante.getValidadeCht(),
              CategoriaDoAviso.TRIPULACAO,
              "CHT de " + tripulante.getNome(),
              "não pode tripular",
              destino),
          hoje,
          antecedencia);
    }
  }

  private void fundos(List<Aviso> avisos, Map<Long, Aeronave> frota) {
    for (SaldoDaAeronaveResponse saldo : fechamento.saldos()) {
      if (saldo.saldoDoFundo().signum() >= 0 || !frota.containsKey(saldo.aeronaveId())) {
        continue;
      }
      avisos.add(
          new Aviso(
              "FUNDO:" + saldo.aeronaveId() + ":" + saldo.competencia(),
              CategoriaDoAviso.FUNDOS,
              GravidadeDoAviso.VENCIDO,
              "Fundo descoberto",
              "Saldo de "
                  + NumberFormat.getCurrencyInstance(BRASIL).format(saldo.saldoDoFundo())
                  + " — é preciso aporte para cobrir os custos.",
              saldo.aeronaveId(),
              null,
              "/fechamento?aeronave=" + saldo.aeronaveId()));
    }
  }

  private static String emDias(long dias) {
    if (dias == 0) {
      return "hoje";
    }
    return dias == 1 ? "amanhã" : "em " + dias + " dias";
  }

  private static String numero(BigDecimal valor) {
    return NumberFormat.getNumberInstance(BRASIL).format(valor);
  }

  private static String unidade(TipoDeParametro tipo) {
    return switch (tipo) {
      case HORAS -> "h";
      case CICLOS -> "ciclos";
      case DATA -> "dias";
    };
  }

  private static String limiteDe(ParametroDeControle parametro) {
    return parametro.getTipo() == TipoDeParametro.DATA
        ? String.valueOf(parametro.getDataLimite())
        : parametro.getLimite().stripTrailingZeros().toPlainString();
  }
}
