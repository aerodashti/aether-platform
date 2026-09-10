package br.com.aerodash.aether.proprietario;

/**
 * A cor com que o proprietário aparece na interface — no ponto ao lado do nome e, quando o
 * calendário existir, nos trechos voados por ele.
 *
 * <p>É uma paleta fechada, não um hex livre: cada valor mapeia para um token do design system no
 * front, o que mantém as duas variantes de tema legíveis sem que o servidor saiba de cor nenhuma.
 */
public enum CorDeIdentificacao {
  PETROLEO,
  AZUL,
  CELESTE,
  VERDE,
  AMBAR,
  CINZA
}
