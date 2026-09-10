package br.com.aerodash.aether.empresa;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Os dados da conta.
 *
 * <p>Ler é de quem tem sessão — o nome da empresa aparece na interface inteira. **Escrever é só do
 * administrador**, e a regra está em {@code ConfiguracaoDeSeguranca}, que é a fonte única de quem
 * entra onde.
 */
@RestController
@RequestMapping("/empresa")
@Tag(name = "Empresa", description = "Dados da conta e política de aviso de vencimento")
public class EmpresaController {

  private final EmpresaService empresa;

  public EmpresaController(EmpresaService empresa) {
    this.empresa = empresa;
  }

  @GetMapping
  @Operation(summary = "Devolve os dados da empresa e a antecedência de aviso vigente")
  public EmpresaResponse consultar() {
    return empresa.consultar();
  }

  @PutMapping
  @Operation(summary = "Altera os dados de contato da empresa; o CNPJ não muda")
  public EmpresaResponse alterarDados(@Valid @RequestBody AlterarEmpresaRequest requisicao) {
    return empresa.alterarDados(requisicao);
  }

  @PutMapping("/aviso-de-vencimento")
  @Operation(summary = "Altera com quantos dias de antecedência o sistema avisa")
  public EmpresaResponse alterarAviso(@Valid @RequestBody AlterarAvisoRequest requisicao) {
    return empresa.alterarAviso(requisicao.diasDeAviso());
  }
}
