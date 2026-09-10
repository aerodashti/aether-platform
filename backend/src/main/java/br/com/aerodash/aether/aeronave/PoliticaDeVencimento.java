package br.com.aerodash.aether.aeronave;

/**
 * Com quantos dias de antecedência um vencimento vira atenção.
 *
 * <p>É uma porta, declarada pela feature que **consome** o número. A feature de aeronaves não sabe
 * que existe uma empresa, nem uma tela de Configurações: ela sabe que alguém responde a esta
 * pergunta. Quem responde hoje é {@code empresa}; trocar a fonte não toca em nenhuma regra daqui.
 *
 * <p>É assim que duas features compartilham um valor sem uma conhecer a outra — veja {@code
 * docs/arquitetura.md}.
 */
public interface PoliticaDeVencimento {

  int diasDeAviso();
}
