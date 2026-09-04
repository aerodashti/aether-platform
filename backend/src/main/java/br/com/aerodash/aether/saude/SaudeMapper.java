package br.com.aerodash.aether.saude;

import java.time.Instant;
import java.util.List;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Converte a entidade em DTO. O instante entra por contexto porque a regra de frescor depende dele.
 */
@Mapper(componentModel = "spring")
public interface SaudeMapper {

  @Mapping(target = "saudavel", expression = "java(registro.estaSaudavel(agora))")
  ComponenteDeSaudeResponse paraResponse(RegistroDeSaude registro, @Context Instant agora);

  List<ComponenteDeSaudeResponse> paraListaDeResponse(
      List<RegistroDeSaude> registros, @Context Instant agora);
}
