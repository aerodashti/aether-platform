package br.com.aerodash.aether.tripulante;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A tripulação de cada aeronave e as validades que decidem se ela voa tripulada. */
@Service
public class TripulanteService {

  private final TripulanteRepository tripulantes;
  private final AeronaveRepository aeronaves;
  private final TripulanteMapper mapper;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public TripulanteService(
      TripulanteRepository tripulantes,
      AeronaveRepository aeronaves,
      TripulanteMapper mapper,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.tripulantes = tripulantes;
    this.aeronaves = aeronaves;
    this.mapper = mapper;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public List<TripulanteResponse> listar(Long aeronaveId) {
    exigirAeronave(aeronaveId);
    LocalDate hoje = LocalDate.now(relogio);
    List<TripulanteResponse> lista =
        tripulantes.findByAeronaveIdOrderByNomeAsc(aeronaveId).stream()
            .map(tripulante -> mapper.paraResponse(tripulante, hoje))
            .toList();

    contexto.registrar("tripulacao.total", lista.size());
    contexto.registrar(
        "tripulacao.comVencido",
        lista.stream().filter(linha -> linha.cmaVencido() || linha.chtVencido()).count());
    return lista;
  }

  @Transactional
  public TripulanteResponse criar(Long aeronaveId, TripulanteRequest request) {
    exigirAeronave(aeronaveId);
    Tripulante tripulante = new Tripulante(aeronaveId, dadosDe(request), Instant.now(relogio));
    tripulante = tripulantes.save(tripulante);

    contexto.registrar("tripulante.id", tripulante.getId());
    return mapper.paraResponse(tripulante, LocalDate.now(relogio));
  }

  @Transactional
  public TripulanteResponse atualizar(Long aeronaveId, Long id, TripulanteRequest request) {
    exigirAeronave(aeronaveId);
    contexto.registrar("tripulante.id", id);
    Tripulante tripulante =
        tripulantes
            .findById(id)
            .filter(existente -> existente.getAeronaveId().equals(aeronaveId))
            .orElseThrow(() -> new RecursoNaoEncontradoException("Tripulante não encontrado."));

    tripulante.atualizar(dadosDe(request), Instant.now(relogio));
    return mapper.paraResponse(tripulante, LocalDate.now(relogio));
  }

  private DadosDoTripulante dadosDe(TripulanteRequest request) {
    return new DadosDoTripulante(
        request.nome(),
        request.canac(),
        request.funcao(),
        request.validadeCma(),
        request.validadeCht(),
        request.horasTotais(),
        request.telefone(),
        request.email(),
        request.situacao());
  }

  private void exigirAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    if (!aeronaves.existsById(aeronaveId)) {
      throw new RecursoNaoEncontradoException("Aeronave não encontrada.");
    }
  }
}
