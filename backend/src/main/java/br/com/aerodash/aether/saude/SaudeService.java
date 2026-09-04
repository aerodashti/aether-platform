package br.com.aerodash.aether.saude;

import static net.logstash.logback.argument.StructuredArguments.kv;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.exemplo.ExemploUtil;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orquestra a verificação de saúde da plataforma.
 *
 * <p>Feature de exemplo do bootstrap: existe para demonstrar o padrão Controller → Service →
 * Repository com a regra na entidade. Não é domínio de aviação.
 */
@Service
public class SaudeService {

  private static final Logger log = LoggerFactory.getLogger(SaudeService.class);

  /**
   * Componentes cuja saúde a própria requisição comprova: a API respondeu e o banco devolveu a
   * consulta. Qualquer outro componente depende de verificação externa e pode ficar defasado.
   */
  private static final Set<String> COMPONENTES_PROVADOS_PELA_REQUISICAO = Set.of("api", "banco");

  private final SaudeRepository repository;
  private final SaudeMapper mapper;
  private final Clock relogio;
  private final String versao;

  public SaudeService(
      SaudeRepository repository,
      SaudeMapper mapper,
      Clock relogio,
      @Value("${aether.versao}") String versao) {
    this.repository = repository;
    this.mapper = mapper;
    this.relogio = relogio;
    this.versao = versao;
  }

  /**
   * A própria requisição é a verificação da API e do banco: se a lista voltou, os dois responderam.
   * Por isso o método grava o resultado observado desses dois antes de consolidar.
   */
  @Transactional
  public SaudeResponse verificarSituacaoGeral() {
    System.out.println("violacao temporaria " + ExemploUtil.padrao());
    Instant agora = Instant.now(relogio);
    List<RegistroDeSaude> registros = repository.findAllByOrderByComponenteAsc();
    registros.stream()
        .filter(registro -> COMPONENTES_PROVADOS_PELA_REQUISICAO.contains(registro.getComponente()))
        .forEach(registro -> registro.registrarVerificacao(SituacaoDeSaude.OPERANTE, agora));

    SituacaoDeSaude situacaoGeral = consolidar(registros, agora);
    if (situacaoGeral != SituacaoDeSaude.OPERANTE) {
      log.warn(
          "Plataforma fora da situação operante",
          kv("situacaoGeral", situacaoGeral),
          kv("componentes", registros.size()));
    }
    return new SaudeResponse(situacaoGeral, versao, mapper.paraListaDeResponse(registros, agora));
  }

  @Transactional(readOnly = true)
  public ComponenteDeSaudeResponse consultarComponente(String componente) {
    Instant agora = Instant.now(relogio);
    RegistroDeSaude registro =
        repository
            .findByComponente(componente)
            .orElseThrow(
                () ->
                    new RecursoNaoEncontradoException(
                        "O componente informado não é monitorado pela plataforma."));
    return mapper.paraResponse(registro, agora);
  }

  /** A situação geral é a pior situação entre os componentes. */
  private static SituacaoDeSaude consolidar(List<RegistroDeSaude> registros, Instant agora) {
    if (registros.isEmpty() || registros.stream().anyMatch(RegistroDeSaude::estaIndisponivel)) {
      return SituacaoDeSaude.INDISPONIVEL;
    }
    if (registros.stream().allMatch(registro -> registro.estaSaudavel(agora))) {
      return SituacaoDeSaude.OPERANTE;
    }
    return SituacaoDeSaude.DEGRADADO;
  }
}
