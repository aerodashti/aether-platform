package br.com.aerodash.aether.voo;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

/**
 * As recusas do trecho antes de gravar — atribuição, horários e data. A regra de cada uma mora na
 * entidade ({@link Trecho}, {@link ParDeHorarios}); aqui ficam a decisão registrada e a recusa com
 * o nome do campo do request, para a tela marcá-lo. Os limites são os mesmos de {@code
 * features/voos/componentes/validacaoDoTrecho.ts}.
 *
 * <p>O mesmo nº de trecho no mesmo Rel. Voo não é recusado: duplicidade não bloqueia o lançamento
 * (decisão de produto D7).
 */
@Component
public class ValidacaoDoTrecho {

  /** O relógio de bordo e o do servidor não batem ao segundo (decisão de produto D1). */
  static final Duration FOLGA_DO_RELOGIO = Duration.ofMinutes(15);

  private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private static final CamposDoPar PREVISTO =
      new CamposDoPar("previsto", "partidaPrevista", "pousoPrevisto");
  private static final CamposDoPar REALIZADO =
      new CamposDoPar("realizado", "partidaRealizada", "pousoRealizado");

  private final ProprietarioRepository proprietarios;
  private final ParticipantesDoVoo participantes;
  private final ContextoDaRequisicao contexto;

  public ValidacaoDoTrecho(
      ProprietarioRepository proprietarios,
      ParticipantesDoVoo participantes,
      ContextoDaRequisicao contexto) {
    this.proprietarios = proprietarios;
    this.participantes = participantes;
    this.contexto = contexto;
  }

  /** Só quem é ou foi dono da aeronave, e está ativo, recebe o trecho; nulo é manutenção. */
  public void exigirAtribuicaoValida(Long aeronaveId, Long proprietarioId) {
    contexto.decisao("trecho.vooDeManutencao", proprietarioId == null);
    if (proprietarioId == null) {
      return;
    }
    Proprietario proprietario =
        proprietarios
            .findById(proprietarioId)
            .orElseThrow(
                () -> new VooInvalidoException("Proprietário não encontrado.", "proprietarioId"));
    contexto.decisao("trecho.proprietarioAtivo", proprietario.estaAtivo());
    if (!proprietario.estaAtivo()) {
      throw new VooInvalidoException(
          "Proprietário inativo não recebe atribuição de voo: reative "
              + proprietario.getNome()
              + " antes.",
          "proprietarioId");
    }
    boolean participa = participantes.participaOuParticipou(aeronaveId, proprietarioId);
    contexto.decisao("trecho.proprietarioParticipa", participa);
    if (!participa) {
      throw new VooInvalidoException(
          proprietario.getNome()
              + " nunca participou desta aeronave: inclua-o no contrato ou lance como manutenção.",
          "proprietarioId");
    }
  }

  /** Os dois pares coerentes, o realizado inteiro e nada realizado depois de agora. */
  public void exigirHorariosCoerentes(Trecho trecho, Instant agora) {
    exigirRealizadoInteiro(trecho.realizado());
    exigirParCoerente(trecho.previsto(), PREVISTO, trecho.getData());
    exigirParCoerente(trecho.realizado(), REALIZADO, trecho.getData());
    boolean realizadoNoPassado = trecho.possuiRealizadoAte(agora.plus(FOLGA_DO_RELOGIO));
    contexto.decisao("trecho.realizadoNoPassado", realizadoNoPassado);
    if (!realizadoNoPassado) {
      throw new VooInvalidoException(
          "O horário realizado não pode estar no futuro.", REALIZADO.pouso());
    }
  }

  public void exigirDataNaJanela(Trecho trecho, LocalDate hoje) {
    Trecho.JanelaDeDatas janela = trecho.janelaDaData(hoje);
    boolean naJanela = janela.contem(trecho.getData());
    contexto.decisao("trecho.dataNaJanela", naJanela);
    if (!naJanela) {
      throw new VooInvalidoException(
          "Use uma data de "
              + janela.minimo().format(DATA)
              + " a "
              + janela.maximo().format(DATA)
              + ".",
          "data");
    }
  }

  /** O realizado vem completo ou vazio (decisão D18): a metade não move contador nenhum. */
  private void exigirRealizadoInteiro(ParDeHorarios realizado) {
    boolean semPartida = realizado.possuiPousoSemPartida();
    contexto.decisao("trecho.realizadoSemPartida", semPartida);
    if (semPartida) {
      throw new VooInvalidoException("Informe também a partida realizada.", REALIZADO.partida());
    }
    boolean semPouso = realizado.possuiPartidaSemPouso();
    contexto.decisao("trecho.realizadoSemPouso", semPouso);
    if (semPouso) {
      throw new VooInvalidoException("Informe também o pouso realizado.", REALIZADO.pouso());
    }
  }

  private void exigirParCoerente(ParDeHorarios par, CamposDoPar campos, LocalDate data) {
    String chave = "trecho." + campos.nome() + ".";
    boolean pousoDepois = par.possuiPousoDepoisDaPartida();
    contexto.decisao(chave + "pousoDepoisDaPartida", pousoDepois);
    if (!pousoDepois) {
      throw new VooInvalidoException("O pouso precisa ser depois da partida.", campos.pouso());
    }
    boolean duracaoPlausivel = par.possuiDuracaoPlausivel();
    contexto.decisao(chave + "duracaoPlausivel", duracaoPlausivel);
    if (!duracaoPlausivel) {
      throw new VooInvalidoException("Um trecho dura no máximo 24 h.", campos.pouso());
    }
    boolean partidaPerto = par.possuiPartidaPertoDe(data);
    contexto.decisao(chave + "partidaPertoDaData", partidaPerto);
    if (!partidaPerto) {
      throw new VooInvalidoException(
          "A partida precisa ser no máximo 1 dia antes ou depois da data do trecho.",
          campos.partida());
    }
  }

  /** Os nomes no request dos dois horários de um par, para a recusa apontar o campo. */
  private record CamposDoPar(String nome, String partida, String pouso) {}
}
