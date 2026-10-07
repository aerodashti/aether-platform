package br.com.aerodash.aether.aporte;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Os aportes: o dinheiro que cada proprietário pôs no fundo de cada aeronave. */
@Service
public class AporteService {

  private static final String APORTE_INVALIDO = "Aporte inválido";
  private static final String CAMPO_AERONAVE = "aeronaveId";
  private static final String CAMPO_PROPRIETARIO = "proprietarioId";
  private static final String CAMPO_DATA = "data";
  private static final String CAMPO_COMPETENCIA = "competencia";
  private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
  private static final DateTimeFormatter COMPETENCIA = DateTimeFormatter.ofPattern("MM/yyyy");

  private final AporteRepository aportes;
  private final AeronaveRepository aeronaves;
  private final ProprietarioRepository proprietarios;
  private final ParticipantesDaAeronave participantes;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public AporteService(
      AporteRepository aportes,
      AeronaveRepository aeronaves,
      ProprietarioRepository proprietarios,
      ParticipantesDaAeronave participantes,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.aportes = aportes;
    this.aeronaves = aeronaves;
    this.proprietarios = proprietarios;
    this.participantes = participantes;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public AportesResponse listar(Long aeronaveId, YearMonth de, YearMonth ate) {
    PeriodoDeCompetencias periodo = PeriodoDeCompetencias.entre(de, ate);
    exigirPeriodoEmOrdem(periodo);
    contexto.decisao("aportes.filtroPorAeronave", aeronaveId != null);
    List<Aporte> recorte =
        aeronaveId == null
            ? aportes.findByCompetenciaBetweenOrderByDataDescIdDesc(periodo.de(), periodo.ate())
            : aportes.findByAeronaveIdAndCompetenciaBetweenOrderByDataDescIdDesc(
                aeronaveId, periodo.de(), periodo.ate());

    contexto.registrar("aportes.quantidade", recorte.size());
    BigDecimal total =
        recorte.stream().map(Aporte::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new AportesResponse(paraLinhas(recorte), total);
  }

  @Transactional
  public AporteResponse criar(AporteRequest request) {
    exigirAeronave(request.aeronaveId());
    validar(request);

    Aporte aporte =
        new Aporte(
            request.aeronaveId(),
            request.proprietarioId(),
            request.data(),
            request.competencia(),
            request.valor(),
            Instant.now(relogio));
    exigirDatasAceitas(aporte);
    aporte = aportes.save(aporte);
    contexto.registrar("aporte.id", aporte.getId());
    return paraLinhas(List.of(aporte)).get(0);
  }

  @Transactional
  public AporteResponse atualizar(Long id, AporteRequest request) {
    Aporte aporte = exigirAporte(id);
    boolean trocaDeAeronave = !Objects.equals(request.aeronaveId(), aporte.getAeronaveId());
    contexto.decisao("aporte.trocaDeAeronave", trocaDeAeronave);
    if (trocaDeAeronave) {
      throw new AporteInvalidoException(
          APORTE_INVALIDO,
          "A aeronave do aporte não muda: exclua e registre na aeronave certa.",
          CAMPO_AERONAVE);
    }
    validar(request);

    aporte.atualizar(
        request.proprietarioId(),
        request.data(),
        request.competencia(),
        request.valor(),
        Instant.now(relogio));
    // Recusar depois de alterar é seguro: a exceção desfaz a transação antes do flush.
    exigirDatasAceitas(aporte);
    return paraLinhas(List.of(aporte)).get(0);
  }

  @Transactional
  public void excluir(Long id) {
    aportes.delete(exigirAporte(id));
    contexto.registrar("aporte.excluido", id);
  }

  private void validar(AporteRequest request) {
    boolean proprietarioExiste = proprietarios.existsById(request.proprietarioId());
    contexto.decisao("aporte.proprietarioExiste", proprietarioExiste);
    if (!proprietarioExiste) {
      throw new AporteInvalidoException(
          APORTE_INVALIDO, "Proprietário não encontrado.", CAMPO_PROPRIETARIO);
    }

    boolean participa =
        participantes.participaOuParticipou(request.aeronaveId(), request.proprietarioId());
    contexto.decisao("aporte.proprietarioParticipa", participa);
    if (!participa) {
      throw new AporteInvalidoException(
          APORTE_INVALIDO,
          "Este proprietário nunca participou desta aeronave: inclua-o no contrato antes.",
          CAMPO_PROPRIETARIO);
    }
  }

  /** Hoje é o de Brasília: em UTC, depois das 21h, o crédito de amanhã passaria. */
  private void exigirDatasAceitas(Aporte aporte) {
    LocalDate hoje = CalendarioDoFundo.hoje(relogio);
    exigirDataAceita(aporte, hoje);
    exigirCompetenciaAceita(aporte, YearMonth.from(hoje));
  }

  private void exigirDataAceita(Aporte aporte, LocalDate hoje) {
    boolean noFuturo = aporte.estaNoFuturo(hoje);
    contexto.decisao("aporte.dataNoFuturo", noFuturo);
    if (noFuturo) {
      throw new AporteInvalidoException(
          APORTE_INVALIDO,
          "O aporte é registrado como recebido: registre depois que a transferência cair.",
          CAMPO_DATA);
    }
    boolean antigaDemais = aporte.estaAntesDaPrimeiraData();
    contexto.decisao("aporte.dataAntesDaPrimeira", antigaDemais);
    if (antigaDemais) {
      throw new AporteInvalidoException(
          APORTE_INVALIDO,
          "Use uma data a partir de " + CalendarioDoFundo.PRIMEIRA_DATA.format(DATA) + ".",
          CAMPO_DATA);
    }
  }

  private void exigirCompetenciaAceita(Aporte aporte, YearMonth corrente) {
    boolean aceitavel = aporte.possuiCompetenciaAceitavel(corrente);
    contexto.decisao("aporte.competenciaAceitavel", aceitavel);
    if (!aceitavel) {
      throw new AporteInvalidoException(
          APORTE_INVALIDO,
          "Use uma competência de "
              + Aporte.PRIMEIRA_COMPETENCIA.format(COMPETENCIA)
              + " até "
              + Aporte.ultimaCompetencia(corrente).format(COMPETENCIA)
              + ".",
          CAMPO_COMPETENCIA);
    }
  }

  private void exigirPeriodoEmOrdem(PeriodoDeCompetencias periodo) {
    boolean invertido = periodo.estaInvertido();
    contexto.decisao("aportes.periodoInvertido", invertido);
    if (invertido) {
      throw new AporteInvalidoException(
          "Período inválido", "A competência inicial vem depois da final.");
    }
  }

  /** A aeronave vem no corpo: inexistente é erro do campo, não recurso da URL que falta. */
  private void exigirAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    boolean existe = aeronaves.existsById(aeronaveId);
    contexto.decisao("aporte.aeronaveExiste", existe);
    if (!existe) {
      throw new AporteInvalidoException(
          APORTE_INVALIDO, "Aeronave não encontrada.", CAMPO_AERONAVE);
    }
  }

  private Aporte exigirAporte(Long id) {
    contexto.registrar("aporte.id", id);
    return aportes
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Aporte não encontrado."));
  }

  /** Matrícula, nome e cor em lote: a grade não faz uma busca por linha. */
  private List<AporteResponse> paraLinhas(List<Aporte> recorte) {
    Map<Long, Aeronave> frota =
        aeronaves
            .findAllById(recorte.stream().map(Aporte::getAeronaveId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(Aeronave::getId, Function.identity()));
    Map<Long, Proprietario> donos =
        proprietarios
            .findAllById(recorte.stream().map(Aporte::getProprietarioId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(Proprietario::getId, Function.identity()));

    return recorte.stream()
        .map(
            aporte -> {
              Aeronave aeronave = frota.get(aporte.getAeronaveId());
              Proprietario dono = donos.get(aporte.getProprietarioId());
              return new AporteResponse(
                  aporte.getId(),
                  aporte.getAeronaveId(),
                  aeronave == null ? null : aeronave.getMatricula(),
                  aporte.getProprietarioId(),
                  dono == null ? null : dono.getNome(),
                  dono == null ? null : dono.getCorDeIdentificacao(),
                  aporte.getData(),
                  aporte.getCompetencia(),
                  aporte.getValor());
            })
        .toList();
  }
}
