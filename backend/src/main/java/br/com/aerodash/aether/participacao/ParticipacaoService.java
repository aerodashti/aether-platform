package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.participacao.ContratosDaAeronaveResponse.ContratoResponse;
import br.com.aerodash.aether.participacao.ContratosDaAeronaveResponse.ParticipacaoResponse;
import br.com.aerodash.aether.participacao.DefinirContratoRequest.ParticipacaoRequest;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Quem é dono de quanto de cada aeronave: o contrato vigente e o histórico. */
@Service
public class ParticipacaoService {

  private static final Locale BRASIL = Locale.forLanguageTag("pt-BR");

  private final ContratoDeParticipacaoRepository contratos;
  private final AeronaveRepository aeronaves;
  private final ProprietarioRepository proprietarios;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public ParticipacaoService(
      ContratoDeParticipacaoRepository contratos,
      AeronaveRepository aeronaves,
      ProprietarioRepository proprietarios,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.contratos = contratos;
    this.aeronaves = aeronaves;
    this.proprietarios = proprietarios;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public ContratosDaAeronaveResponse consultar(Long aeronaveId) {
    buscarAeronave(aeronaveId);
    Optional<ContratoDeParticipacao> vigente =
        contratos.findByAeronaveIdAndFimDaVigenciaIsNull(aeronaveId);
    List<ContratoDeParticipacao> historico =
        contratos.findByAeronaveIdAndFimDaVigenciaIsNotNullOrderByFimDaVigenciaDesc(aeronaveId);

    contexto.registrar("participacao.contratosNoHistorico", historico.size());
    return new ContratosDaAeronaveResponse(
        vigente.map(this::paraResponse).orElse(null),
        historico.stream().map(this::paraResponse).toList());
  }

  /** As participações de todos os contratos vigentes, em ordem de matrícula e depois de fatia. */
  @Transactional(readOnly = true)
  public List<VinculoVigenteResponse> listarVinculosVigentes() {
    List<ContratoDeParticipacao> vigentes = contratos.findByFimDaVigenciaIsNull();
    Map<Long, Aeronave> frota =
        aeronaves
            .findAllById(vigentes.stream().map(ContratoDeParticipacao::getAeronaveId).toList())
            .stream()
            .collect(Collectors.toMap(Aeronave::getId, Function.identity()));

    List<VinculoVigenteResponse> vinculos =
        vigentes.stream()
            .flatMap(
                contrato -> {
                  Aeronave aeronave = frota.get(contrato.getAeronaveId());
                  return contrato.getParticipacoes().stream()
                      .map(
                          participacao ->
                              new VinculoVigenteResponse(
                                  participacao.getProprietarioId(),
                                  contrato.getAeronaveId(),
                                  contrato.getId(),
                                  aeronave == null ? null : aeronave.getMatricula(),
                                  aeronave == null ? null : aeronave.getModelo(),
                                  participacao.getPercentual()));
                })
            .sorted(
                Comparator.comparing(
                        VinculoVigenteResponse::matricula,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(VinculoVigenteResponse::percentual, Comparator.reverseOrder()))
            .toList();

    contexto.registrar("participacao.contratosVigentes", vigentes.size());
    contexto.registrar("participacao.vinculosVigentes", vinculos.size());
    return vinculos;
  }

  /**
   * Define o contrato novo por inteiro e arquiva o vigente. Se nada mudou, mantém o que está: um
   * contrato idêntico no histórico não conta nenhuma história.
   */
  @Transactional
  public ContratosDaAeronaveResponse definir(
      Long aeronaveId, DefinirContratoRequest request, String autor) {
    return definir(aeronaveId, request, autor, "");
  }

  /**
   * @param prefixo onde este contrato está no JSON do pedido: vazio na definição direta, {@code
   *     contratos[2].} na saída de um proprietário — a recusa aponta o campo que a tela mostra.
   */
  @Transactional
  ContratosDaAeronaveResponse definir(
      Long aeronaveId, DefinirContratoRequest request, String autor, String prefixo) {
    Aeronave aeronave = buscarAeronave(aeronaveId);
    ContratoDeParticipacao novo = montar(aeronaveId, request, autor, prefixo);
    exigirProprietariosAtivos(request.participacoes(), prefixo);

    boolean somaFecha = novo.somaFecha();
    contexto.decisao("participacao.somaFecha", somaFecha);
    if (!somaFecha) {
      throw new ContratoInvalidoException(
          "Ajuste os percentuais para somar 100% — a soma atual é "
              + emTexto(novo.somaDosPercentuais())
              + "%.",
          prefixo + "participacoes");
    }

    Optional<ContratoDeParticipacao> vigente =
        contratos.findByAeronaveIdAndFimDaVigenciaIsNull(aeronaveId);
    exigirVigenteConhecido(aeronave, vigente, request.contratoVigenteId());
    boolean semMudanca =
        vigente.isPresent() && vigente.get().possuiAsMesmasParticipacoes(novo.getParticipacoes());
    contexto.decisao("participacao.semMudanca", semMudanca);
    if (semMudanca) {
      return consultar(aeronaveId);
    }

    // O flush força o UPDATE do encerramento antes do INSERT do novo: o Hibernate ordena
    // inserts antes de updates, e o índice parcial de vigente único veria dois vigentes.
    vigente.ifPresent(
        contrato -> {
          contrato.encerrar(novo.getInicioDaVigencia());
          contratos.flush();
        });
    contratos.save(novo);
    contexto.registrar("participacao.proprietariosNoContrato", novo.getParticipacoes().size());
    return consultar(aeronaveId);
  }

  /** O contrato novo, participação a participação; o repetido é recusado com o campo dele. */
  private ContratoDeParticipacao montar(
      Long aeronaveId, DefinirContratoRequest request, String autor, String prefixo) {
    ContratoDeParticipacao novo =
        new ContratoDeParticipacao(aeronaveId, autor, Instant.now(relogio));
    List<ParticipacaoRequest> pedidas = request.participacoes();
    for (int indice = 0; indice < pedidas.size(); indice++) {
      ParticipacaoRequest pedida = pedidas.get(indice);
      boolean repetido = novo.possuiParticipacaoDe(pedida.proprietarioId());
      contexto.decisao("participacao.proprietarioRepetido", repetido);
      if (repetido) {
        throw new ContratoInvalidoException(
            "Cada proprietário entra uma única vez no contrato.",
            campoDoProprietario(prefixo, indice));
      }
      novo.adicionarParticipacao(pedida.proprietarioId(), pedida.percentual());
    }
    return novo;
  }

  /**
   * Proprietário desconhecido ou inativo não entra em contrato. O id veio no corpo, não na URL: é
   * um campo errado do pedido (400), não um recurso que falta (404).
   */
  private void exigirProprietariosAtivos(List<ParticipacaoRequest> pedidas, String prefixo) {
    Map<Long, Proprietario> encontrados =
        proprietarios
            .findAllById(pedidas.stream().map(ParticipacaoRequest::proprietarioId).toList())
            .stream()
            .collect(Collectors.toMap(Proprietario::getId, Function.identity()));
    for (int indice = 0; indice < pedidas.size(); indice++) {
      Proprietario proprietario = encontrados.get(pedidas.get(indice).proprietarioId());
      contexto.decisao("participacao.proprietarioEncontrado", proprietario != null);
      if (proprietario == null) {
        throw new ContratoInvalidoException(
            "Proprietário não encontrado.", campoDoProprietario(prefixo, indice));
      }
      contexto.decisao("participacao.proprietarioAtivo", proprietario.estaAtivo());
      if (!proprietario.estaAtivo()) {
        throw new ContratoInvalidoException(
            "Proprietário inativo não entra em contrato: reative "
                + proprietario.getNome()
                + " antes.",
            campoDoProprietario(prefixo, indice));
      }
    }
  }

  /** A edição partiu do vigente de agora; senão, outra pessoa salvou no meio do caminho. */
  private void exigirVigenteConhecido(
      Aeronave aeronave, Optional<ContratoDeParticipacao> vigente, Long contratoVigenteId) {
    Long idDoVigente = vigente.map(ContratoDeParticipacao::getId).orElse(null);
    boolean desatualizado = !Objects.equals(idDoVigente, contratoVigenteId);
    contexto.decisao("participacao.contratoDesatualizado", desatualizado);
    if (desatualizado) {
      throw new ContratoDesatualizadoException(aeronave.getMatricula());
    }
  }

  private static String campoDoProprietario(String prefixo, int indice) {
    return prefixo + "participacoes[" + indice + "].proprietarioId";
  }

  /** "99,99": a mensagem vai direto para a pessoa, e no Brasil a vírgula é a decimal. */
  private static String emTexto(BigDecimal percentual) {
    NumberFormat formato = NumberFormat.getNumberInstance(BRASIL);
    formato.setMaximumFractionDigits(2);
    return formato.format(percentual);
  }

  private Aeronave buscarAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    return aeronaves
        .findById(aeronaveId)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Aeronave não encontrada."));
  }

  private ContratoResponse paraResponse(ContratoDeParticipacao contrato) {
    List<Long> ids =
        contrato.getParticipacoes().stream().map(Participacao::getProprietarioId).toList();
    Map<Long, Proprietario> donos =
        proprietarios.findAllById(ids).stream()
            .collect(Collectors.toMap(Proprietario::getId, Function.identity()));
    return new ContratoResponse(
        contrato.getId(),
        contrato.getInicioDaVigencia(),
        contrato.getFimDaVigencia(),
        contrato.getCriadoPor(),
        contrato.getParticipacoes().stream()
            .map(
                participacao -> {
                  Proprietario dono = donos.get(participacao.getProprietarioId());
                  return new ParticipacaoResponse(
                      participacao.getProprietarioId(),
                      dono == null ? null : dono.getNome(),
                      dono == null ? null : dono.getCorDeIdentificacao(),
                      participacao.getPercentual());
                })
            .toList());
  }
}
