package br.com.aerodash.aether.aviso;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A Central de avisos: o que a frota pede de ação agora. Os avisos são derivados a cada leitura
 * (ColetorDeAvisos); o que se grava é só quem já leu qual.
 */
@Service
public class AvisoService {

  private final ColetorDeAvisos coletor;
  private final AvisoLidoRepository lidos;
  private final AeronaveRepository aeronaves;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public AvisoService(
      ColetorDeAvisos coletor,
      AvisoLidoRepository lidos,
      AeronaveRepository aeronaves,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.coletor = coletor;
    this.lidos = lidos;
    this.aeronaves = aeronaves;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public AvisosResponse listar(Long usuarioId) {
    List<Aviso> avisos = coletor.coletar(LocalDate.now(relogio));
    Set<String> jaLidos =
        lidos.findByUsuarioId(usuarioId).stream()
            .map(AvisoLido::getChave)
            .collect(Collectors.toSet());
    Map<Long, Aeronave> frota =
        aeronaves.findAllById(avisos.stream().map(Aviso::aeronaveId).distinct().toList()).stream()
            .collect(Collectors.toMap(Aeronave::getId, Function.identity()));

    List<AvisoResponse> resposta =
        avisos.stream()
            .map(aviso -> paraResposta(aviso, frota.get(aviso.aeronaveId()), jaLidos))
            .toList();
    long vencidos = avisos.stream().filter(Aviso::estaVencido).count();
    long naoLidos = resposta.stream().filter(aviso -> !aviso.lido()).count();
    contexto.registrar("avisos.ativos", avisos.size());
    contexto.registrar("avisos.naoLidos", naoLidos);
    return new AvisosResponse(
        resposta,
        new AvisosResponse.Indicadores(
            avisos.size(),
            naoLidos,
            vencidos,
            avisos.size() - vencidos,
            avisos.stream().map(Aviso::aeronaveId).distinct().count()));
  }

  /** Marcar duas vezes não duplica; desmarcar o que não estava marcado não é erro. */
  @Transactional
  public void marcar(Long usuarioId, LeituraRequest request) {
    Set<String> chaves = new HashSet<>(request.chaves());
    contexto.decisao("avisos.marcarComoLido", request.lido());
    contexto.registrar("avisos.marcados", chaves.size());
    if (!request.lido()) {
      lidos.deleteByUsuarioIdAndChaveIn(usuarioId, chaves);
      return;
    }
    Set<String> jaLidos =
        lidos.findByUsuarioId(usuarioId).stream()
            .map(AvisoLido::getChave)
            .collect(Collectors.toSet());
    Instant agora = Instant.now(relogio);
    lidos.saveAll(
        chaves.stream()
            .filter(chave -> !jaLidos.contains(chave))
            .map(chave -> new AvisoLido(usuarioId, chave, agora))
            .toList());
  }

  private static AvisoResponse paraResposta(Aviso aviso, Aeronave aeronave, Set<String> jaLidos) {
    return new AvisoResponse(
        aviso.chave(),
        aviso.categoria(),
        aviso.gravidade(),
        aviso.titulo(),
        aviso.detalhe(),
        aviso.aeronaveId(),
        aeronave == null ? null : aeronave.getMatricula(),
        aeronave == null ? null : aeronave.getModelo(),
        aviso.prazo(),
        aviso.destino(),
        jaLidos.contains(aviso.chave()));
  }
}
