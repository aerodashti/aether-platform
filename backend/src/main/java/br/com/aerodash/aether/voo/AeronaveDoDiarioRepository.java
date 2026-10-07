package br.com.aerodash.aether.voo;

import br.com.aerodash.aether.aeronave.Aeronave;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.Repository;

/**
 * A aeronave como o diário a lê: a matrícula de cada linha da grade e, para mexer nos contadores, a
 * linha travada até o fim da transação. Sem a trava, dois lançamentos simultâneos liam o mesmo
 * contador, cada um somava o seu voo e o segundo a gravar apagava o primeiro.
 *
 * <p>Mora no diário, e não em {@code AeronaveRepository}, porque só o diário altera os contadores
 * por soma; o cadastro da aeronave os corrige por valor declarado.
 */
public interface AeronaveDoDiarioRepository extends Repository<Aeronave, Long> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<Aeronave> findTravadaById(Long id);

  List<Aeronave> findAllById(Iterable<Long> ids);
}
