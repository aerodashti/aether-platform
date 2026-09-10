package br.com.aerodash.aether.empresa;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Os dados da conta e a política de aviso de vencimento.
 *
 * <p>A política vive aqui, e não num arquivo de configuração, porque ela é decisão de quem
 * administra a empresa — muda pela tela, sem deploy, e é lida pela feature de aeronaves a cada
 * consulta.
 */
@Service
public class EmpresaService {

  private final EmpresaRepository empresas;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public EmpresaService(EmpresaRepository empresas, Clock relogio, ContextoDaRequisicao contexto) {
    this.empresas = empresas;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public EmpresaResponse consultar() {
    return paraResponse(exigirEmpresa());
  }

  /**
   * A antecedência de aviso, para quem precisa dela sem precisar do resto.
   *
   * <p>É o ponto de entrada que a feature de aeronaves consome. Devolve um número, e não a
   * entidade, justamente para que uma feature não passe a depender do modelo de outra.
   */
  @Transactional(readOnly = true)
  public int diasDeAviso() {
    return exigirEmpresa().getDiasDeAviso();
  }

  @Transactional
  public EmpresaResponse alterarDados(AlterarEmpresaRequest requisicao) {
    Empresa empresa = exigirEmpresa();
    empresa.alterarDados(
        requisicao.nomeFantasia(),
        requisicao.razaoSocial(),
        requisicao.email(),
        requisicao.telefone(),
        Instant.now(relogio));
    return paraResponse(empresa);
  }

  @Transactional
  public EmpresaResponse alterarAviso(int diasDeAviso) {
    contexto.registrar("empresa.dias_de_aviso", diasDeAviso);
    Empresa empresa = exigirEmpresa();
    empresa.alterarAvisoDeVencimento(diasDeAviso, Instant.now(relogio));
    return paraResponse(empresa);
  }

  /**
   * A linha nasce na migration, então ausência aqui é banco corrompido, não caso de negócio. Vira
   * 404 porque não há resposta melhor — e o log guarda o quê.
   */
  private Empresa exigirEmpresa() {
    return empresas
        .findById(Empresa.ID)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Empresa não encontrada."));
  }

  private static EmpresaResponse paraResponse(Empresa empresa) {
    return new EmpresaResponse(
        empresa.getNomeFantasia(),
        empresa.getRazaoSocial(),
        empresa.getCnpj(),
        empresa.getEmail(),
        empresa.getTelefone(),
        empresa.getDiasDeAviso());
  }
}
