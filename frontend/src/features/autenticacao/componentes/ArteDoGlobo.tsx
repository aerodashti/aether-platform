import estilos from './ArteDoGlobo.module.css';
import { GloboPontilhado } from './GloboPontilhado';

/**
 * O painel direito: quatro anéis concêntricos e o globo no centro.
 *
 * <p>Puramente decorativo. Some abaixo de 1024px — não porque não caberia, mas porque ali o painel
 * do formulário já ocupa a largura útil e o que sobraria do globo seria uma fatia sem leitura.
 */
export function ArteDoGlobo() {
  return (
    <div className={estilos.arte} aria-hidden="true">
      <div className={`${estilos.anel} ${estilos.anelExterno}`} />
      <div className={`${estilos.anel} ${estilos.anelTracejado}`} />
      <div className={`${estilos.anel} ${estilos.anelSolido}`} />
      <div className={`${estilos.anel} ${estilos.anelInterno}`} />
      <div className={estilos.globo}>
        <GloboPontilhado />
      </div>
    </div>
  );
}
