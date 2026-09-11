/**
 * A consulta subiu para `compartilhado` quando o diário de voos — a segunda tela — precisou dela.
 * Este arquivo fica como fachada da feature: os componentes daqui continuam importando do lugar
 * de sempre.
 */
export {
  useAeronaves,
  CHAVE_DA_FROTA,
  type AeronaveResponse,
  type DocumentoDaAeronave,
  type SituacaoRegular,
} from '@/compartilhado/aeronaves/useAeronaves';
