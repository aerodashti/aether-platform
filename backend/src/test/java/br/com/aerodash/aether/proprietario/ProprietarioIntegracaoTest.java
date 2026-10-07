package br.com.aerodash.aether.proprietario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Os proprietários contra um PostgreSQL de verdade: migration, o CHECK do documento, a unicidade e
 * o ciclo desativar/reativar saindo pela borda HTTP.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Proprietários (integração)")
class ProprietarioIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private ProprietarioRepository proprietarios;
  @Autowired private ObjectMapper json;

  @Test
  @DisplayName("a lista sai ordenada por nome e traz o seed com o inativo")
  void listaOrdenada() throws Exception {
    // As asserções não usam índice fixo: outro teste desta classe insere linhas, e a ordem de
    // execução não pode decidir se este passa.
    mockMvc
        .perform(get("/proprietarios").cookie(entrar()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.nome=='Otávio Lins')].situacao").value("INATIVO"));

    List<Proprietario> lista = proprietarios.findAllByOrderByNomeAsc();
    assertThat(lista.stream().map(Proprietario::getNome))
        .containsSubsequence("Helena Sarraf", "Otávio Lins", "Ricardo Meirelles");
    // O cadastro mínimo do seed não tem documento — e a lista precisa conviver com isso.
    assertThat(lista.stream().filter(p -> p.getNome().equals("Helena Sarraf")))
        .allSatisfy(p -> assertThat(p.possuiCpfCnpj()).isFalse());
  }

  @Test
  @DisplayName("cadastrar, desativar e reativar pela borda HTTP")
  void cicloCompleto() throws Exception {
    Cookie sessao = entrar();

    MvcResult criado =
        mockMvc
            .perform(
                post("/proprietarios")
                    .cookie(sessao)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"nome":"Nova Participante","cpfCnpj":"09.581.577/0001-09",
                         "email":"CONTATO@NOVA.COM.BR","corDeIdentificacao":"CELESTE"}
                        """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.cpfCnpj").value("09581577000109"))
            .andExpect(jsonPath("$.email").value("contato@nova.com.br"))
            .andReturn();
    JsonNode corpo = json.readTree(criado.getResponse().getContentAsString());
    long id = corpo.get("id").asLong();

    mockMvc
        .perform(post("/proprietarios/" + id + "/desativacao").cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.situacao").value("INATIVO"));
    mockMvc
        .perform(post("/proprietarios/" + id + "/reativacao").cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.situacao").value("ATIVO"));
  }

  @Test
  @DisplayName("documento duplicado vira Problem Details 409, no campo e dizendo de quem é")
  void documentoDuplicadoVira409() throws Exception {
    mockMvc
        .perform(
            post("/proprietarios")
                .cookie(entrar())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Homônimo de Ricardo","cpfCnpj":"529.982.247-25",
                     "corDeIdentificacao":"AZUL"}
                    """))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.title").value("CPF ou CNPJ já cadastrado"))
        .andExpect(jsonPath("$.campos.cpfCnpj").value("Este documento já é de Ricardo Meirelles."));
  }

  @Test
  @DisplayName("o CNPJ alfanumérico passa pelo CHECK da coluna, sem pontuação e em maiúsculas")
  void cnpjAlfanumerico() throws Exception {
    mockMvc
        .perform(
            post("/proprietarios")
                .cookie(entrar())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Holding Alfanumérica","cpfCnpj":"12.abc.345/01de-35",
                     "corDeIdentificacao":"AMBAR"}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.cpfCnpj").value("12ABC34501DE35"));
  }

  @Test
  @DisplayName("o banco recusa documento fora de 11 ou 14 caracteres")
  void bancoRecusaDocumentoInvalido() {
    // A regra é também do banco, não só do service: é o CHECK que garante a forma mesmo para quem
    // escrever por SQL.
    for (String invalido : List.of("123", "12ABC34501DEAB", "1234567890A")) {
      Proprietario proprietario =
          new Proprietario(
              "Documento Errado", null, null, null, CorDeIdentificacao.CINZA, Instant.now());
      ReflectionTestUtils.setField(proprietario, "cpfCnpj", invalido);

      assertThatThrownBy(() -> proprietarios.saveAndFlush(proprietario))
          .isInstanceOf(DataIntegrityViolationException.class);
      assertThat(proprietarios.findByCpfCnpj(invalido)).isEmpty();
    }
  }

  @Test
  @DisplayName("a UNIQUE do documento é reconhecida e não leva o documento para a mensagem")
  void unicidadeReconhecidaSemVazarDocumento() {
    // O caminho de dois salvamentos simultâneos: só o banco percebe a repetição.
    Proprietario repetido =
        new Proprietario(
            "Segundo Ricardo", "52998224725", null, null, CorDeIdentificacao.AZUL, Instant.now());

    DataIntegrityViolationException violacao =
        catchThrowableOfType(
            DataIntegrityViolationException.class, () -> proprietarios.saveAndFlush(repetido));

    assertThat(ProprietarioService.violouDocumentoUnico(violacao)).isTrue();
    // O Hibernate grava essa mensagem em ERROR antes de qualquer tratamento: sem o
    // `logServerErrorDetail=false`, ela traria "Key (cpf_cnpj)=(52998224725) already exists".
    for (Throwable causa = violacao; causa != null; causa = causa.getCause()) {
      assertThat(causa.getMessage()).doesNotContain("52998224725");
    }
  }

  private Cookie entrar() throws Exception {
    MvcResult resultado =
        mockMvc
            .perform(
                post("/autenticacao/entrar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"email":"leonardo@administraair.com.br","senha":"%s"}
                        """
                            .formatted(SENHA)))
            .andExpect(status().isOk())
            .andReturn();
    return resultado.getResponse().getCookie("aether_sessao");
  }
}
