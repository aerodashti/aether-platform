package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.aporte.ParticipantesDaAeronave;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Os contratos respondendo à porta que a feature de aportes declarou: quem participa ou já
 * participou de uma aeronave é quem aparece em algum contrato dela, vigente ou arquivado.
 */
@Component
public class ParticipantesDaAeronavePorContrato implements ParticipantesDaAeronave {

  private final ContratoDeParticipacaoRepository contratos;

  public ParticipantesDaAeronavePorContrato(ContratoDeParticipacaoRepository contratos) {
    this.contratos = contratos;
  }

  @Override
  @Transactional(readOnly = true)
  public boolean participaOuParticipou(Long aeronaveId, Long proprietarioId) {
    return contratos.existsByAeronaveIdAndParticipacoesProprietarioId(aeronaveId, proprietarioId);
  }
}
