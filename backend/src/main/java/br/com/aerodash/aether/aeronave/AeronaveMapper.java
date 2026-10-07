package br.com.aerodash.aether.aeronave;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Converte a entidade em DTO, e o request nos valores da aeronave: a borda HTTP nunca vê uma {@code
 * Aeronave}, e o service não monta valor campo a campo.
 *
 * <p>É escrito à mão, e não gerado por MapStruct, porque nenhum campo do response é cópia de campo
 * da entidade — todos são perguntas feitas a ela, e todas dependem de "hoje" e da política. Um
 * mapeamento declarativo aqui seria cinco expressões `java()` em volta de nada.
 */
@Component
public class AeronaveMapper {

  public DetalheDaAeronaveResponse paraDetalhe(
      Aeronave aeronave, LocalDate hoje, int diasDeAtencao, List<PendenciaOperacional> pendencias) {
    ContadoresDaAeronave c = aeronave.getContadores();
    ConfiguracaoFinanceira f = aeronave.getConfiguracaoFinanceira();
    return new DetalheDaAeronaveResponse(
        aeronave.getId(),
        aeronave.getMatricula(),
        aeronave.getFabricante(),
        aeronave.getModelo(),
        aeronave.getNumeroDeSerie(),
        aeronave.getBase(),
        aeronave.getHangar(),
        aeronave.getApoliceDoSeguro(),
        aeronave.getPesoMaxDecolagemKg(),
        aeronave.getPesoMaxPousoKg(),
        aeronave.situacaoRegular(hoje, diasDeAtencao, pendencias),
        aeronave.documentoDoProximoVencimento(),
        aeronave.proximoVencimento(),
        aeronave.diasAteOProximoVencimento(hoje),
        aeronave.podeVoar(hoje, pendencias),
        paraResposta(pendencias),
        aeronave.getVencimentoCva(),
        aeronave.getVencimentoReta(),
        new DetalheDaAeronaveResponse.Contadores(
            c.horasDeCelula(),
            c.ciclos(),
            c.kmVoados(),
            c.horasMotor1(),
            c.horasMotor2(),
            c.horasMotor3(),
            c.horasApu()),
        new DetalheDaAeronaveResponse.Financeiro(
            f.baseDoRateio(),
            f.modeloDeAporte(),
            f.periodicidadeDoAporteMeses(),
            f.valorDoAporte(),
            f.diaDeFechamento(),
            f.saldoDeAbertura()));
  }

  public AeronaveResponse paraLinhaDaFrota(
      Aeronave aeronave, LocalDate hoje, int diasDeAtencao, List<PendenciaOperacional> pendencias) {
    return new AeronaveResponse(
        aeronave.getId(),
        aeronave.getMatricula(),
        aeronave.getModelo(),
        aeronave.getBase(),
        aeronave.situacaoRegular(hoje, diasDeAtencao, pendencias),
        aeronave.documentoDoProximoVencimento(),
        aeronave.proximoVencimento(),
        aeronave.diasAteOProximoVencimento(hoje),
        aeronave.podeVoar(hoje, pendencias),
        paraResposta(pendencias));
  }

  /** Da mais grave à mais leve: a primeira é a que a tela mostra quando só cabe uma. */
  private static List<PendenciaResponse> paraResposta(List<PendenciaOperacional> pendencias) {
    return pendencias.stream()
        .sorted(Comparator.comparing(PendenciaOperacional::situacao).reversed())
        .map(pendencia -> new PendenciaResponse(pendencia.descricao(), pendencia.situacao()))
        .toList();
  }

  /** A ficha da edição. Normalizar é do {@link FichaTecnica}; validar, do service. */
  public FichaTecnica paraFichaTecnica(FichaTecnicaRequest request) {
    return new FichaTecnica(
        request.fabricante(),
        request.modelo(),
        request.numeroDeSerie(),
        request.base(),
        request.hangar(),
        request.apoliceDoSeguro(),
        request.pesoMaxDecolagemKg(),
        request.pesoMaxPousoKg());
  }

  /** A ficha do cadastro: os mesmos campos, e as mesmas regras, da edição. */
  public FichaTecnica paraFichaTecnica(CriarAeronaveRequest request) {
    return new FichaTecnica(
        request.fabricante(),
        request.modelo(),
        request.numeroDeSerie(),
        request.base(),
        request.hangar(),
        request.apoliceDoSeguro(),
        request.pesoMaxDecolagemKg(),
        request.pesoMaxPousoKg());
  }

  public ContadoresDaAeronave paraContadores(ContadoresRequest request) {
    return new ContadoresDaAeronave(
        request.horasDeCelula(),
        request.ciclos(),
        request.kmVoados(),
        request.horasMotor1(),
        request.horasMotor2(),
        request.horasMotor3(),
        request.horasApu());
  }

  /** Os totais que a tela leu ao abrir a correção, para comparar com os de agora. */
  public ContadoresDaAeronave paraContadores(DetalheDaAeronaveResponse.Contadores lidos) {
    return new ContadoresDaAeronave(
        lidos.horasDeCelula(),
        lidos.ciclos(),
        lidos.kmVoados(),
        lidos.horasMotor1(),
        lidos.horasMotor2(),
        lidos.horasMotor3(),
        lidos.horasApu());
  }

  public ConfiguracaoFinanceira paraConfiguracao(ConfiguracaoFinanceiraRequest request) {
    return new ConfiguracaoFinanceira(
        request.baseDoRateio(),
        request.modeloDeAporte(),
        request.periodicidadeDoAporteMeses(),
        request.valorDoAporte(),
        request.diaDeFechamento(),
        request.saldoDeAbertura());
  }
}
