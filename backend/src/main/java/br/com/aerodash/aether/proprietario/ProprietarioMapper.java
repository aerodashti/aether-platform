package br.com.aerodash.aether.proprietario;

import org.mapstruct.Mapper;

/** Converte a entidade em DTO: a borda HTTP nunca vê um {@code Proprietario}. */
@Mapper(componentModel = "spring")
public interface ProprietarioMapper {

  ProprietarioResponse paraResponse(Proprietario proprietario);
}
