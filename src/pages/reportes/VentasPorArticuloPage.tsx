import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import PrintIcon from '@mui/icons-material/PrintOutlined'
import { EntityAutocomplete } from '../../components/EntityAutocomplete'
import { FiltroFechaNumero } from '../../components/reportes/FiltroFechaNumero'
import { buscarArticulos } from '../../api/articulos'
import { usuariosApi } from '../../api/usuarios'
import { buscarClientes } from '../../api/clientes'
import { temporadasApi } from '../../api/temporadas'
import { getVentasTodas } from '../../api/ventas'
import { getErrorMessage } from '../../api/errors'
import { filtrarPorFechaYNumero, filtrosAnioActual } from '../../utils/filtrarHistorial'
import { imprimirListado } from '../../utils/imprimirListado'
import { useConfiguracionEmpresa } from '../../hooks/useConfiguracionEmpresa'
import type { Articulo } from '../../types/articulo'

interface FilaVentaArticulo {
  idVenta: number
  fecha: string
  cliente: string
  vendedor: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

/** Trazabilidad de un artículo puntual: en qué ventas aparece, a quién se lo vendieron y
 * quién lo vendió — para investigar algo raro (ej: "este producto no debería tener ventas")
 * sin tener que adivinar primero de qué vendedor se trata. Mismo permiso que "Ventas por
 * vendedor" (independiente de "Ventas"). */
export function VentasPorArticuloPage() {
  const { nombreNegocio, money } = useConfiguracionEmpresa()
  const [articulo, setArticulo] = useState<Articulo | null>(null)
  const [filtros, setFiltros] = useState(filtrosAnioActual)

  const ventasQuery = useQuery({ queryKey: ['ventas', 'todas'], queryFn: getVentasTodas })
  const usuariosQuery = useQuery({ queryKey: ['usuarios'], queryFn: () => usuariosApi.search() })
  const clientesQuery = useQuery({ queryKey: ['clientes-todos'], queryFn: () => buscarClientes() })
  const temporadasQuery = useQuery({ queryKey: ['temporadas'], queryFn: () => temporadasApi.search() })

  const cargando = ventasQuery.isLoading || usuariosQuery.isLoading || clientesQuery.isLoading
  const hayError = ventasQuery.isError || usuariosQuery.isError || clientesQuery.isError

  const usuarioPorId = useMemo(
    () => new Map((usuariosQuery.data ?? []).map((u) => [u.id, u])),
    [usuariosQuery.data],
  )
  const clientePorId = useMemo(
    () => new Map((clientesQuery.data ?? []).map((c) => [c.id, c])),
    [clientesQuery.data],
  )

  const ventasFiltradas = useMemo(
    () => filtrarPorFechaYNumero(ventasQuery.data ?? [], filtros, temporadasQuery.data ?? []),
    [ventasQuery.data, filtros, temporadasQuery.data],
  )

  const filas = useMemo<FilaVentaArticulo[]>(() => {
    if (!articulo) return []
    const resultado: FilaVentaArticulo[] = []
    for (const venta of ventasFiltradas) {
      for (const d of venta.detalles) {
        if (d.idArticulo !== articulo.id) continue
        resultado.push({
          idVenta: venta.id,
          fecha: venta.fecha,
          cliente: clientePorId.get(venta.idCliente)?.nombre ?? `Cliente #${venta.idCliente}`,
          vendedor: usuarioPorId.get(venta.idUsuario)?.nombre ?? `Usuario #${venta.idUsuario}`,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subTotal,
        })
      }
    }
    return resultado.sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  }, [articulo, ventasFiltradas, clientePorId, usuarioPorId])

  const cantidadTotal = useMemo(() => filas.reduce((acc, f) => acc + f.cantidad, 0), [filas])
  const totalFacturado = useMemo(() => filas.reduce((acc, f) => acc + f.subtotal, 0), [filas])

  function imprimirListadoArticulo() {
    if (!articulo) return
    const rangoFechas =
      filtros.fechaDesde || filtros.fechaHasta ? ` · Del ${filtros.fechaDesde || '…'} al ${filtros.fechaHasta || '…'}` : ''

    imprimirListado({
      nombreNegocio,
      titulo: 'Ventas por artículo',
      subtitulo: `Artículo: ${articulo.codigo} — ${articulo.descripcion ?? ''}${rangoFechas}`,
      columnas: [
        { label: 'Venta N°' },
        { label: 'Fecha' },
        { label: 'Cliente' },
        { label: 'Vendedor' },
        { label: 'Cant.', align: 'right' },
        { label: 'P. unit.', align: 'right' },
        { label: 'Subtotal', align: 'right' },
      ],
      filas: filas.map((f) => [
        f.idVenta,
        new Date(f.fecha).toLocaleDateString(),
        f.cliente,
        f.vendedor,
        f.cantidad,
        money(f.precioUnitario),
        money(f.subtotal),
      ]),
      totales: [
        { label: 'Cantidad total', valor: String(cantidadTotal) },
        { label: 'Total facturado', valor: money(totalFacturado) },
      ],
    })
  }

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ventas por artículo
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Elegí un artículo para ver en qué ventas aparece: a quién se lo vendieron, quién lo vendió y cuándo.
        </Typography>
      </div>

      {hayError && <Alert severity="error">{getErrorMessage(ventasQuery.error ?? usuariosQuery.error ?? clientesQuery.error)}</Alert>}

      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ maxWidth: 420, flexGrow: 1 }}>
          <EntityAutocomplete
            label="Buscar artículo…"
            queryKey="articulos-autocomplete-reporte-articulo"
            searchFn={buscarArticulos}
            getLabel={(a: Articulo) => `${a.codigo} — ${a.descripcion ?? ''}`}
            getSecondaryLabel={(a: Articulo) => a.descripcion ?? undefined}
            getId={(a: Articulo) => a.id}
            value={articulo}
            onChange={setArticulo}
          />
        </Box>

        {articulo && (
          <Button startIcon={<PrintIcon />} variant="outlined" disabled={filas.length === 0} onClick={imprimirListadoArticulo}>
            Imprimir listado
          </Button>
        )}
      </Stack>

      {!articulo && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Elegí un artículo para ver su historial de ventas.</Typography>
        </Paper>
      )}

      {articulo && (
        <>
          <FiltroFechaNumero
            filtros={filtros}
            onChange={setFiltros}
            numeroLabel="N° de venta"
            temporadas={temporadasQuery.data ?? []}
          />

          {cargando && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={28} />
            </Paper>
          )}

          {!cargando && !hayError && filas.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Este artículo no tiene ventas registradas en el rango seleccionado.</Typography>
            </Paper>
          )}

          {filas.length > 0 && (
            <>
              <Stack direction="row" spacing={3}>
                <Typography variant="body2" color="text.secondary">
                  Cantidad total vendida: <strong>{cantidadTotal}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total facturado: <strong>{money(totalFacturado)}</strong>
                </Typography>
              </Stack>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Venta N°</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Vendedor</TableCell>
                      <TableCell align="right">Cant.</TableCell>
                      <TableCell align="right">P. unit.</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filas.map((f, i) => (
                      <TableRow key={`${f.idVenta}-${i}`} hover>
                        <TableCell>#{f.idVenta}</TableCell>
                        <TableCell>{new Date(f.fecha).toLocaleDateString()}</TableCell>
                        <TableCell>{f.cliente}</TableCell>
                        <TableCell>{f.vendedor}</TableCell>
                        <TableCell align="right">{f.cantidad}</TableCell>
                        <TableCell align="right">{money(f.precioUnitario)}</TableCell>
                        <TableCell align="right">{money(f.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </>
      )}
    </Stack>
  )
}
