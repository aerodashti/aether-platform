package br.com.aerodash.aether.saude;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orquestra a verificação de saúde da plataforma.
 *
 * <p>Feature de exemplo do bootstrap: existe para demonstrar o padrão Controller → Service →
 * Repository com a regra na entidade, e o padrão de observabilidade — toda variável que decide um
 * ramo passa por {@code contexto.decisao} antes do desvio. Não é domínio de aviação.
 */
@Service
public class SaudeService {

  /**
   * Componentes cuja saúde a própria requisição comprova: a API respondeu e o banco devolveu a
   * consulta. Qualquer outro componente depende de verificação externa e pode ficar defasado.
   */
  private static final Set<String> COMPONENTES_PROVADOS_PELA_REQUISICAO = Set.of("api", "banco");

  private final SaudeRepository repository;
  private final SaudeMapper mapper;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;
  private final String versao;

  public SaudeService(
      SaudeRepository repository,
      SaudeMapper mapper,
      Clock relogio,
      ContextoDaRequisicao contexto,
      @Value("${aether.versao}") String versao) {
    this.repository = repository;
    this.mapper = mapper;
    this.relogio = relogio;
    this.contexto = contexto;
    this.versao = versao;
  }

  /**
   * A própria requisição é a verificação da API e do banco: se a lista voltou, os dois responderam.
   * Por isso o método grava o resultado observado desses dois antes de consolidar.
   */
  @Transactional
  public SaudeResponse verificarSituacaoGeral() {
    Instant agora = Instant.now(relogio);
    List<RegistroDeSaude> registros = repository.findAllByOrderByComponenteAsc();
    contexto.registrar("saude.componentes_monitorados", registros.size());

    registros.stream()
        .filter(registro -> COMPONENTES_PROVADOS_PELA_REQUISICAO.contains(registro.getComponente()))
        .forEach(registro -> registro.registrarVerificacao(SituacaoDeSaude.OPERANTE, agora));

    SituacaoDeSaude situacaoGeral = consolidar(registros, agora);
    contexto.registrar("saude.situacao_geral", situacaoGeral);
    return new SaudeResponse(situacaoGeral, versao, mapper.paraListaDeResponse(registros, agora));
  }

  @Transactional(readOnly = true)
  public ComponenteDeSaudeResponse consultarComponente(String componente) {
    Instant agora = Instant.now(relogio);
    contexto.registrar("saude.componente", componente);
    return repository
        .findByComponente(componente)
        .map(registro -> mapper.paraResponse(registro, agora))
        .orElseThrow(
            () ->
                new RecursoNaoEncontradoException(
                    "O componente informado não é monitorado pela plataforma."));
  }

  /** A situação geral é a pior situação entre os componentes. */
  private SituacaoDeSaude consolidar(List<RegistroDeSaude> registros, Instant agora) {
    boolean semComponentes = registros.isEmpty();
    boolean possuiIndisponivel = registros.stream().anyMatch(RegistroDeSaude::estaIndisponivel);
    contexto.decisao("saude.sem_componentes", semComponentes);
    contexto.decisao("saude.possui_indisponivel", possuiIndisponivel);
    if (semComponentes || possuiIndisponivel) {
      return SituacaoDeSaude.INDISPONIVEL;
    }

    boolean todosSaudaveis = registros.stream().allMatch(registro -> registro.estaSaudavel(agora));
    contexto.decisao("saude.todos_saudaveis", todosSaudaveis);
    return todosSaudaveis ? SituacaoDeSaude.OPERANTE : SituacaoDeSaude.DEGRADADO;
  }
}
