package br.com.aerodash.aether.empresa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Configurações contra um PostgreSQL de verdade.
 *
 * <p>O teste que importa é o último: mudar a antecedência de aviso muda a coluna Situação da tela
 * de Aeronaves. É o que prova que a configuração configura algo — sem ele, a tela seria um
 * formulário bonito ligado a nada.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Configurações (integração)")
class EmpresaIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String ADMINISTRADOR = "leonardo@administraair.com.br";
  private static final String GESTOR = "patricia@administraair.com.br";
  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private EmpresaRepository empresas;

  @Test
  @DisplayName("a migration cria a empresa: a tela nunca abre vazia")
  void migrationCriaAEmpresa() {
    assertThat(empresas.findById(Empresa.ID))
        .get()
        .satisfies(
            empresa -> {
              assertThat(empresa.getCnpj()).isEqualTo("19274653000188");
              assertThat(empresa.getDiasDeAviso()).isEqualTo(30);
            });
    assertThat(empresas.count()).isEqualTo(1);
  }

  @Test
  @DisplayName("gestor lê, mas não escreve")
  void gestorLeMasNaoEscreve() throws Exception {
    Cookie sessao = entrar(GESTOR);

    mockMvc.perform(get("/empresa").cookie(sessao)).andExpect(status().isOk());

    mockMvc
        .perform(
            put("/empresa/aviso-de-vencimento")
                .cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"diasDeAviso":90}
                    """))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("mudar a antecedência de aviso muda a Situação da frota — a configuração configura")
  void mudarOAvisoMudaASituacaoDaFrota() throws Exception {
    Cookie sessao = entrar(ADMINISTRADOR);

    // PT-XLB tem a RETA vencendo em ~12 dias: com aviso de 30 dias ela está em ATENCAO.
    mockMvc
        .perform(get("/aeronaves").cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.matricula=='PT-XLB')].situacaoRegular").value("ATENCAO"));

    // Encolhendo a janela para 5 dias, os mesmos 12 dias deixam de ser atenção.
    mockMvc
        .perform(
            put("/empresa/aviso-de-vencimento")
                .cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"diasDeAviso":5}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.diasDeAviso").value(5));

    mockMvc
        .perform(get("/aeronaves").cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.matricula=='PT-XLB')].situacaoRegular").value("REGULAR"))
        // O vencido continua vencido: encolher a janela não ressuscita documento vencido.
        .andExpect(jsonPath("$[?(@.matricula=='PP-JHF')].situacaoRegular").value("VENCIDO"));

    // Devolve o valor de partida: o banco é compartilhado entre os testes desta classe.
    mockMvc
        .perform(
            put("/empresa/aviso-de-vencimento")
                .cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"diasDeAviso":30}
                    """))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("o CNPJ não muda nem quando o corpo tenta")
  void oCnpjNaoMuda() throws Exception {
    mockMvc
        .perform(
            put("/empresa")
                .cookie(entrar(ADMINISTRADOR))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nomeFantasia":"Administra Air","razaoSocial":"Administra Air LTDA",
                     "email":"contato@administraair.com.br","telefone":"+55 11 3000-0000",
                     "cnpj":"00000000000000"}
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.cnpj").value("19274653000188"));
  }

  private Cookie entrar(String email) throws Exception {
    MvcResult resultado =
        mockMvc
            .perform(
                post("/autenticacao/entrar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"email":"%s","senha":"%s"}
                        """
                            .formatted(email, SENHA)))
            .andExpect(status().isOk())
            .andReturn();
    return resultado.getResponse().getCookie("aether_sessao");
  }
}
