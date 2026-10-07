package br.com.aerodash.aether.aeronave;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.OptionalInt;

/**
 * Os totais acumulados da aeronave: célula, ciclos, quilômetros, motores e APU.
 *
 * <p>Célula, ciclos e km são declarados no cadastro e alimentados pelo diário de voos; motores e
 * APU seguem declarados. A correção manual, só de administrador, é exceção de auditoria, não
 * rotina.
 *
 * <p>Motor 2 e APU são nulos quando o equipamento não os tem: monomotor não tem segundo motor, e "0
 * horas de APU" diria que existe um APU zerado, o que é outra afirmação.
 */
@Embeddable
public record ContadoresDaAeronave(
    @Column(name = "horas_de_celula", nullable = false) BigDecimal horasDeCelula,
    @Column(name = "ciclos", nullable = false) int ciclos,
    @Column(name = "km_voados", nullable = false) BigDecimal kmVoados,
    @Column(name = "horas_motor_1") BigDecimal horasMotor1,
    @Column(name = "horas_motor_2") BigDecimal horasMotor2,
    @Column(name = "horas_motor_3") BigDecimal horasMotor3,
    @Column(name = "horas_apu") BigDecimal horasApu) {

  /** O estado de quem acabou de entrar no sistema sem histórico declarado. */
  public static ContadoresDaAeronave zerados() {
    return new ContadoresDaAeronave(BigDecimal.ZERO, 0, BigDecimal.ZERO, null, null, null, null);
  }

  /**
   * Soma um voo (ou o estorna, com deltas negativos). Célula, ciclos e km são os alimentados pelo
   * diário; motores e APU seguem na correção manual — o diário não sabe quais operaram. O piso é
   * zero: estornar mais do que existe denuncia correção manual no meio do caminho, e um contador
   * negativo seria mentira maior que o zero.
   */
  public ContadoresDaAeronave acumular(BigDecimal horas, BigDecimal km, int pousos) {
    return new ContadoresDaAeronave(
        BigDecimal.ZERO.max(horasDeCelula.add(horas)),
        Math.max(0, ciclos + pousos),
        BigDecimal.ZERO.max(kmVoados.add(km)),
        horasMotor1,
        horasMotor2,
        horasMotor3,
        horasApu);
  }

  /**
   * O primeiro motor sem horas numa ficha que os declara em sequência: toda aeronave tem o motor 1,
   * e o motor 3 sem o 2 é um buraco, não um trimotor. Vazio quando a sequência está completa.
   */
  public OptionalInt motorSemHoras() {
    List<BigDecimal> motores = Arrays.asList(horasMotor1, horasMotor2, horasMotor3);
    int ultimoDeclarado = 0;
    for (int indice = 0; indice < motores.size(); indice++) {
      if (motores.get(indice) != null) {
        ultimoDeclarado = indice;
      }
    }
    for (int indice = 0; indice <= ultimoDeclarado; indice++) {
      if (motores.get(indice) == null) {
        return OptionalInt.of(indice + 1);
      }
    }
    return OptionalInt.empty();
  }

  /**
   * Os mesmos totais, sem olhar a escala: 3412.5 e 3412.50 são as mesmas horas. É a pergunta da
   * correção manual — os totais que a tela leu ainda são os de agora?
   */
  public boolean possuiOsMesmosTotaisDe(ContadoresDaAeronave outros) {
    return mesmoValor(horasDeCelula, outros.horasDeCelula)
        && ciclos == outros.ciclos
        && mesmoValor(kmVoados, outros.kmVoados)
        && mesmoValor(horasMotor1, outros.horasMotor1)
        && mesmoValor(horasMotor2, outros.horasMotor2)
        && mesmoValor(horasMotor3, outros.horasMotor3)
        && mesmoValor(horasApu, outros.horasApu);
  }

  private static boolean mesmoValor(BigDecimal um, BigDecimal outro) {
    if (um == null || outro == null) {
      return um == null && outro == null;
    }
    return um.compareTo(outro) == 0;
  }

  public boolean possuiValoresNegativos() {
    return horasDeCelula.signum() < 0
        || ciclos < 0
        || kmVoados.signum() < 0
        || (horasMotor1 != null && horasMotor1.signum() < 0)
        || (horasMotor2 != null && horasMotor2.signum() < 0)
        || (horasMotor3 != null && horasMotor3.signum() < 0)
        || (horasApu != null && horasApu.signum() < 0);
  }
}
