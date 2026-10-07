package br.com.aerodash.aether.manutencao;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.PendenciaOperacional;
import br.com.aerodash.aether.aeronave.PendenciasOperacionais;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * A manutenção respondendo à porta da aeronave: parâmetro estourado e manutenção programada
 * atrasada impedem o voo; parâmetro dentro da faixa de aviso só pede atenção. São as mesmas regras
 * que a Central de avisos lê, para a frota e a Central nunca discordarem.
 */
@Component
class PendenciasDeManutencao implements PendenciasOperacionais {

  private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final ParametroDeControleRepository parametros;
  private final ManutencaoRepository manutencoes;

  PendenciasDeManutencao(
      ParametroDeControleRepository parametros, ManutencaoRepository manutencoes) {
    this.parametros = parametros;
    this.manutencoes = manutencoes;
  }

  @Override
  @Transactional(readOnly = true)
  public Map<Long, List<PendenciaOperacional>> pendenciasDe(
      Collection<Aeronave> aeronaves, LocalDate hoje, int diasDeAviso) {
    Map<Long, Aeronave> porId =
        aeronaves.stream().collect(Collectors.toMap(Aeronave::getId, Function.identity()));
    Map<Long, List<PendenciaOperacional>> pendencias = new HashMap<>();
    for (ParametroDeControle parametro : parametros.findAll()) {
      Aeronave aeronave = porId.get(parametro.getAeronaveId());
      if (aeronave != null) {
        doParametro(parametro, aeronave, hoje)
            .ifPresent(p -> adicionar(pendencias, aeronave.getId(), p));
      }
    }
    for (Manutencao manutencao :
        manutencoes.findByStatusAndDataBeforeOrderByDataAsc(StatusDaManutencao.PROGRAMADA, hoje)) {
      if (porId.containsKey(manutencao.getAeronaveId())) {
        adicionar(
            pendencias,
            manutencao.getAeronaveId(),
            PendenciaOperacional.impeditiva(
                "Manutenção atrasada desde " + DATA.format(manutencao.getData())));
      }
    }
    return pendencias;
  }

  private static Optional<PendenciaOperacional> doParametro(
      ParametroDeControle parametro, Aeronave aeronave, LocalDate hoje) {
    return switch (parametro.situacaoEm(aeronave.getContadores(), hoje)) {
      case ESTOURADO ->
          Optional.of(PendenciaOperacional.impeditiva("Limite estourado: " + parametro.getNome()));
      case ATENCAO ->
          Optional.of(PendenciaOperacional.deAtencao(parametro.getNome() + " perto do limite"));
      case REGULAR -> Optional.empty();
    };
  }

  private static void adicionar(
      Map<Long, List<PendenciaOperacional>> pendencias, Long aeronaveId, PendenciaOperacional p) {
    pendencias.computeIfAbsent(aeronaveId, id -> new ArrayList<>()).add(p);
  }
}
