package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.participacao.DefinirContratoRequest.ParticipacaoRequest;
import br.com.aerodash.aether.participacao.SaidaDeProprietarioRequest.ContratoNovo;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
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
    contexto.decisao("saida.quemSaiEstaAtivo", quemSai.estaAtivo());
    if (!quemSai.estaAtivo()) {
      throw new ProprietarioJaInativoException(quemSai.getNome());
    }
    List<ContratoNovo> novos = request.contratos();
    exigirUmContratoPorAeronave(quemSai, novos);
    exigirQueQuemSaiFiqueDeFora(quemSai, novos);

    for (int indice = 0; indice < novos.size(); indice++) {
      ContratoNovo contrato = novos.get(indice);
      participacoes.definir(
          contrato.aeronaveId(),
          new DefinirContratoRequest(contrato.participacoes(), contrato.contratoVigenteId()),
          autor,
          "contratos[" + indice + "].");
    }
    quemSai.desativar(Instant.now(relogio));
    contexto.registrar("saida.contratosRedistribuidos", novos.size());
  }

  /** Um contrato novo por aeronave de quem sai: nem aeronave a mais, nem a menos, nem repetida. */
  private void exigirUmContratoPorAeronave(Proprietario quemSai, List<ContratoNovo> novos) {
    Set<Long> pedidas = new HashSet<>();
    for (int indice = 0; indice < novos.size(); indice++) {
      boolean repetida = !pedidas.add(novos.get(indice).aeronaveId());
      contexto.decisao("saida.aeronaveRepetida", repetida);
      if (repetida) {
        throw new ContratoInvalidoException(
            "Esta aeronave aparece mais de uma vez: informe um contrato novo só por aeronave.",
            "contratos[" + indice + "].aeronaveId");
      }
    }
    Set<Long> aeronavesDele =
        contratos.findByFimDaVigenciaIsNullAndParticipacoesProprietarioId(quemSai.getId()).stream()
            .map(ContratoDeParticipacao::getAeronaveId)
            .collect(Collectors.toSet());
    boolean cobreTodas = pedidas.equals(aeronavesDele);
    contexto.decisao("saida.cobreTodasAsAeronaves", cobreTodas);
    if (!cobreTodas) {
      throw new ContratoInvalidoException(
          "Informe um contrato novo para cada aeronave em que "
              + quemSai.getNome()
              + " participa.");
    }
  }

  private void exigirQueQuemSaiFiqueDeFora(Proprietario quemSai, List<ContratoNovo> novos) {
    for (int contrato = 0; contrato < novos.size(); contrato++) {
      List<ParticipacaoRequest> participacoesNovas = novos.get(contrato).participacoes();
      for (int indice = 0; indice < participacoesNovas.size(); indice++) {
        boolean continua = quemSai.getId().equals(participacoesNovas.get(indice).proprietarioId());
        contexto.decisao("saida.quemSaiContinuaNoContrato", continua);
        if (continua) {
          throw new ContratoInvalidoException(
              quemSai.getNome() + " não pode continuar no contrato de que está saindo.",
              "contratos[" + contrato + "].participacoes[" + indice + "].proprietarioId");
        }
      }
    }
  }
}
