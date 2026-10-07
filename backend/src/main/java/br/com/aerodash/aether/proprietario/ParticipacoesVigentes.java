package br.com.aerodash.aether.proprietario;

/**
 * Se o proprietário está em algum contrato vigente. Porta declarada aqui e respondida por {@code
 * participacao}, que governa os contratos — veja {@code docs/arquitetura.md}.
 */
public interface ParticipacoesVigentes {

  boolean participaDeContratoVigente(Long proprietarioId);
}
