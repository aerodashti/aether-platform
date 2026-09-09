package br.com.aerodash.aether.autenticacao;

import org.mapstruct.Mapper;

/** Converte a entidade em DTO: a borda HTTP nunca vê um {@code Usuario}. */
@Mapper(componentModel = "spring")
public interface UsuarioMapper {

  SessaoResponse paraResponse(Usuario usuario);
}
