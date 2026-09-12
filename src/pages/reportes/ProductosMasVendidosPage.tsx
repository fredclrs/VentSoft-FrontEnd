import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
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
import { FiltroFechaNumero } from '../../components/reportes/FiltroFechaNumero'
import { articulosApi } from '../../api/articulos'
import { temporadasApi } from '../../api/temporadas'
import { getErrorMessage } from '../../api/errors'
import { useTodasLasVentas } from '../../hooks/useTodasLasVentas'
import { useConfiguracionEmpresa } from '../../hooks/useConfiguracionEmpresa'
import { filtrarPorFechaYNumero, filtrosAnioActual } from '../../utils/filtrarHistorial'
import { imprimirListado } from '../../utils/imprimirListado'

interface FilaProducto {
  codigo: string
  descripcion: string
  cantidad: number
  total: number
}

export function ProductosMasVendidosPage() {
  const { nombreNegocio, money } = useConfiguracionEmpresa()
  const [filtros, setFiltros] = useState(filtrosAnioActual)

  const temporadasQuery = useQuery({ queryKey: ['temporadas'], queryFn: () => temporadasApi.search() })
  const { ventas, cargando: cargandoVentas, error: errorVentas, errorObj } = useTodasLasVentas()

  const articulosQuery = useQuery({ queryKey: ['articulos'], queryFn: () => articulosApi.search() })
  const articuloPorId = useMemo(
    () => new Map((articulosQuery.data ?? []).map((a) => [a.id, a])),
    [articulosQuery.data],
  )

  const cargando = cargandoVentas || articulosQuery.isLoading || temporadasQuery.isLoading
  const hayError = errorVentas || articulosQuery.isError || temporadasQuery.isError

  const ventasFiltradas = useMemo(
    () => filtrarPorFechaYNumero(ventas, filtros, temporadasQuery.data ?? []),
    [ventas, filtros, temporadasQuery.data],
  )

  // Ranking por cantidad vendida (no por monto) — es lo que suele importar para saber
  // qué reponer/priorizar en stock.
  const productos = useMemo<FilaProducto[]>(() => {
    const mapa = new Map<number, FilaProducto>()
    for (const venta of ventasFiltradas) {
      for (const d of venta.detalles) {
        const articulo = articuloPorId.get(d.idArticulo)
        const previo = mapa.get(d.idArticulo)
        if (previo) {
          previo.cantidad += d.cantidad
          previo.total += d.subTotal
        } else {
          mapa.set(d.idArticulo, {
            codigo: articulo?.codigo ?? `#${d.idArticulo}`,
            descripcion: articulo?.descripcion ?? '',
            cantidad: d.cantidad,
            total: d.subTotal,
          })
        }
      }
    }
    return Array.from(mapa.values()).sort((a, b) => b.cantidad - a.cantidad)
  }, [ventasFiltradas, articuloPorId])

  function imprimirListadoProductos() {
    const rangoFechas =
      filtros.fechaDesde || filtros.fechaHasta
        ? ` · Del ${filtros.fechaDesde || '…'} al ${filtros.fechaHasta || '…'}`
        : ''
    const temporadaActiva = (temporadasQuery.data ?? []).find((t) => String(t.id) === filtros.temporadaId)
    const rangoTemporada = temporadaActiva ? ` · Temporada: ${temporadaActiva.nombre}` : ''

    imprimirListado({
      nombreNegocio,
      titulo: 'Productos más vendidos',
      subtitulo: `Ranking por cantidad vendida${rangoFechas}${rangoTemporada}`,
      columnas: [
        { label: '#' },
        { label: 'Código' },
        { label: 'Descripción' },
        { label: 'Cant. vendida', align: 'right' },
        { label: 'Total facturado', align: 'right' },
      ],
      filas: productos.map((p, i) => [i + 1, p.codigo, p.descripcion || '—', p.cantidad, money(p.total)]),
    })
  }

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Productos más vendidos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ranking de artículos por cantidad vendida. Filtrable por fecha, año y temporada.
        </Typography>
      </div>

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <FiltroFechaNumero
          filtros={filtros}
          onChange={setFiltros}
          mostrarNumero={false}
          temporadas={temporadasQuery.data ?? []}
        />
        <Button
          startIcon={<PrintIcon />}
          variant="outlined"
          disabled={productos.length === 0}
          onClick={imprimirListadoProductos}
        >
          Imprimir listado
        </Button>
      </Stack>

      {cargando && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Paper>
      )}

      {hayError && <Alert severity="error">{getErrorMessage(errorObj)}</Alert>}

      {!cargando && !hayError && productos.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No hay ventas registradas en el rango seleccionado.</Typography>
        </Paper>
      )}

      {productos.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Código</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Cant. vendida</TableCell>
                <TableCell align="right">Total facturado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productos.map((p, i) => (
                <TableRow key={p.codigo} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>#{i + 1}</Typography>
                  </TableCell>
                  <TableCell>{p.codigo}</TableCell>
                  <TableCell>{p.descripcion || '—'}</TableCell>
                  <TableCell align="right">{p.cantidad}</TableCell>
                  <TableCell align="right">{money(p.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  )
}
