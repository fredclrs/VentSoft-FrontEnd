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
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOffOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreOutlined'
import PrintIcon from '@mui/icons-material/PrintOutlined'
import { EntityAutocomplete } from '../../components/EntityAutocomplete'
import { DevolucionDialog } from '../../components/DevolucionDialog'
import { HistorialDevolucionesVenta } from '../../components/HistorialDevolucionesVenta'
import { BotonImprimirNota } from '../../components/BotonImprimirNota'
import { FiltroFechaNumero } from '../../components/reportes/FiltroFechaNumero'
import { buscarClientesTexto } from '../../api/clientes'
import { articulosApi } from '../../api/articulos'
import { usuariosApi } from '../../api/usuarios'
import { temporadasApi } from '../../api/temporadas'
import { getVentasByCliente } from '../../api/ventas'
import { getErrorMessage } from '../../api/errors'
import { filtrarPorFechaYNumero, filtrosAnioActual } from '../../utils/filtrarHistorial'
import { imprimirNotaVenta } from '../../utils/notaVenta'
import type { FormatoImpresion } from '../../utils/notaVenta'
import { imprimirExtracto } from '../../utils/imprimirListado'
import { useConfiguracionEmpresa } from '../../hooks/useConfiguracionEmpresa'
import type { Cliente } from '../../types/cliente'
import type { Venta } from '../../types/venta'

