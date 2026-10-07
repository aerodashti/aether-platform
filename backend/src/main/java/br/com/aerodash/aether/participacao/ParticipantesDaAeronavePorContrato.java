package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.aporte.ParticipantesDaAeronave;
import br.com.aerodash.aether.custo.ParticipantesDoCusto;
import br.com.aerodash.aether.proprietario.ParticipacoesVigentes;
import br.com.aerodash.aether.troca.ParticipantesDaTroca;
import br.com.aerodash.aether.voo.ParticipantesDoVoo;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Os contratos respondendo às portas que aportes, trocas, custos e voos declararam — a mesma
 * pergunta: quem participa ou já participou de uma aeronave é quem aparece em algum contrato dela,
 * vigente ou arquivado.
 */
@Component
public class ParticipantesDaAeronavePorContrato
    implements ParticipantesDaAeronave,
        ParticipantesDaTroca,
        ParticipantesDoCusto,
        ParticipantesDoVoo,
        ParticipacoesVigentes {

  private final ContratoDeParticipacaoRepository contratos;

  public ParticipantesDaAeronavePorContrato(ContratoDeParticipacaoRepository contratos) {
    this.contratos = contratos;
  }

  @Override
  @Transactional(readOnly = true)
  public boolean participaOuParticipou(Long aeronaveId, Long proprietarioId) {
    return contratos.existsByAeronaveIdAndParticipacoesProprietarioId(aeronaveId, proprietarioId);
  }

  @Override
  @Transactional(readOnly = true)
  public boolean participaDeContratoVigente(Long proprietarioId) {
    return !contratos
        .findByFimDaVigenciaIsNullAndParticipacoesProprietarioId(proprietarioId)
        .isEmpty();
  }
}
