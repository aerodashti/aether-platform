package br.com.aerodash.aether.aeronave;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A frota: quem está sob gestão e em que situação regulatória cada uma está. */
@Service
public class AeronaveService {

  private final AeronaveRepository aeronaves;
  private final AeronaveMapper mapper;
  private final PoliticaDeVencimento politica;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public AeronaveService(
      AeronaveRepository aeronaves,
      AeronaveMapper mapper,
      PoliticaDeVencimento politica,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.aeronaves = aeronaves;
    this.mapper = mapper;
    this.politica = politica;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public List<AeronaveResponse> listar() {
    LocalDate hoje = LocalDate.now(relogio);
    List<AeronaveResponse> frota =
        aeronaves.findAllByOrderByMatriculaAsc().stream()
            .map(aeronave -> mapper.paraLinhaDaFrota(aeronave, hoje, politica.diasDeAviso()))
            .toList();

    contexto.registrar("frota.aeronaves", frota.size());
    contexto.registrar(
        "frota.impedidas", frota.stream().filter(linha -> !linha.podeVoar()).count());
    return frota;
  }

  @Transactional(readOnly = true)
  public AeronaveResponse buscar(Long id) {
    contexto.registrar("aeronave.id", id);
    Aeronave aeronave =
        aeronaves
            .findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Aeronave não encontrada."));
    return mapper.paraLinhaDaFrota(aeronave, LocalDate.now(relogio), politica.diasDeAviso());
  }
}