export function VentasPorClientePage() {
  const { nombreNegocio, simboloMoneda, money } = useConfiguracionEmpresa()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [filtros, setFiltros] = useState(filtrosAnioActual)
  const [ventaParaDevolucion, setVentaParaDevolucion] = useState<Venta | null>(null)
  const [avisoDevolucion, setAvisoDevolucion] = useState<string | null>(null)

  // Al cambiar de cliente arrancamos como si se entrara de nuevo al reporte: año en
  // curso, sin N° ni temporada — así no queda un filtro pegado que oculte todo.
  function cambiarCliente(nuevoCliente: Cliente | null) {
    setCliente(nuevoCliente)
    setFiltros(filtrosAnioActual())
  }

  const ventasQuery = useQuery({
    queryKey: ['ventas', 'byCliente', cliente?.id],
    queryFn: () => getVentasByCliente(cliente!.id),
    enabled: !!cliente,
  })

  const temporadasQuery = useQuery({ queryKey: ['temporadas'], queryFn: () => temporadasApi.search() })

  const ventasFiltradas = useMemo(
    () => filtrarPorFechaYNumero(ventasQuery.data ?? [], filtros, temporadasQuery.data ?? []),
    [ventasQuery.data, filtros, temporadasQuery.data],
  )

  // Para mostrar código en el detalle (los renglones solo traen idArticulo) y el
  // nombre del vendedor en la nota impresa (la venta solo trae idUsuario).
  const articulosQuery = useQuery({ queryKey: ['articulos'], queryFn: () => articulosApi.search() })
  const articuloPorId = useMemo(
    () => new Map((articulosQuery.data ?? []).map((a) => [a.id, a])),
    [articulosQuery.data],
  )

  const usuariosQuery = useQuery({ queryKey: ['usuarios'], queryFn: () => usuariosApi.search() })
  const usuarioPorId = useMemo(
    () => new Map((usuariosQuery.data ?? []).map((u) => [u.id, u])),
    [usuariosQuery.data],
  )

  function imprimirNota(venta: Venta, formato: FormatoImpresion) {
    imprimirNotaVenta({
      nombreNegocio,
      simboloMoneda,
      id: venta.id,
      fecha: venta.fechaRegistro ?? venta.fecha,
      cliente: cliente!.nombre,
      documentoCliente: cliente!.documentoIdentidad,
      vendedor: usuarioPorId.get(venta.idUsuario)?.nombre ?? `Usuario #${venta.idUsuario}`,
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

  function imprimirListadoVentas() {
    const totalGeneral = ventasFiltradas.reduce((acc, v) => acc + v.total, 0)
    const totalPagado = ventasFiltradas.reduce((acc, v) => acc + v.pagado, 0)
    const totalPorPagar = ventasFiltradas.reduce((acc, v) => acc + v.porPagar, 0)

    const rangoFechas =
      filtros.fechaDesde || filtros.fechaHasta
        ? ` · Del ${filtros.fechaDesde || '…'} al ${filtros.fechaHasta || '…'}`
        : ''
    const temporadaActiva = (temporadasQuery.data ?? []).find((t) => String(t.id) === filtros.temporadaId)
    const rangoTemporada = temporadaActiva ? ` · Temporada: ${temporadaActiva.nombre}` : ''

    // Extracto completo: cada venta con su propio detalle de artículos (no solo el total),
    // para poder entregárselo al cliente como comprobante de todo el período filtrado.
    imprimirExtracto({
      nombreNegocio,
      titulo: 'Extracto de ventas por cliente',
      subtitulo: `Cliente: ${cliente?.nombre} (${cliente?.documentoIdentidad})${rangoFechas}${rangoTemporada}`,
      columnas: [
        { label: 'Artículo' },
        { label: 'Cant.', align: 'right' },
        { label: 'P. unit.', align: 'right' },
        { label: 'Subtotal', align: 'right' },
      ],
      grupos: ventasFiltradas.map((v) => ({
        encabezado: `Venta #${v.id} · ${new Date(v.fecha).toLocaleDateString()}${v.referencias ? ` · Ref: ${v.referencias}` : ''}`,
        subencabezado: v.porPagar > 0 ? `Con saldo pendiente: ${money(v.porPagar)}` : 'Pagada',
        filas: v.detalles.map((d) => [
          articuloPorId.get(d.idArticulo)?.codigo ?? `#${d.idArticulo}`,
          d.cantidad,
          money(d.precioUnitario),
          money(d.subTotal),
        ]),
        totales: [
          { label: 'Total', valor: `${money(v.total)}` },
          { label: 'Pagado', valor: `${money(v.pagado)}` },
          { label: 'Por pagar', valor: `${money(v.porPagar)}` },
        ],
      })),
      totalesGenerales: [
        { label: 'Total vendido', valor: `${money(totalGeneral)}` },
        { label: 'Total pagado', valor: `${money(totalPagado)}` },
        { label: 'Total por pagar', valor: `${money(totalPorPagar)}` },
      ],
    })
  }

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ventas por cliente
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Historial de ventas registradas a un cliente. Desplegá una venta para ver su detalle.
        </Typography>
      </div>

      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ maxWidth: 420, flexGrow: 1 }}>
          <EntityAutocomplete
            label="Buscar cliente por nombre o documento…"
            queryKey="clientes-autocomplete-reporte-ventas"
            searchFn={buscarClientesTexto}
            getLabel={(c: Cliente) => c.nombre}
            getSecondaryLabel={(c: Cliente) => c.documentoIdentidad}
            getId={(c: Cliente) => c.id}
            value={cliente}
            onChange={cambiarCliente}
          />
        </Box>

        {cliente && (
          <>
            <Tooltip title="Limpiar filtros">
              <IconButton onClick={() => setFiltros(filtrosAnioActual())}>
                <FilterAltOffIcon />
              </IconButton>
            </Tooltip>
            <Button
              startIcon={<PrintIcon />}
              variant="outlined"
              disabled={ventasFiltradas.length === 0}
              onClick={imprimirListadoVentas}
            >
              Imprimir listado
            </Button>
          </>
        )}
      </Stack>

      {!cliente && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Elegí un cliente para ver su historial de ventas.</Typography>
        </Paper>
      )}

      {cliente && (
        <>
          <FiltroFechaNumero
            filtros={filtros}
            onChange={setFiltros}
            numeroLabel="N° de venta"
            temporadas={temporadasQuery.data ?? []}
          />

          {ventasQuery.isLoading && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={28} />
            </Paper>
          )}

          {ventasQuery.isError && <Alert severity="error">{getErrorMessage(ventasQuery.error)}</Alert>}

          {!ventasQuery.isLoading && !ventasQuery.isError && ventasFiltradas.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {(ventasQuery.data ?? []).length === 0
                  ? 'Todavía no tiene ventas registradas.'
                  : 'Ninguna venta coincide con el filtro.'}
              </Typography>
            </Paper>
          )}

          {ventasFiltradas.length > 0 && (
            <Stack
              direction="row"
              spacing={{ xs: 1.5, sm: 3 }}
              sx={{ display: { xs: 'none', sm: 'flex' }, px: 2, pr: 6 }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 56 }}>
                N°
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90 }}>
                Fecha
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 120, flexGrow: 1 }}>
                Referencia
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 100 }}>
                Total
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 100 }}>
                Pagado
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90 }}>
                Estado
              </Typography>
            </Stack>
          )}

          {ventasFiltradas.map((venta) => (
            <Accordion key={venta.id} variant="outlined" disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction="row"
                  spacing={{ xs: 1.5, sm: 3 }}
                  sx={{ flexWrap: 'wrap', alignItems: 'center', width: '100%', rowGap: 0.5, pr: 1 }}
                >
                  <Typography sx={{ fontWeight: 700, minWidth: 56 }}>#{venta.id}</Typography>
                  <Typography variant="body2" sx={{ minWidth: 90 }}>
                    {new Date(venta.fecha).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, flexGrow: 1 }}>
                    {venta.referencias || 'Sin referencia'}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 100 }}>
                    Total: {money(venta.total)}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 100 }}>
                    Pagado: {money(venta.pagado)}
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

                  <HistorialDevolucionesVenta ventaId={venta.id} />

                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography>Total</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{money(venta.total)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography>Pagado</Typography>
                    <Typography>{money(venta.pagado)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography>Por pagar</Typography>
                    <Typography color={venta.porPagar > 0 ? 'warning.main' : 'success.main'}>
                      {money(venta.porPagar)}
                    </Typography>
                  </Stack>

                  {venta.nota && <Alert severity="info">{venta.nota}</Alert>}

                  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
                    <Button variant="outlined" onClick={() => setVentaParaDevolucion(venta)}>
                      Devolver / cambiar
                    </Button>
                    <BotonImprimirNota onImprimir={(formato) => imprimirNota(venta, formato)} />
                  </Stack>
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}

      {ventaParaDevolucion && cliente && (
        <DevolucionDialog
          open
          venta={ventaParaDevolucion}
          cliente={cliente}
          onClose={() => setVentaParaDevolucion(null)}
          onSuccess={(devolucion) =>
            setAvisoDevolucion(
              devolucion.totalCambio > 0
                ? `Cambio registrado sobre la venta #${devolucion.idVenta}.`
                : `Devolución registrada sobre la venta #${devolucion.idVenta}.`,
            )
          }
        />
      )}

      <Snackbar
        open={!!avisoDevolucion}
        autoHideDuration={4000}
        onClose={() => setAvisoDevolucion(null)}
        message={avisoDevolucion}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  )
}
