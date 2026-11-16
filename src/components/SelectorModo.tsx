import ClickAwayListener from '@mui/material/ClickAwayListener'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Articulo } from '../types/articulo'
import type { ModoVentaCompra } from '../utils/fraccion'

export interface OpcionModo {
  modo: ModoVentaCompra
  /** Ej. "Unidad suelta — $6 · quedan 37" (Ventas) o "Paquete x20 — $80" (Compras). */
  etiqueta: string
  deshabilitada?: boolean
}

interface SelectorModoProps {
  articulo: Articulo
  /** Siempre en este orden: [0] = tecla 1 (unidad suelta), [1] = tecla 2 (paquete). */
  opciones: [OpcionModo, OpcionModo]
  /** Lo que elige Enter (lo maneja la pantalla): suelto en Ventas, paquete en Compras. */
  porDefecto: ModoVentaCompra
  onElegir: (modo: ModoVentaCompra) => void
  /** Clic afuera sin elegir: se descarta el escaneo. */
  onCerrar: () => void
}

/**
 * Aparece al escanear un artículo que se vende de las dos formas (Unidades por paquete > 1)
 * pero sin "Código de la caja" — el mismo código sirve para los dos, así que hay que preguntar.
 * Igual que SelectorVariantes, NO es un modal a propósito: se elige con 1/2 (manejado por la
 * pantalla en el onKeyDown del cuadro de escaneo; Enter = porDefecto) o con un clic, sin cortar el
 * ritmo de escaneo.
 */
export function SelectorModo({ articulo, opciones, porDefecto, onElegir, onCerrar }: SelectorModoProps) {
  return (
    <ClickAwayListener onClickAway={onCerrar}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          ¿Suelto o por paquete?{' '}
          <strong>
            {articulo.codigo}
            {articulo.descripcion ? ` — ${articulo.descripcion}` : ''}
          </strong>{' '}
          (apretá 1 o 2; Enter = {porDefecto === 'caja' ? 'paquete' : 'suelto'}):
        </Typography>
        <Stack spacing={0.75}>
          {opciones.map((o, i) => (
            <Stack
              key={o.modo}
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: 'center',
                cursor: o.deshabilitada ? 'default' : 'pointer',
                opacity: o.deshabilitada ? 0.5 : 1,
                p: 0.75,
                borderRadius: 1,
                '&:hover': o.deshabilitada ? undefined : { bgcolor: 'action.hover' },
              }}
              onClick={() => !o.deshabilitada && onElegir(o.modo)}
            >
              <Chip label={i + 1} sx={{ minWidth: 32, fontSize: '1rem' }} />
              <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
                {o.etiqueta}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </ClickAwayListener>
  )
}
