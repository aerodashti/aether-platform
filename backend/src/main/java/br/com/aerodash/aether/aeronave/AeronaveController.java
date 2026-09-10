package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * A frota.
 *
 * <p>Exige sessão, mas não papel: a lista da frota é o chão de toda a operação, e restringi-la a um
 * papel esconderia do proprietário exatamente aquilo de que ele é dono. Quem fecha a rota é {@code
 * ConfiguracaoDeSeguranca}, com o {@code anyRequest().authenticated()}.
 */
@RestController
@RequestMapping("/aeronaves")
@Tag(name = "Aeronaves", description = "A frota sob gestão e sua situação regulatória")
public class AeronaveController {

  private final AeronaveService aeronaves;

  public AeronaveController(AeronaveService aeronaves) {
    this.aeronaves = aeronaves;
  }

  @GetMapping
  @Operation(
      summary = "Lista a frota em ordem de matrícula, com a situação regulatória de cada uma")
  public List<AeronaveResponse> listar() {
    return aeronaves.listar();
  }

  @GetMapping("/{id}")
  @Operation(summary = "Devolve o detalhe de uma aeronave: ficha técnica e configuração")
  public DetalheDaAeronaveResponse buscar(@PathVariable Long id) {
    return aeronaves.buscar(id);
  }

  @PutMapping("/{id}/ficha-tecnica")
  @Operation(summary = "Atualiza os dados de identificação da ficha técnica")
  public DetalheDaAeronaveResponse atualizarFichaTecnica(
      @PathVariable Long id, @Valid @RequestBody FichaTecnicaRequest request) {
    return aeronaves.atualizarFichaTecnica(id, request);
  }

  @PutMapping("/{id}/contadores")
  @Operation(summary = "Corrige os totais acumulados — rota de administrador")
  public DetalheDaAeronaveResponse corrigirContadores(
      @PathVariable Long id, @Valid @RequestBody ContadoresRequest request) {
    return aeronaves.corrigirContadores(id, request);
  }

  @PutMapping("/{id}/configuracao-financeira")
  @Operation(summary = "Atualiza a base do rateio, o aporte e o dia de fechamento")
  public DetalheDaAeronaveResponse atualizarConfiguracaoFinanceira(
      @PathVariable Long id, @Valid @RequestBody ConfiguracaoFinanceiraRequest request) {
    return aeronaves.atualizarConfiguracaoFinanceira(id, request);
  }
}
