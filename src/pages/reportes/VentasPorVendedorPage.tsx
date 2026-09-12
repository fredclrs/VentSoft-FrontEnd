import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreOutlined'
import PrintIcon from '@mui/icons-material/PrintOutlined'
import { EntityAutocomplete } from '../../components/EntityAutocomplete'
import { BotonImprimirNota } from '../../components/BotonImprimirNota'
import { FiltroFechaNumero } from '../../components/reportes/FiltroFechaNumero'
import { usuariosApi } from '../../api/usuarios'
import { articulosApi } from '../../api/articulos'
import { buscarClientes } from '../../api/clientes'
import { temporadasApi } from '../../api/temporadas'
import { getVentasTodas } from '../../api/ventas'
import { getErrorMessage } from '../../api/errors'
import { filtrarPorFechaYNumero, filtrosAnioActual } from '../../utils/filtrarHistorial'
import { imprimirNotaVenta } from '../../utils/notaVenta'
import type { FormatoImpresion } from '../../utils/notaVenta'
import { imprimirListado } from '../../utils/imprimirListado'
import { useConfiguracionEmpresa } from '../../hooks/useConfiguracionEmpresa'
import type { Usuario } from '../../types/usuario'
import type { Venta } from '../../types/venta'

/** Ranking de ventas por vendedor, y el historial detallado de uno en particular — para
 * auditar la actividad de cada usuario y ver quién vende más. Requiere el permiso
 * "ventas_vendedor", independiente de "ventas": deja ver el desempeño de todos sin
 * necesitar poder vender. */
