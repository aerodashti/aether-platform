package br.com.aerodash.aether.empresa;

import br.com.aerodash.aether.aeronave.PoliticaDeVencimento;
import org.springframework.stereotype.Component;

/**
 * A empresa respondendo à porta que a feature de aeronaves declarou.
 *
 * <p>A seta aponta para cá, e não o contrário: quem depende é quem implementa. É o que permite a
 * feature de aeronaves não saber que existe uma tela de Configurações mudando o número dela.
 */
@Component
public class PoliticaDeVencimentoDaEmpresa implements PoliticaDeVencimento {

  private final EmpresaService empresa;

  public PoliticaDeVencimentoDaEmpresa(EmpresaService empresa) {
    this.empresa = empresa;
  }

  @Override
  public int diasDeAviso() {
    return empresa.diasDeAviso();
  }
}
