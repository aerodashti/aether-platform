package br.com.aerodash.aether.aeronave;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Quem sabe o que, além de CVA e RETA, pesa na situação de uma aeronave. Porta declarada aqui e
 * respondida por quem governa cada assunto — manutenção e tripulação —, para que a aeronave não
 * conheça nenhuma das duas (veja {@code docs/arquitetura.md}).
 *
 * <p>Recebe a frota de uma vez porque a lista de aeronaves pergunta por todas: uma consulta por
 * aeronave seria N idas ao banco para montar uma tela.
 */
public interface PendenciasOperacionais {

  /** As pendências de cada aeronave pedida, pelo id; aeronave sem pendência pode faltar no mapa. */
  Map<Long, List<PendenciaOperacional>> pendenciasDe(
      Collection<Aeronave> aeronaves, LocalDate hoje, int diasDeAviso);
}
