package br.com.aerodash.aether.aporte;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.aeronave.FiltroPorAeronave;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Os rendimentos: o que a aplicação do saldo do fundo de cada aeronave rendeu. */
@Service
public class RendimentoService {

  private final RendimentoRepository rendimentos;
  private final AeronaveRepository aeronaves;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public RendimentoService(
      RendimentoRepository rendimentos,
      AeronaveRepository aeronaves,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.rendimentos = rendimentos;
    this.aeronaves = aeronaves;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public RendimentosResponse listar(Long aeronaveId, YearMonth de, YearMonth ate) {
    PeriodoDeCompetencias periodo =
        RecorteDoFundo.exigirPeriodo("rendimentos", de, ate, YearMonth.now(relogio), contexto);
    FiltroPorAeronave.exigirExistente("rendimentos", aeronaveId, aeronaves::existsById, contexto);
    List<Rendimento> recorte =
        aeronaveId == null
            ? rendimentos.findByDataBetweenOrderByDataDescIdDesc(
                periodo.primeiroDia(), periodo.ultimoDia())
            : rendimentos.findByAeronaveIdAndDataBetweenOrderByDataDescIdDesc(
                aeronaveId, periodo.primeiroDia(), periodo.ultimoDia());

    contexto.registrar("rendimentos.quantidade", recorte.size());
    BigDecimal total =
        recorte.stream().map(Rendimento::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new RendimentosResponse(paraLinhas(recorte), total);
  }

  @Transactional
  public RendimentoResponse criar(RendimentoRequest request) {
    contexto.registrar("aeronave.id", request.aeronaveId());
    if (!aeronaves.existsById(request.aeronaveId())) {
      throw new RecursoNaoEncontradoException("Aeronave não encontrada.");
    }

    Rendimento rendimento =
        new Rendimento(request.aeronaveId(), dadosDe(request), Instant.now(relogio));
    exigirCreditado(rendimento);
    rendimento = rendimentos.save(rendimento);
    contexto.registrar("rendimento.id", rendimento.getId());
    return paraLinhas(List.of(rendimento)).get(0);
  }

  @Transactional
  public RendimentoResponse atualizar(Long id, RendimentoRequest request) {
    Rendimento rendimento = exigirRendimento(id);
    boolean trocaDeAeronave = !Objects.equals(request.aeronaveId(), rendimento.getAeronaveId());
    contexto.decisao("rendimento.trocaDeAeronave", trocaDeAeronave);
    if (trocaDeAeronave) {
      throw new AporteInvalidoException(
          "Rendimento inválido",
          "A aeronave do rendimento não muda: exclua e registre na aeronave certa.");
    }

    rendimento.atualizar(dadosDe(request), Instant.now(relogio));
    // Recusar depois de alterar é seguro: a exceção desfaz a transação antes do flush.
    exigirCreditado(rendimento);
    return paraLinhas(List.of(rendimento)).get(0);
  }

  @Transactional
  public void excluir(Long id) {
    rendimentos.delete(exigirRendimento(id));
    contexto.registrar("rendimento.excluido", id);
  }

  private void exigirCreditado(Rendimento rendimento) {
    boolean noFuturo = rendimento.estaNoFuturo(LocalDate.now(relogio));
    contexto.decisao("rendimento.dataNoFuturo", noFuturo);
    if (noFuturo) {
      throw new AporteInvalidoException(
          "Rendimento inválido", "Registre o rendimento depois que o crédito cair na conta.");
    }
  }

  private DadosDoRendimento dadosDe(RendimentoRequest request) {
    return new DadosDoRendimento(
        request.data(),
        request.aplicacao(),
        request.saldoAplicado(),
        request.taxa(),
        request.valor());
  }

  private Rendimento exigirRendimento(Long id) {
    contexto.registrar("rendimento.id", id);
    return rendimentos
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Rendimento não encontrado."));
  }

  private List<RendimentoResponse> paraLinhas(List<Rendimento> recorte) {
    Map<Long, Aeronave> frota =
        aeronaves
            .findAllById(recorte.stream().map(Rendimento::getAeronaveId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(Aeronave::getId, Function.identity()));
    return recorte.stream()
        .map(
            rendimento -> {
              Aeronave aeronave = frota.get(rendimento.getAeronaveId());
              return new RendimentoResponse(
                  rendimento.getId(),
                  rendimento.getAeronaveId(),
                  aeronave == null ? null : aeronave.getMatricula(),
                  rendimento.getData(),
                  rendimento.getCompetencia(),
                  rendimento.getAplicacao(),
                  rendimento.getSaldoAplicado(),
                  rendimento.getTaxa(),
                  rendimento.getValor());
            })
        .toList();
  }
}
