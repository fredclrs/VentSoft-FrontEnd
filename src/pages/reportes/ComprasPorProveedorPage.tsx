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
import { FiltroFechaNumero } from '../../components/reportes/FiltroFechaNumero'
import { buscarProveedoresTexto } from '../../api/proveedores'
import { articulosApi } from '../../api/articulos'
import { usuariosApi } from '../../api/usuarios'
import { temporadasApi } from '../../api/temporadas'
import { getComprasByProveedor } from '../../api/compras'
import { getErrorMessage } from '../../api/errors'
import { filtrarPorFechaYNumero, filtrosAnioActual } from '../../utils/filtrarHistorial'
import { imprimirNotaCompra } from '../../utils/notaCompra'
import { imprimirExtracto } from '../../utils/imprimirListado'
import { useConfiguracionEmpresa } from '../../hooks/useConfiguracionEmpresa'
import type { Proveedor } from '../../types/proveedor'
import type { Compra } from '../../types/compra'

export function ComprasPorProveedorPage() {
  const { nombreNegocio, simboloMoneda, money } = useConfiguracionEmpresa()
  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [filtros, setFiltros] = useState(filtrosAnioActual)

  // Al cambiar de proveedor arrancamos como si se entrara de nuevo al reporte: año en
  // curso, sin N° ni temporada — así no queda un filtro pegado que oculte todo.
  function cambiarProveedor(nuevoProveedor: Proveedor | null) {
    setProveedor(nuevoProveedor)
    setFiltros(filtrosAnioActual())
  }

  const comprasQuery = useQuery({
    queryKey: ['compras', 'byProveedor', proveedor?.id],
    queryFn: () => getComprasByProveedor(proveedor!.id),
    enabled: !!proveedor,
  })

  const temporadasQuery = useQuery({ queryKey: ['temporadas'], queryFn: () => temporadasApi.search() })

  const comprasFiltradas = useMemo(
    () => filtrarPorFechaYNumero(comprasQuery.data ?? [], filtros, temporadasQuery.data ?? []),
    [comprasQuery.data, filtros, temporadasQuery.data],
  )

  // Para mostrar código en el detalle (los renglones solo traen idArticulo) y quién
  // registró la compra en la nota impresa (la compra solo trae idUsuario).
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

  function imprimirNota(compra: Compra) {
    imprimirNotaCompra({
      nombreNegocio,
      simboloMoneda,
      id: compra.id,
      fecha: compra.fecha,
      proveedor: proveedor!.nombre,
      documentoProveedor: proveedor!.nit,
      registradoPor: usuarioPorId.get(compra.idUsuario)?.nombre ?? `Usuario #${compra.idUsuario}`,
      referencia: compra.referencias,
      nota: compra.nota,
      items: compra.detalles.map((d) => ({
        codigo: articuloPorId.get(d.idArticulo)?.codigo ?? `#${d.idArticulo}`,
        descripcion: articuloPorId.get(d.idArticulo)?.descripcion,
        lote: d.lote,
        cantidad: d.cantidad,
        costoUnitario: d.costoUnitario,
        subtotal: d.subTotal,
      })),
      total: compra.total,
      pagado: compra.pagado,
      porPagar: compra.porPagar,
    })
  }

  function imprimirListadoCompras() {
    const totalGeneral = comprasFiltradas.reduce((acc, c) => acc + c.total, 0)
    const totalPagado = comprasFiltradas.reduce((acc, c) => acc + c.pagado, 0)
    const totalPorPagar = comprasFiltradas.reduce((acc, c) => acc + c.porPagar, 0)

    const rangoFechas =
      filtros.fechaDesde || filtros.fechaHasta
        ? ` · Del ${filtros.fechaDesde || '…'} al ${filtros.fechaHasta || '…'}`
        : ''
    const temporadaActiva = (temporadasQuery.data ?? []).find((t) => String(t.id) === filtros.temporadaId)
    const rangoTemporada = temporadaActiva ? ` · Temporada: ${temporadaActiva.nombre}` : ''

    // Extracto completo: cada compra con su propio detalle de artículos (no solo el total),
    // para poder tener un respaldo de todo el período filtrado con ese proveedor.
    imprimirExtracto({
      nombreNegocio,
      titulo: 'Extracto de compras por proveedor',
      subtitulo: `Proveedor: ${proveedor?.nombre}${proveedor?.nit ? ` (${proveedor.nit})` : ''}${rangoFechas}${rangoTemporada}`,
      columnas: [
        { label: 'Artículo' },
        { label: 'Cant.', align: 'right' },
        { label: 'C. unit.', align: 'right' },
        { label: 'Subtotal', align: 'right' },
      ],
      grupos: comprasFiltradas.map((c) => ({
        encabezado: `${c.referencias ? `N° ${c.referencias}` : 'Sin comprobante'} · ${new Date(c.fecha).toLocaleDateString()} · Sistema #${c.id}`,
        subencabezado: c.porPagar > 0 ? `Con saldo pendiente: ${money(c.porPagar)}` : 'Pagada',
        filas: c.detalles.map((d) => [
          articuloPorId.get(d.idArticulo)?.codigo ?? `#${d.idArticulo}`,
          d.cantidad,
          money(d.costoUnitario),
          money(d.subTotal),
        ]),
        totales: [
          { label: 'Total', valor: `${money(c.total)}` },
          { label: 'Pagado', valor: `${money(c.pagado)}` },
          { label: 'Por pagar', valor: `${money(c.porPagar)}` },
        ],
      })),
      totalesGenerales: [
        { label: 'Total comprado', valor: `${money(totalGeneral)}` },
        { label: 'Total pagado', valor: `${money(totalPagado)}` },
        { label: 'Total por pagar', valor: `${money(totalPorPagar)}` },
      ],
    })
  }

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Compras por proveedor
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Historial de compras registradas a un proveedor. Desplegá una compra para ver su detalle.
        </Typography>
      </div>

      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ maxWidth: 420, flexGrow: 1 }}>
          <EntityAutocomplete
            label="Buscar proveedor por nombre o NIT…"
            queryKey="proveedores-autocomplete-reporte-compras"
            searchFn={buscarProveedoresTexto}
            getLabel={(p: Proveedor) => p.nombre}
            getSecondaryLabel={(p: Proveedor) => p.nit ?? undefined}
            getId={(p: Proveedor) => p.id}
            value={proveedor}
            onChange={cambiarProveedor}
          />
        </Box>

        {proveedor && (
          <>
            <Tooltip title="Limpiar filtros">
              <IconButton onClick={() => setFiltros(filtrosAnioActual())}>
                <FilterAltOffIcon />
              </IconButton>
            </Tooltip>
            <Button
              startIcon={<PrintIcon />}
              variant="outlined"
              disabled={comprasFiltradas.length === 0}
              onClick={imprimirListadoCompras}
            >
              Imprimir listado
            </Button>
          </>
        )}
      </Stack>

      {!proveedor && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Elegí un proveedor para ver su historial de compras.</Typography>
        </Paper>
      )}

      {proveedor && (
        <>
          <FiltroFechaNumero
            filtros={filtros}
            onChange={setFiltros}
            numeroLabel="N° de factura/boleta"
            numeroPlaceholder="El N° que te dio el proveedor"
            temporadas={temporadasQuery.data ?? []}
          />

          {comprasQuery.isLoading && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={28} />
            </Paper>
          )}

          {comprasQuery.isError && <Alert severity="error">{getErrorMessage(comprasQuery.error)}</Alert>}

          {!comprasQuery.isLoading && !comprasQuery.isError && comprasFiltradas.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {(comprasQuery.data ?? []).length === 0
                  ? 'Todavía no tiene compras registradas.'
                  : 'Ninguna compra coincide con el filtro.'}
              </Typography>
            </Paper>
          )}

          {comprasFiltradas.length > 0 && (
            <Stack
              direction="row"
              spacing={{ xs: 1.5, sm: 3 }}
              sx={{ display: { xs: 'none', sm: 'flex' }, px: 2, pr: 6 }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 160 }}>
                N° comprobante
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90 }}>
                Fecha
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 100, flexGrow: 1 }}>
                Total
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 100 }}>
                Pagado
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 90 }}>
                Estado
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 64 }}>
                Interno
              </Typography>
            </Stack>
          )}

          {comprasFiltradas.map((compra) => (
            <Accordion key={compra.id} variant="outlined" disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction="row"
                  spacing={{ xs: 1.5, sm: 3 }}
                  sx={{ flexWrap: 'wrap', alignItems: 'center', width: '100%', rowGap: 0.5, pr: 1 }}
                >
                  <Typography sx={{ fontWeight: 700, minWidth: 160 }}>
                    {compra.referencias ? `N° ${compra.referencias}` : 'Sin comprobante'}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 90 }}>
                    {new Date(compra.fecha).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 100, flexGrow: 1 }}>
                    Total: {money(compra.total)}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 100 }}>
                    Pagado: {money(compra.pagado)}
                  </Typography>
                  <Chip
                    size="small"
                    label={compra.porPagar > 0 ? `Debe ${money(compra.porPagar)}` : 'Pagada'}
                    color={compra.porPagar > 0 ? 'warning' : 'success'}
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 64 }}>
                    Sistema #{compra.id}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Artículo</TableCell>
                          <TableCell>Lote</TableCell>
                          <TableCell align="right">Cant.</TableCell>
                          <TableCell align="right">C. unit.</TableCell>
                          <TableCell align="right">Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {compra.detalles.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell>{articuloPorId.get(d.idArticulo)?.codigo ?? `#${d.idArticulo}`}</TableCell>
                            <TableCell>{d.lote || '—'}</TableCell>
                            <TableCell align="right">{d.cantidad}</TableCell>
                            <TableCell align="right">{money(d.costoUnitario)}</TableCell>
                            <TableCell align="right">{money(d.subTotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography>Total</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{money(compra.total)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography>Pagado</Typography>
                    <Typography>{money(compra.pagado)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography>Por pagar</Typography>
                    <Typography color={compra.porPagar > 0 ? 'warning.main' : 'success.main'}>
                      {money(compra.porPagar)}
                    </Typography>
                  </Stack>

                  {compra.nota && <Alert severity="info">{compra.nota}</Alert>}

                  <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={() => imprimirNota(compra)}>
                      Imprimir
                    </Button>
                  </Stack>
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}
    </Stack>
  )
}
