package br.com.aerodash.aether.autenticacao;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Quem entra em cada rota. É a segunda metade do {@code docs/adr/0013-sessao-opaca-em-cookie.md},
 * que adiou a cadeia de filtros até existir a primeira tela autorizada por papel.
 *
 * <p>A lista abaixo é a única fonte de "isto é público": nenhum controller repete a decisão em
 * anotação. Rota nova nasce fechada — é o comportamento do starter, e é o certo.
 */
@Configuration
@EnableWebSecurity
public class ConfiguracaoDeSeguranca {

  private final FiltroDeSessao filtroDeSessao;
  private final RespostaDeAcessoNegado recusa;

  public ConfiguracaoDeSeguranca(FiltroDeSessao filtroDeSessao, RespostaDeAcessoNegado recusa) {
    this.filtroDeSessao = filtroDeSessao;
    this.recusa = recusa;
  }

  @Bean
  public SecurityFilterChain cadeiaDeFiltros(HttpSecurity http) throws Exception {
    return http.authorizeHttpRequests(
            rotas ->
                rotas
                    // Trocar a própria senha é ato de quem já entrou: precisa vir antes da
                    // liberação de /autenticacao/**, porque nesta cadeia a primeira regra que
                    // casa é a que vale.
                    .requestMatchers("/autenticacao/senha", "/autenticacao/senha/token")
                    .authenticated()
                    // A área não logada: entrar, sair, recuperar senha e concluir o convite.
                    .requestMatchers("/autenticacao/**")
                    .permitAll()
                    // Sonda de saúde: precisa responder antes de qualquer sessão existir.
                    .requestMatchers(HttpMethod.GET, "/saude", "/saude/**")
                    .permitAll()
                    .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
                    .permitAll()
                    // O nome da empresa aparece na interface inteira: ler é de quem tem sessão.
                    .requestMatchers(HttpMethod.GET, "/empresa")
                    .authenticated()
                    // Editar os dados da conta e a política de aviso, não.
                    .requestMatchers("/empresa", "/empresa/**")
                    .hasRole(PapelDoUsuario.ADMINISTRADOR.name())
                    .requestMatchers("/usuarios/**")
                    .hasRole(PapelDoUsuario.ADMINISTRADOR.name())
                    // O nome e a cor do proprietário aparecem em grades da operação inteira:
                    // ler é de quem tem sessão. Mexer no cadastro é de quem gere a conta.
                    .requestMatchers(HttpMethod.GET, "/proprietarios")
                    .authenticated()
                    .requestMatchers("/proprietarios", "/proprietarios/**")
                    .hasAnyRole(PapelDoUsuario.ADMINISTRADOR.name(), PapelDoUsuario.GESTOR.name())
                    .anyRequest()
                    .authenticated())
        // O estado da sessão é a linha em `sessao_de_acesso`, não a HttpSession do container:
        // criar uma segunda noção de sessão aqui daria dois lugares para expirar de formas
        // diferentes.
        .sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        // Sem CSRF porque não há request entre sites a proteger: o cookie é `SameSite=Lax`, o que
        // já impede o navegador de mandá-lo num POST vindo de outro site, e nenhum fluxo do
        // produto depende disso. Ver ADR 0013.
        .csrf(csrf -> csrf.disable())
        // O produto não tem formulário do Spring nem Basic: quem autentica é o FiltroDeSessao.
        .formLogin(login -> login.disable())
        .httpBasic(basic -> basic.disable())
        .logout(logout -> logout.disable())
        .exceptionHandling(
            erros -> erros.authenticationEntryPoint(recusa).accessDeniedHandler(recusa))
        .addFilterBefore(filtroDeSessao, UsernamePasswordAuthenticationFilter.class)
        .build();
  }
}
