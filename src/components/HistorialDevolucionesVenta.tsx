import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { articulosApi } from '../api/articulos'
import { getDevolucionesByVenta } from '../api/devoluciones'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'

interface HistorialDevolucionesVentaProps {
  ventaId: number
}

/** Muestra, dentro del detalle de una venta, qué se devolvió y —si hubo cambio— qué artículo
 * nuevo se llevó el cliente en su lugar. No renderiza nada si la venta no tiene devoluciones. */
export function HistorialDevolucionesVenta({ ventaId }: HistorialDevolucionesVentaProps) {
  const { money } = useConfiguracionEmpresa()

  const devolucionesQuery = useQuery({
    queryKey: ['devoluciones', 'byVenta', ventaId],
    queryFn: () => getDevolucionesByVenta(ventaId),
  })

  const articulosQuery = useQuery({ queryKey: ['articulos'], queryFn: () => articulosApi.search() })
  const articuloPorId = useMemo(
    () => new Map((articulosQuery.data ?? []).map((a) => [a.id, a])),
    [articulosQuery.data],
  )

  function nombreArticulo(idArticulo: number) {
    const a = articuloPorId.get(idArticulo)
    return a ? `${a.codigo} — ${a.descripcion ?? ''}` : `#${idArticulo}`
  }

  const devoluciones = devolucionesQuery.data ?? []
  if (devoluciones.length === 0) return null

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Devoluciones y cambios de esta venta</Typography>
      {devoluciones.map((d) => (
        <Paper key={d.id} variant="outlined" sx={{ p: 1.5 }}>
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              {new Date(d.fecha).toLocaleString()}
              {d.motivo ? ` · ${d.motivo}` : ''}
            </Typography>

            <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Devolvió
                </Typography>
                {d.detalles.map((det) => (
                  <Typography key={det.id} variant="body2">
                    {det.cantidad}× {nombreArticulo(det.idArticulo)} ({money(det.subTotal)})
                    {!det.vendible && ' · no vendible'}
                  </Typography>
                ))}
              </Box>

              {d.articulosCambio.length > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Se llevó a cambio
                  </Typography>
                  {d.articulosCambio.map((a) => (
                    <Typography key={a.id} variant="body2">
                      {a.cantidad}× {nombreArticulo(a.idArticulo)} ({money(a.subTotal)})
                    </Typography>
                  ))}
                </Box>
              )}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {d.montoCobradoAhora > 0 && (
                <Chip size="small" color="success" variant="outlined" label={`Cobrado ahora: ${money(d.montoCobradoAhora)}`} />
              )}
              {d.porPagar > 0 && (
                <Chip size="small" color="warning" variant="outlined" label={`Quedó pendiente: ${money(d.porPagar)}`} />
              )}
              {d.montoDevueltoEfectivo > 0 && (
                <Chip size="small" color="info" variant="outlined" label={`Devuelto en efectivo: ${money(d.montoDevueltoEfectivo)}`} />
              )}
              {d.saldoAFavorGenerado > 0 && (
                <Chip size="small" color="info" variant="outlined" label={`Saldo a favor generado: ${money(d.saldoAFavorGenerado)}`} />
              )}
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
