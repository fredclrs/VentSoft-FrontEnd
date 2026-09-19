import ClickAwayListener from '@mui/material/ClickAwayListener'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { resumenVariante } from '../utils/articulo'
import type { Articulo } from '../types/articulo'

interface SelectorVariantesProps {
  /** Los artículos que comparten el mismo código escaneado (distinta talla/color) — ver
   * ConfiguracionEmpresa.PermiteCodigoCompartidoEntreArticulos. */
  variantes: Articulo[]
  /** Stock actual de cada artículo, si la pantalla lo tiene cargado (Ventas sí, Compras no
   * necesariamente) — si no se pasa, no se muestra la columna de stock. */
  stockPorArticulo?: Map<number, number>
  onElegir: (articulo: Articulo) => void
  /** Se llama al clickear afuera del panel, sin elegir ninguna variante — para cuando lo
   * escanearon solo para consultar el stock, no para agregarlo a la venta/compra. */
  onCerrar: () => void
}

/**
 * Panel que aparece al escanear un código con más de una coincidencia (mismo código
 * compartido entre variantes de talla/color). A propósito NO es un Dialog/modal: así no
 * interrumpe el flujo de escaneo con un backdrop — el cajero aprieta el número (1-9, manejado
 * por la pantalla que lo usa en su onKeyDown del cuadro de escaneo) o clickea la fila. Si
 * clickea afuera sin elegir nada (lo escaneó solo para ver el stock), se cierra solo.
 */
export function SelectorVariantes({ variantes, stockPorArticulo, onElegir, onCerrar }: SelectorVariantesProps) {
  return (
    <ClickAwayListener onClickAway={onCerrar}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Elegí la variante de{' '}
          <strong>
            {variantes[0].codigo}
            {variantes[0].descripcion ? ` — ${variantes[0].descripcion}` : ''}
          </strong>{' '}
          (o apretá el número):
        </Typography>
        <Stack spacing={0.75}>
          {variantes.map((v, i) => {
            const stock = stockPorArticulo?.get(v.id)
            return (
              <Stack
                key={v.id}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: 'center',
                  cursor: 'pointer',
                  p: 0.75,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => onElegir(v)}
              >
                <Chip label={i + 1} sx={{ minWidth: 32, fontSize: '1rem' }} />
                <Typography variant="body1" sx={{ flexGrow: 1 }}>
                  {resumenVariante(v)}
                </Typography>
                {stock !== undefined && (
                  <Typography variant="body1" color={stock > 0 ? 'text.secondary' : 'error'}>
                    {stock > 0 ? `Stock: ${stock}` : 'Sin stock'}
                  </Typography>
                )}
              </Stack>
            )
          })}
        </Stack>
      </Paper>
    </ClickAwayListener>
  )
}
