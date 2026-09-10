package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.participacao.ContratosDaAeronaveResponse.ContratoResponse;
import br.com.aerodash.aether.participacao.ContratosDaAeronaveResponse.ParticipacaoResponse;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Quem é dono de quanto de cada aeronave: o contrato vigente e o histórico. */
@Service
public class ParticipacaoService {

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
    exigirAeronave(aeronaveId);
    Optional<ContratoDeParticipacao> vigente =
        contratos.findByAeronaveIdAndFimDaVigenciaIsNull(aeronaveId);
    List<ContratoDeParticipacao> historico =
        contratos.findByAeronaveIdAndFimDaVigenciaIsNotNullOrderByFimDaVigenciaDesc(aeronaveId);

    contexto.registrar("participacao.contratosNoHistorico", historico.size());
    return new ContratosDaAeronaveResponse(
        vigente.map(this::paraResponse).orElse(null),
        historico.stream().map(this::paraResponse).toList());
  }

  /**
   * Define o contrato novo por inteiro e arquiva o vigente. Se nada mudou, mantém o que está: um
   * contrato idêntico no histórico não conta nenhuma história.
   */
  @Transactional
  public ContratosDaAeronaveResponse definir(
      Long aeronaveId, DefinirContratoRequest request, String autor) {
    exigirAeronave(aeronaveId);
    Instant agora = Instant.now(relogio);

    ContratoDeParticipacao novo = new ContratoDeParticipacao(aeronaveId, autor, agora);
    for (var participacao : validar(request)) {
      novo.adicionarParticipacao(participacao.proprietarioId(), participacao.percentual());
    }

    boolean somaFecha = novo.somaFecha();
    contexto.decisao("participacao.somaFecha", somaFecha);
    if (!somaFecha) {
      throw new ContratoInvalidoException(
          "Ajuste os percentuais para somar 100% — a soma atual é "
              + novo.somaDosPercentuais().toPlainString()
              + "%.");
    }

    Optional<ContratoDeParticipacao> vigente =
        contratos.findByAeronaveIdAndFimDaVigenciaIsNull(aeronaveId);
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
          contrato.encerrar(agora);
          contratos.flush();
        });
    contratos.save(novo);
    contexto.registrar("participacao.proprietariosNoContrato", novo.getParticipacoes().size());
    return consultar(aeronaveId);
  }

  /** Proprietário repetido, desconhecido ou inativo não entra em contrato. */
  private List<DefinirContratoRequest.ParticipacaoRequest> validar(DefinirContratoRequest request) {
    List<Long> ids =
        request.participacoes().stream()
            .map(DefinirContratoRequest.ParticipacaoRequest::proprietarioId)
            .toList();

    boolean repetido = ids.stream().distinct().count() != ids.size();
    contexto.decisao("participacao.proprietarioRepetido", repetido);
    if (repetido) {
      throw new ContratoInvalidoException("Cada proprietário entra uma única vez no contrato.");
    }

    Map<Long, Proprietario> encontrados =
        proprietarios.findAllById(ids).stream()
            .collect(Collectors.toMap(Proprietario::getId, Function.identity()));
    for (Long id : ids) {
      Proprietario proprietario = encontrados.get(id);
      if (proprietario == null) {
        throw new RecursoNaoEncontradoException("Proprietário não encontrado.");
      }
      contexto.decisao("participacao.proprietarioAtivo", proprietario.estaAtivo());
      if (!proprietario.estaAtivo()) {
        throw new ContratoInvalidoException(
            "Proprietário inativo não entra em contrato: reative "
                + proprietario.getNome()
                + " antes.");
      }
    }
    return request.participacoes();
  }

  private void exigirAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    if (!aeronaves.existsById(aeronaveId)) {
      throw new RecursoNaoEncontradoException("Aeronave não encontrada.");
    }
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
