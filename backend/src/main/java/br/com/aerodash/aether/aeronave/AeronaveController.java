package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
  @Operation(summary = "Devolve uma aeronave")
  public AeronaveResponse buscar(@PathVariable Long id) {
    return aeronaves.buscar(id);
  }
}