export function VentasPorVendedorPage() {
  const { nombreNegocio, simboloMoneda, money } = useConfiguracionEmpresa()
  const [filtros, setFiltros] = useState(filtrosAnioActual)
  const [vendedor, setVendedor] = useState<Usuario | null>(null)

  const ventasQuery = useQuery({ queryKey: ['ventas', 'todas'], queryFn: getVentasTodas })
  const usuariosQuery = useQuery({ queryKey: ['usuarios'], queryFn: () => usuariosApi.search() })
  const clientesQuery = useQuery({ queryKey: ['clientes-todos'], queryFn: () => buscarClientes() })
  const articulosQuery = useQuery({ queryKey: ['articulos'], queryFn: () => articulosApi.search() })
  const temporadasQuery = useQuery({ queryKey: ['temporadas'], queryFn: () => temporadasApi.search() })

  const cargando = ventasQuery.isLoading || usuariosQuery.isLoading
  const hayError = ventasQuery.isError || usuariosQuery.isError

  const usuarioPorId = useMemo(
    () => new Map((usuariosQuery.data ?? []).map((u) => [u.id, u])),
    [usuariosQuery.data],
  )
  const clientePorId = useMemo(
    () => new Map((clientesQuery.data ?? []).map((c) => [c.id, c])),
    [clientesQuery.data],
  )
  const articuloPorId = useMemo(
    () => new Map((articulosQuery.data ?? []).map((a) => [a.id, a])),
    [articulosQuery.data],
  )

  const ventasFiltradas = useMemo(
    () => filtrarPorFechaYNumero(ventasQuery.data ?? [], filtros, temporadasQuery.data ?? []),
    [ventasQuery.data, filtros, temporadasQuery.data],
  )

  // Ranking por total vendido — es lo que suele importar para medir desempeño.
  const ranking = useMemo(() => {
    const mapa = new Map<number, { cantidadVentas: number; totalVendido: number }>()
    for (const venta of ventasFiltradas) {
      const previo = mapa.get(venta.idUsuario) ?? { cantidadVentas: 0, totalVendido: 0 }
      previo.cantidadVentas += 1
      previo.totalVendido += venta.total
      mapa.set(venta.idUsuario, previo)
    }
    return Array.from(mapa.entries())
      .map(([idUsuario, datos]) => ({
        idUsuario,
        nombre: usuarioPorId.get(idUsuario)?.nombre ?? `Usuario #${idUsuario}`,
        ...datos,
      }))
      .sort((a, b) => b.totalVendido - a.totalVendido)
  }, [ventasFiltradas, usuarioPorId])

  const ventasDelVendedor = useMemo(
    () => (vendedor ? ventasFiltradas.filter((v) => v.idUsuario === vendedor.id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)) : []),
    [ventasFiltradas, vendedor],
  )

  function imprimirNota(venta: Venta, formato: FormatoImpresion) {
    const cliente = clientePorId.get(venta.idCliente)
    imprimirNotaVenta({
      nombreNegocio,
      simboloMoneda,
      id: venta.id,
      fecha: venta.fechaRegistro ?? venta.fecha,
      cliente: cliente?.nombre ?? `Cliente #${venta.idCliente}`,
      documentoCliente: cliente?.documentoIdentidad ?? '',
      vendedor: vendedor?.nombre ?? `Usuario #${venta.idUsuario}`,
      referencia: venta.referencias,
      nota: venta.nota,
      items: venta.detalles.map((d) => ({
        codigo: articuloPorId.get(d.idArticulo)?.codigo ?? `#${d.idArticulo}`,
        descripcion: articuloPorId.get(d.idArticulo)?.descripcion,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        subtotal: d.subTotal,
      })),
      total: venta.total,
      pagado: venta.pagado,
      porPagar: venta.porPagar,
    }, formato)
  }

  function imprimirRanking() {
    const rangoFechas =
      filtros.fechaDesde || filtros.fechaHasta ? ` · Del ${filtros.fechaDesde || '…'} al ${filtros.fechaHasta || '…'}` : ''

    imprimirListado({
      nombreNegocio,
      titulo: 'Ranking de ventas por vendedor',
      subtitulo: `Ordenado por total vendido${rangoFechas}`,
      columnas: [
        { label: '#' },
        { label: 'Vendedor' },
        { label: 'Cant. ventas', align: 'right' },
        { label: 'Total vendido', align: 'right' },
      ],
      filas: ranking.map((r, i) => [i + 1, r.nombre, r.cantidadVentas, money(r.totalVendido)]),
    })
  }

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ventas por vendedor
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ranking de desempeño y, eligiendo un vendedor, su historial completo de ventas.
        </Typography>
      </div>

      {hayError && <Alert severity="error">{getErrorMessage(ventasQuery.error ?? usuariosQuery.error)}</Alert>}

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <FiltroFechaNumero filtros={filtros} onChange={setFiltros} mostrarNumero={false} temporadas={temporadasQuery.data ?? []} />
        <Button startIcon={<PrintIcon />} variant="outlined" disabled={ranking.length === 0} onClick={imprimirRanking}>
          Imprimir ranking
        </Button>
      </Stack>

      {cargando && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Paper>
      )}

      {!cargando && !hayError && ranking.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No hay ventas registradas en el rango seleccionado.</Typography>
        </Paper>
      )}

      {ranking.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Vendedor</TableCell>
                <TableCell align="right">Cant. ventas</TableCell>
                <TableCell align="right">Total vendido</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ranking.map((r, i) => (
                <TableRow key={r.idUsuario} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>#{i + 1}</Typography>
                  </TableCell>
                  <TableCell>{r.nombre}</TableCell>
                  <TableCell align="right">{r.cantidadVentas}</TableCell>
                  <TableCell align="right">{money(r.totalVendido)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Divider />

      <Typography variant="subtitle2">Historial de un vendedor</Typography>
      <Box sx={{ maxWidth: 420 }}>
        <EntityAutocomplete
          label="Buscar vendedor…"
          queryKey="usuarios-autocomplete-reporte-vendedor"
          searchFn={(texto) => usuariosApi.search({ nombre: texto })}
          getLabel={(u: Usuario) => u.nombre}
          getSecondaryLabel={(u: Usuario) => u.nombreUsuario}
          getId={(u: Usuario) => u.id}
          value={vendedor}
          onChange={setVendedor}
        />
      </Box>

      {vendedor && ventasDelVendedor.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" variant="body2">
            No tiene ventas registradas en el rango seleccionado.
          </Typography>
        </Paper>
      )}

      {vendedor &&
        ventasDelVendedor.map((venta) => {
          const cliente = clientePorId.get(venta.idCliente)
          return (
            <Accordion key={venta.id} variant="outlined" disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={{ xs: 1.5, sm: 3 }} sx={{ flexWrap: 'wrap', alignItems: 'center', width: '100%', rowGap: 0.5, pr: 1 }}>
                  <Typography sx={{ fontWeight: 700, minWidth: 56 }}>#{venta.id}</Typography>
                  <Typography variant="body2" sx={{ minWidth: 90 }}>
                    {new Date(venta.fecha).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140, flexGrow: 1 }}>
                    {cliente?.nombre ?? `Cliente #${venta.idCliente}`}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 100 }}>
                    Total: {money(venta.total)}
                  </Typography>
                  <Chip
                    size="small"
                    label={venta.porPagar > 0 ? `Debe ${money(venta.porPagar)}` : 'Pagada'}
                    color={venta.porPagar > 0 ? 'warning' : 'success'}
                    variant="outlined"
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Artículo</TableCell>
                          <TableCell align="right">Cant.</TableCell>
                          <TableCell align="right">P. unit.</TableCell>
                          <TableCell align="right">Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {venta.detalles.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell>{articuloPorId.get(d.idArticulo)?.codigo ?? `#${d.idArticulo}`}</TableCell>
                            <TableCell align="right">{d.cantidad}</TableCell>
                            <TableCell align="right">{money(d.precioUnitario)}</TableCell>
                            <TableCell align="right">{money(d.subTotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {venta.nota && <Alert severity="info">{venta.nota}</Alert>}

                  <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                    <BotonImprimirNota onImprimir={(formato) => imprimirNota(venta, formato)} />
                  </Stack>
                </Stack>
              </AccordionDetails>
            </Accordion>
          )
        })}
    </Stack>
  )
}
