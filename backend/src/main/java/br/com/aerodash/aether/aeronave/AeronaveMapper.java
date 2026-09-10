package br.com.aerodash.aether.aeronave;

import java.time.LocalDate;
import org.springframework.stereotype.Component;

/**
 * Converte a entidade em DTO: a borda HTTP nunca vê uma {@code Aeronave}.
 *
 * <p>É escrito à mão, e não gerado por MapStruct, porque nenhum campo do response é cópia de campo
 * da entidade — todos são perguntas feitas a ela, e todas dependem de "hoje" e da política. Um
 * mapeamento declarativo aqui seria cinco expressões `java()` em volta de nada.
 */
@Component
public class AeronaveMapper {

  public AeronaveResponse paraLinhaDaFrota(Aeronave aeronave, LocalDate hoje, int diasDeAtencao) {
    return new AeronaveResponse(
        aeronave.getId(),
        aeronave.getMatricula(),
        aeronave.getModelo(),
        aeronave.getBase(),
        aeronave.situacaoRegular(hoje, diasDeAtencao),
        aeronave.documentoDoProximoVencimento(),
        aeronave.proximoVencimento(),
        aeronave.diasAteOProximoVencimento(hoje),
        aeronave.podeVoar(hoje));
  }
}
