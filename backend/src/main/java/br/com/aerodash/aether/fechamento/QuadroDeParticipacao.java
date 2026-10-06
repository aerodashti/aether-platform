package br.com.aerodash.aether.fechamento;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/**
 * Um contrato de participação visto pelo fechamento: de quando a quando valeu e quem tinha quanto.
 * O fechamento não precisa do resto do contrato, e assim a calculadora não depende da entidade.
 */
record QuadroDeParticipacao(Instant inicio, Instant fim, Map<Long, BigDecimal> percentuais) {

  boolean vigenteEm(Instant instante) {
    return !inicio.isAfter(instante) && (fim == null || fim.isAfter(instante));
  }
}
