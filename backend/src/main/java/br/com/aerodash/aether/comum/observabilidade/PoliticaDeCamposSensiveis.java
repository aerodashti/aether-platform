package br.com.aerodash.aether.comum.observabilidade;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;

/**
 * Quais campos precisam ser mascarados no log, e como.
 *
 * <p>A política inteira mora em {@code observabilidade/campos-sensiveis.yml}: este componente só lê
 * o arquivo e aplica a máscara. Campo que não está lá aparece em claro.
 */
@Component
public class PoliticaDeCamposSensiveis {

  private static final String ARQUIVO = "observabilidade/campos-sensiveis.yml";
  private static final String OCULTO = "***";
  private static final String ESTRATEGIA_CPF = "cpf";
  private static final int DIGITOS_DO_CPF = 11;

  private final Map<String, String> estrategiaPorCampo;

  public PoliticaDeCamposSensiveis() {
    this.estrategiaPorCampo = Map.copyOf(carregar());
  }

  public boolean ehSensivel(String campo) {
    return estrategiaPorCampo.containsKey(campo);
  }

  /** Aplica a máscara configurada para o campo. Estratégia desconhecida esconde tudo. */
  public String mascarar(String campo, Object valor) {
    if (ESTRATEGIA_CPF.equals(estrategiaPorCampo.get(campo))) {
      return mascararCpf(valor);
    }
    return OCULTO;
  }

  /** Preserva os cinco últimos dígitos: {@code 12345678901} vira {@code ***.***.789-01}. */
  private static String mascararCpf(Object valor) {
    if (valor == null) {
      return OCULTO;
    }
    String digitos = String.valueOf(valor).replaceAll("\\D", "");
    if (digitos.length() != DIGITOS_DO_CPF) {
      return OCULTO;
    }
    return "***.***." + digitos.substring(6, 9) + "-" + digitos.substring(9);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, String> carregar() {
    try (InputStream entrada = new ClassPathResource(ARQUIVO).getInputStream()) {
      Object raiz = new Yaml().load(entrada);
      if (raiz instanceof Map<?, ?> mapa && mapa.get("campos") instanceof Map<?, ?> campos) {
        return (Map<String, String>) campos;
      }
      throw new IllegalStateException(ARQUIVO + " precisa ter uma chave 'campos' com um mapa.");
    } catch (IOException falha) {
      throw new IllegalStateException("Não foi possível ler " + ARQUIVO, falha);
    }
  }
}
