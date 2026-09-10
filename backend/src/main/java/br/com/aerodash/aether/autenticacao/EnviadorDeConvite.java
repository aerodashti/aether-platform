package br.com.aerodash.aether.autenticacao;

/**
 * Por onde o link do convite chega até a pessoa.
 *
 * <p>Porta separada de {@link EnviadorDeCodigoDeRecuperacao} porque as duas mensagens não têm o
 * mesmo destinatário nem o mesmo texto: uma fala com quem já é da casa e esqueceu a senha; a outra,
 * com quem ainda não entrou nenhuma vez.
 */
public interface EnviadorDeConvite {

  void enviar(Usuario usuario, String token);
}
