package br.com.aerodash.aether.comum.observabilidade;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Set;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;

/**
 * Lista de campos que podem aparecer em claro no log.
 *
 * <p>A política inteira mora em {@code observabilidade/campos-permitidos.yml}: este componente só
 * lê o arquivo. Qualquer campo fora da lista é mascarado pelo {@link SanitizadorDeLog}.
 */
@Component
public class PoliticaDeCamposPermitidos {

  private static final String ARQUIVO = "observabilidade/campos-permitidos.yml";

  private final Set<String> permitidos;

  public PoliticaDeCamposPermitidos() {
    this.permitidos = Set.copyOf(carregar());
  }

  public boolean permite(String campo) {
    return permitidos.contains(campo);
  }

  @SuppressWarnings("unchecked")
  private static List<String> carregar() {
    try (InputStream entrada = new ClassPathResource(ARQUIVO).getInputStream()) {
      Object raiz = new Yaml().load(entrada);
      if (raiz instanceof java.util.Map<?, ?> mapa && mapa.get("campos") instanceof List<?> lista) {
        return (List<String>) lista;
      }
      throw new IllegalStateException(ARQUIVO + " precisa ter uma chave 'campos' com uma lista.");
    } catch (IOException falha) {
      throw new IllegalStateException("Não foi possível ler " + ARQUIVO, falha);
    }
  }
}
