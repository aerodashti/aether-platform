package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Desativar quem está num contrato vigente é uma saída: um contrato novo por aeronave, sem ele, e
 * só então a desativação — tudo numa transação, para nunca sobrar contrato pela metade. Mora aqui,
 * e não em {@code proprietario}, porque quem sabe criar contrato é a participação.
 */
@Service
public class SaidaDeProprietarioService {

  private final ContratoDeParticipacaoRepository contratos;
  private final ParticipacaoService participacoes;
  private final ProprietarioRepository proprietarios;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public SaidaDeProprietarioService(
      ContratoDeParticipacaoRepository contratos,
      ParticipacaoService participacoes,
      ProprietarioRepository proprietarios,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.contratos = contratos;
    this.participacoes = participacoes;
    this.proprietarios = proprietarios;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional
  public void sair(Long proprietarioId, SaidaDeProprietarioRequest request, String autor) {
    Proprietario quemSai =
        proprietarios
            .findById(proprietarioId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Proprietário não encontrado."));
    Set<Long> aeronavesDele =
        contratos.findByFimDaVigenciaIsNullAndParticipacoesProprietarioId(proprietarioId).stream()
            .map(ContratoDeParticipacao::getAeronaveId)
            .collect(Collectors.toSet());
    Set<Long> pedidas =
        request.contratos().stream()
            .map(SaidaDeProprietarioRequest.ContratoNovo::aeronaveId)
            .collect(Collectors.toSet());

    boolean cobreTodas =
        pedidas.equals(aeronavesDele) && pedidas.size() == request.contratos().size();
    contexto.decisao("saida.cobreTodasAsAeronaves", cobreTodas);
    if (!cobreTodas) {
      throw new ContratoInvalidoException(
          "Informe um contrato novo para cada aeronave em que "
              + quemSai.getNome()
              + " participa.");
    }
    boolean aindaParticipa =
        request.contratos().stream()
            .flatMap(contrato -> contrato.participacoes().stream())
            .anyMatch(participacao -> proprietarioId.equals(participacao.proprietarioId()));
    contexto.decisao("saida.quemSaiContinuaNoContrato", aindaParticipa);
    if (aindaParticipa) {
      throw new ContratoInvalidoException(
          quemSai.getNome() + " não pode continuar no contrato de que está saindo.");
    }

    for (SaidaDeProprietarioRequest.ContratoNovo contrato : request.contratos()) {
      participacoes.definir(
          contrato.aeronaveId(), new DefinirContratoRequest(contrato.participacoes()), autor);
    }
    quemSai.desativar(Instant.now(relogio));
    contexto.registrar("saida.contratosRedistribuidos", request.contratos().size());
  }
}
