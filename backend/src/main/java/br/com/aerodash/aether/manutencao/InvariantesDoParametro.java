package br.com.aerodash.aether.manutencao;

import static br.com.aerodash.aether.manutencao.Recusa.recusarSe;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

/**
 * O que o parâmetro precisa cumprir antes de ser gravado, cada recusa no campo de onde ela vem. As
 * regras são da entidade; aqui se decide a ordem, a mensagem e o campo — e a unicidade do nome, que
 * pergunta ao banco.
 */
@Component
class InvariantesDoParametro {

  private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final ParametroDeControleRepository parametros;
  private final ContextoDaRequisicao contexto;

  InvariantesDoParametro(ParametroDeControleRepository parametros, ContextoDaRequisicao contexto) {
    this.parametros = parametros;
    this.contexto = contexto;
  }

  void exigir(ParametroDeControle parametro, LocalDate hoje) {
    recusarSe(
        contexto,
        "parametro.semLimite",
        !parametro.possuiLimiteCoerente(),
        () -> faltaDoLimite(parametro));
    recusarSe(
        contexto,
        "parametro.dataLimiteForaDaJanela",
        !parametro.possuiDataLimitePlausivel(hoje),
        () -> dataLimiteForaDaJanela(hoje));
    recusarSe(
        contexto,
        "parametro.limiteFracionado",
        !parametro.possuiLimiteNaEscalaDaRegua(),
        () ->
            new ManutencaoInvalidaException(
                "Ciclos são inteiros: informe o limite sem casas decimais.", "limite"));
    recusarSe(
        contexto,
        "parametro.avisoFracionado",
        !parametro.possuiAvisoNaEscalaDaRegua(),
        () ->
            new ManutencaoInvalidaException(
                "Em ciclos e em dias, a faixa de aviso é um número inteiro.", "aviso"));
    recusarSe(
        contexto,
        "parametro.avisoAlemDoLimite",
        !parametro.possuiAvisoAntesDoLimite(),
        () ->
            new ManutencaoInvalidaException(
                "A faixa de aviso precisa ser menor que o limite.", "aviso"));
    recusarSe(
        contexto,
        "parametro.nomeRepetido",
        nomeJaUsado(parametro),
        ParametroDuplicadoException::new);
  }

  /** A frase de quem cadastrou horas fala de horas, não de "data limite". */
  private static ManutencaoInvalidaException faltaDoLimite(ParametroDeControle parametro) {
    return switch (parametro.getTipo()) {
      case HORAS ->
          new ManutencaoInvalidaException("Informe o limite em horas de célula.", "limite");
      case CICLOS -> new ManutencaoInvalidaException("Informe o limite em ciclos.", "limite");
      case DATA -> new ManutencaoInvalidaException("Informe a data limite.", "dataLimite");
    };
  }

  private static ManutencaoInvalidaException dataLimiteForaDaJanela(LocalDate hoje) {
    return new ManutencaoInvalidaException(
        "Use uma data entre %s e %s."
            .formatted(
                DATA.format(ParametroDeControle.primeiraDataLimite()),
                DATA.format(ParametroDeControle.ultimaDataLimite(hoje))),
        "dataLimite");
  }

  private boolean nomeJaUsado(ParametroDeControle parametro) {
    Long aeronaveId = parametro.getAeronaveId();
    return parametro.getId() == null
        ? parametros.existsByAeronaveIdAndNomeIgnoreCase(aeronaveId, parametro.getNome())
        : parametros.existsByAeronaveIdAndNomeIgnoreCaseAndIdNot(
            aeronaveId, parametro.getNome(), parametro.getId());
  }
}
