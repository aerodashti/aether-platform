package br.com.aerodash.aether.fechamento;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aporte.AporteRepository;
import br.com.aerodash.aether.aporte.RendimentoRepository;
import br.com.aerodash.aether.custo.CustoRepository;
import br.com.aerodash.aether.custo.TipoDeCusto;
import br.com.aerodash.aether.participacao.ContratoDeParticipacaoRepository;
import br.com.aerodash.aether.participacao.Participacao;
import br.com.aerodash.aether.voo.TrechoRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Traduz a história de uma aeronave, espalhada pelas features donas, nos movimentos que a
 * calculadora entende.
 *
 * <p>O fechamento é uma leitura que consolida: não grava nada e não muda nenhuma regra das features
 * que lê. Por isso importa os repositórios delas direto, em vez de uma porta por feature — nenhuma
 * delas importa o fechamento, e o ArchUnit continua sem ciclo (ADR-0019).
 */
@Component
class LeitorDeMovimentos {

  private final CustoRepository custos;
  private final TrechoRepository trechos;
  private final AporteRepository aportes;
  private final RendimentoRepository rendimentos;
  private final ContratoDeParticipacaoRepository contratos;

  LeitorDeMovimentos(
      CustoRepository custos,
      TrechoRepository trechos,
      AporteRepository aportes,
      RendimentoRepository rendimentos,
      ContratoDeParticipacaoRepository contratos) {
    this.custos = custos;
    this.trechos = trechos;
    this.aportes = aportes;
    this.rendimentos = rendimentos;
    this.contratos = contratos;
  }

  MovimentosDaAeronave ler(Aeronave aeronave) {
    Long id = aeronave.getId();
    return new MovimentosDaAeronave(
        aeronave.getConfiguracaoFinanceira().baseDoRateio(),
        aeronave.getConfiguracaoFinanceira().saldoDeAbertura(),
        quadros(id),
        custos.findByAeronaveIdOrderByDataDescIdDesc(id).stream()
            .map(
                custo ->
                    new MovimentosDaAeronave.Custo(
                        custo.getData(),
                        custo.getTipo() == TipoDeCusto.FIXO,
                        custo.getProprietarioId(),
                        custo.getRelatorioDeVoo(),
                        custo.getValor()))
            .toList(),
        trechos.findByAeronaveIdOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc(id).stream()
            .map(
                trecho ->
                    new MovimentosDaAeronave.Horas(
                        trecho.getData(),
                        trecho.getRelatorioDeVoo(),
                        trecho.getProprietarioId(),
                        trecho.horasParaRateio()))
            .toList(),
        aportes.findByAeronaveId(id).stream()
            .map(
                aporte ->
                    new MovimentosDaAeronave.Aporte(
                        aporte.getCompetencia(), aporte.getProprietarioId(), aporte.getValor()))
            .toList(),
        rendimentos.findByAeronaveId(id).stream()
            .map(
                rendimento ->
                    new MovimentosDaAeronave.Rendimento(
                        rendimento.getData(), rendimento.getValor()))
            .toList());
  }

  private List<QuadroDeParticipacao> quadros(Long aeronaveId) {
    return contratos.findByAeronaveIdOrderByInicioDaVigenciaAsc(aeronaveId).stream()
        .map(
            contrato ->
                new QuadroDeParticipacao(
                    contrato.getInicioDaVigencia(),
                    contrato.getFimDaVigencia(),
                    contrato.getParticipacoes().stream()
                        .collect(
                            Collectors.toUnmodifiableMap(
                                Participacao::getProprietarioId, Participacao::getPercentual))))
        .toList();
  }
}
