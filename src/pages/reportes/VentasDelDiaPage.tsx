import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreOutlined'
import PrintIcon from '@mui/icons-material/PrintOutlined'
import ClearIcon from '@mui/icons-material/ClearOutlined'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import { articulosApi, buscarArticulos } from '../../api/articulos'
import { familiasApi } from '../../api/familias'
import { usuariosApi } from '../../api/usuarios'
import { buscarClientes } from '../../api/clientes'
import { getVentasDelDia } from '../../api/ventas'
import { getDevolucionesDelDia } from '../../api/devoluciones'
import { eliminarMovimientoCaja, getMovimientosCajaDelDia, registrarMovimientoCaja } from '../../api/movimientoCaja'
import { getErrorMessage } from '../../api/errors'
import { useConfiguracionEmpresa } from '../../hooks/useConfiguracionEmpresa'
import { useAuth } from '../../auth/AuthContext'
import { EntityAutocomplete } from '../../components/EntityAutocomplete'
import { BotonImprimirNota } from '../../components/BotonImprimirNota'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { imprimirNotaVenta } from '../../utils/notaVenta'
import type { FormatoImpresion } from '../../utils/notaVenta'
import { imprimirExtracto } from '../../utils/imprimirListado'
import type { Venta, DetalleVenta } from '../../types/venta'
import type { Articulo } from '../../types/articulo'
import type { MovimientoCaja, TipoMovimientoCaja } from '../../types/movimientoCaja'

function hoyISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface TarjetaResumen {
  label: string
  valor: string
  color?: 'success.main' | 'warning.main' | 'text.primary'
}

export function VentasDelDiaPage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()
  const { nombreNegocio, simboloMoneda, money } = useConfiguracionEmpresa()
  const [fecha, setFecha] = useState(hoyISO)
  const [articuloFiltro, setArticuloFiltro] = useState<Articulo | null>(null)
  const [idFamiliaFiltro, setIdFamiliaFiltro] = useState<number | ''>('')

  // Movimientos de caja: entradas/salidas de efectivo del día que no vienen de una Venta ni de
  // una Devolución/Cambio — el otro caso de "cuadrar la caja" (sacar plata para comprar algo,
  // un gasto suelto, etc.).
  const [movimientoDialogAbierto, setMovimientoDialogAbierto] = useState(false)
  const [tipoNuevoMovimiento, setTipoNuevoMovimiento] = useState<TipoMovimientoCaja>('SALIDA')
  const [montoNuevoMovimiento, setMontoNuevoMovimiento] = useState('')
  const [motivoNuevoMovimiento, setMotivoNuevoMovimiento] = useState('')
  const [errorMovimiento, setErrorMovimiento] = useState<string | null>(null)
  const [movimientoAEliminar, setMovimientoAEliminar] = useState<MovimientoCaja | null>(null)

  // Endpoint propio (no reusa el historial "por cliente"): así el permiso "ventas_dia" queda
  // realmente separado del permiso "ventas" en el backend, no solo escondido en el menú.
  const ventasQuery = useQuery({ queryKey: ['ventas', 'delDia', fecha], queryFn: () => getVentasDelDia(fecha) })
  const ventasDelDia = useMemo(
    () => [...(ventasQuery.data ?? [])].sort((a, b) => a.id - b.id),
    [ventasQuery.data],
  )

  const clientesQuery = useQuery({ queryKey: ['clientes-todos'], queryFn: () => buscarClientes() })
  const clientePorId = useMemo(
    () => new Map((clientesQuery.data ?? []).map((c) => [c.id, c])),
    [clientesQuery.data],
  )

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

  const familiasQuery = useQuery({ queryKey: ['familias'], queryFn: () => familiasApi.search() })
  const familiaPorId = useMemo(
    () => new Map((familiasQuery.data ?? []).map((f) => [f.id, f])),
    [familiasQuery.data],
  )

  // Devoluciones/cambios del día: también mueven efectivo de la caja (se devuelve plata, o se
  // cobra de más en un cambio) y este reporte no los tenía en cuenta para nada.
  const devolucionesQuery = useQuery({
    queryKey: ['devoluciones', 'delDia', fecha],
    queryFn: () => getDevolucionesDelDia(fecha),
  })

  const movimientosCajaQuery = useQuery({
    queryKey: ['movimientosCaja', 'delDia', fecha],
    queryFn: () => getMovimientosCajaDelDia(fecha),
  })

  const registrarMovimientoMutation = useMutation({
    mutationFn: registrarMovimientoCaja,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientosCaja', 'delDia', fecha] })
      setMovimientoDialogAbierto(false)
      setMontoNuevoMovimiento('')
      setMotivoNuevoMovimiento('')
      setTipoNuevoMovimiento('SALIDA')
    },
    onError: (err) => setErrorMovimiento(getErrorMessage(err)),
  })

  const eliminarMovimientoMutation = useMutation({
    mutationFn: eliminarMovimientoCaja,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientosCaja', 'delDia', fecha] })
      setMovimientoAEliminar(null)
    },
    onError: (err) => setErrorMovimiento(getErrorMessage(err)),
  })

  const cargando =
    ventasQuery.isLoading ||
    clientesQuery.isLoading ||
    articulosQuery.isLoading ||
    familiasQuery.isLoading ||
    devolucionesQuery.isLoading ||
    movimientosCajaQuery.isLoading
  const hayError =
    ventasQuery.isError ||
    clientesQuery.isError ||
    articulosQuery.isError ||
    familiasQuery.isError ||
    devolucionesQuery.isError ||
    movimientosCajaQuery.isError

  const hayFiltroProducto = !!articuloFiltro || !!idFamiliaFiltro

  // Con filtro: solo las ventas que tengan al menos un renglón de ese artículo/familia, y
  // adentro de cada una, solo esos renglones (no toda la venta) — para ver puntualmente qué
  // se vendió de eso hoy, sin mezclar con el resto de los artículos de la misma venta.
  const ventasVisibles = useMemo(() => {
    if (!hayFiltroProducto) return ventasDelDia.map((v) => ({ venta: v, detalles: v.detalles }))

    const pasaFiltro = (d: DetalleVenta): boolean => {
      if (articuloFiltro) return d.idArticulo === articuloFiltro.id
      if (idFamiliaFiltro) return articuloPorId.get(d.idArticulo)?.idFamilia === idFamiliaFiltro
      return true
    }

    return ventasDelDia
      .map((v) => ({ venta: v, detalles: v.detalles.filter(pasaFiltro) }))
      .filter((v) => v.detalles.length > 0)
  }, [ventasDelDia, hayFiltroProducto, articuloFiltro, idFamiliaFiltro, articuloPorId])

  // Resumen puntual del artículo/familia filtrado — aparte del resumen general del día, que
  // sigue reflejando TODO lo vendido sin importar el filtro.
  const resumenFiltro = useMemo(() => {
    if (!hayFiltroProducto) return null
    let cantidad = 0
    let total = 0
    for (const { detalles } of ventasVisibles) {
      for (const d of detalles) {
        cantidad += d.cantidad
        total += d.subTotal
      }
    }
    return { cantidad, total }
  }, [ventasVisibles, hayFiltroProducto])

  const totales = useMemo(() => {
    let totalVendido = 0
    let totalCobrado = 0
    let gananciaBruta = 0
    let hayCostoAproximado = false

    for (const venta of ventasDelDia) {
      totalVendido += venta.total
      totalCobrado += venta.pagado
      for (const d of venta.detalles) {
        // El costo se congeló en el renglón al momento de vender (ver DetalleVenta.CostoUnitario)
        // — es el exacto de ese día. Solo en ventas viejas (de antes de guardar ese dato) no está
        // disponible, y ahí se cae de vuelta al costo ACTUAL del artículo como aproximación.
        if (d.costoUnitario == null) hayCostoAproximado = true
        const costo = d.costoUnitario ?? articuloPorId.get(d.idArticulo)?.costo ?? 0
        gananciaBruta += (d.precioUnitario - costo) * d.cantidad
      }
    }

    return { totalVendido, totalCobrado, totalPorCobrar: totalVendido - totalCobrado, gananciaBruta, hayCostoAproximado }
  }, [ventasDelDia, articuloPorId])

  // Efectivo real que debería haber en la caja hoy — para negocios que venden solo al contado.
  // NO es lo mismo que "Total cobrado": ese incluye plata que en realidad no entró hoy (saldo a
  // favor aplicado, que ya se "cobró" el día de la devolución que lo generó) y no contempla las
  // devoluciones/cambios de HOY (también mueven efectivo) ni los movimientos de caja sueltos
  // (sacar plata para comprar algo, un gasto, etc.).
  const efectivoEnCaja = useMemo(() => {
    let efectivo = 0
    for (const venta of ventasDelDia) {
      efectivo += venta.pagado - venta.montoSaldoAFavorAplicado
    }
    for (const d of devolucionesQuery.data ?? []) {
      efectivo += d.montoCobradoAhora - d.montoDevueltoEfectivo
    }
    for (const m of movimientosCajaQuery.data ?? []) {
      efectivo += m.tipo === 'ENTRADA' ? m.monto : -m.monto
    }
    return efectivo
  }, [ventasDelDia, devolucionesQuery.data, movimientosCajaQuery.data])

  const tarjetas: TarjetaResumen[] = [
    { label: 'Total vendido', valor: `${money(totales.totalVendido)}` },
    { label: 'Total cobrado', valor: `${money(totales.totalCobrado)}`, color: 'success.main' },
    {
      label: 'Por cobrar',
      valor: `${money(totales.totalPorCobrar)}`,
      color: totales.totalPorCobrar > 0 ? 'warning.main' : 'success.main',
    },
    {
      label: totales.hayCostoAproximado ? 'Ganancia bruta estimada' : 'Ganancia bruta',
      valor: `${money(totales.gananciaBruta)}`,
      color: 'success.main',
    },
  ]

  function imprimirNota(venta: Venta, formato: FormatoImpresion) {
    const cliente = clientePorId.get(venta.idCliente)
    imprimirNotaVenta({
      nombreNegocio,
      simboloMoneda,
      id: venta.id,
      fecha: venta.fechaRegistro ?? venta.fecha,
      cliente: cliente?.nombre ?? `Cliente #${venta.idCliente}`,
      documentoCliente: cliente?.documentoIdentidad ?? '',
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

  function imprimirCierre() {
    const fechaLegible = new Date(`${fecha}T00:00:00`).toLocaleDateString('es-BO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const nombreFiltro = articuloFiltro
      ? `${articuloFiltro.codigo} — ${articuloFiltro.descripcion ?? ''}`
      : idFamiliaFiltro
        ? familiaPorId.get(idFamiliaFiltro)?.nombreFamilia
        : null

    imprimirExtracto({
      nombreNegocio,
      titulo: 'Cierre de ventas del día',
      subtitulo: nombreFiltro ? `${fechaLegible} · Filtrado por: ${nombreFiltro}` : fechaLegible,
      columnas: [
        { label: 'Artículo' },
        { label: 'Cant.', align: 'right' },
        { label: 'P. unit.', align: 'right' },
        { label: 'Subtotal', align: 'right' },
      ],
      grupos: ventasVisibles.map(({ venta: v, detalles }) => ({
        encabezado: `Venta #${v.id} · Cliente: ${clientePorId.get(v.idCliente)?.nombre ?? `#${v.idCliente}`}`,
        subencabezado: v.referencias ? `Ref: ${v.referencias}` : undefined,
        filas: detalles.map((d) => [
          articuloPorId.get(d.idArticulo)?.codigo ?? `#${d.idArticulo}`,
          d.cantidad,
          money(d.precioUnitario),
          money(d.subTotal),
        ]),
        // Con filtro, Total/Pagado de la venta completa no tienen sentido (solo se ven algunos
        // renglones de esa venta) — se omiten para no confundir con el subtotal filtrado.
        totales: hayFiltroProducto
          ? undefined
          : [
              { label: 'Total', valor: `${money(v.total)}` },
              { label: 'Pagado', valor: `${money(v.pagado)}` },
            ],
      })),
      totalesGenerales: hayFiltroProducto
        ? [
            { label: 'Cantidad vendida', valor: `${resumenFiltro?.cantidad ?? 0}` },
            { label: 'Total vendido', valor: `${money(resumenFiltro?.total ?? 0)}` },
          ]
        : [
            { label: 'Total vendido', valor: `${money(totales.totalVendido)}` },
            { label: 'Total cobrado', valor: `${money(totales.totalCobrado)}` },
            { label: 'Por cobrar', valor: `${money(totales.totalPorCobrar)}` },
            {
              label: totales.hayCostoAproximado ? 'Ganancia bruta estimada' : 'Ganancia bruta',
              valor: `${money(totales.gananciaBruta)}`,
            },
            { label: 'Efectivo que debería haber en la caja', valor: `${money(efectivoEnCaja)}` },
          ],
    })
  }

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ventas del día
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Lo vendido en un día puntual: total recaudado, cobrado y ganancia estimada.
        </Typography>
      </div>

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <TextField
            label="Fecha"
            type="date"
            size="small"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <EntityAutocomplete
            label="Filtrar por artículo (opcional)"
            size="small"
            sx={{ width: { xs: '100%', sm: 340 } }}
            queryKey="articulos-autocomplete-ventas-del-dia"
            searchFn={buscarArticulos}
            getLabel={(a: Articulo) => `${a.codigo} — ${a.descripcion ?? ''}`}
            getId={(a: Articulo) => a.id}
            value={articuloFiltro}
            onChange={(a) => {
              setArticuloFiltro(a)
              if (a) setIdFamiliaFiltro('')
            }}
          />
          <TextField
            select
            label="Filtrar por familia"
            size="small"
            disabled={!!articuloFiltro}
            value={idFamiliaFiltro}
            onChange={(e) => setIdFamiliaFiltro(e.target.value === '' ? '' : Number(e.target.value))}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {(familiasQuery.data ?? []).map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.nombreFamilia}
              </MenuItem>
            ))}
          </TextField>
          {hayFiltroProducto && (
            <IconButton
              size="small"
              title="Quitar filtro"
              onClick={() => {
                setArticuloFiltro(null)
                setIdFamiliaFiltro('')
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
        <Button
          startIcon={<PrintIcon />}
          variant="outlined"
          disabled={ventasVisibles.length === 0}
          onClick={imprimirCierre}
        >
          Imprimir cierre del día
        </Button>
      </Stack>

      {cargando && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={28} />
        </Paper>
      )}

      {hayError && (
        <Alert severity="error">
          {getErrorMessage(
            ventasQuery.error ??
              clientesQuery.error ??
              articulosQuery.error ??
              familiasQuery.error ??
              devolucionesQuery.error ??
              movimientosCajaQuery.error,
          )}
        </Alert>
      )}
      {errorMovimiento && (
        <Alert severity="error" onClose={() => setErrorMovimiento(null)}>
          {errorMovimiento}
        </Alert>
      )}

      {!cargando && !hayError && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
            {tarjetas.map((t) => (
              <Paper key={t.label} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {t.label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: t.color }}>
                  {t.valor}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main', borderWidth: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Efectivo que debería haber en la caja hoy
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {money(efectivoEnCaja)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Ventas cobradas en efectivo hoy, descontando saldo a favor usado y sumando/restando
              lo que entró o salió por devoluciones/cambios y movimientos de caja de hoy. Pensado
              para negocios que venden solo al contado — si además cobrás con tarjeta o
              transferencia, este número no los distingue.
            </Typography>

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1.5, mb: 0.5 }}>
              <Typography variant="subtitle2">Movimientos de caja de hoy</Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  setErrorMovimiento(null)
                  setMovimientoDialogAbierto(true)
                }}
              >
                Agregar movimiento
              </Button>
            </Stack>

            {(movimientosCajaQuery.data ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin movimientos sueltos cargados hoy.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {(movimientosCajaQuery.data ?? []).map((m) => (
                  <Stack key={m.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip
                      size="small"
                      label={m.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}
                      color={m.tipo === 'ENTRADA' ? 'success' : 'warning'}
                      variant="outlined"
                      sx={{ minWidth: 72 }}
                    />
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {m.motivo}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {m.tipo === 'ENTRADA' ? '+' : '−'}
                      {money(m.monto)}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setErrorMovimiento(null)
                        setMovimientoAEliminar(m)
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>

          {totales.hayCostoAproximado && (
            <Alert severity="info">
              Alguna de estas ventas es de antes de que el sistema empezara a guardar el costo exacto de cada
              venta: para esas se usa el costo <strong>actual</strong> del artículo como aproximación. Las ventas
              nuevas ya calculan la ganancia con el costo real de ese día, sin aproximar.
            </Alert>
          )}

          {hayFiltroProducto && resumenFiltro && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Vendido hoy de{' '}
                <strong>
                  {articuloFiltro
                    ? `${articuloFiltro.codigo} — ${articuloFiltro.descripcion ?? ''}`
                    : familiaPorId.get(idFamiliaFiltro as number)?.nombreFamilia}
                </strong>
                :
              </Typography>
              <Stack direction="row" spacing={4} sx={{ mt: 0.5 }}>
                <div>
                  <Typography variant="caption" color="text.secondary">
                    Cantidad vendida
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {resumenFiltro.cantidad}
                  </Typography>
                </div>
                <div>
                  <Typography variant="caption" color="text.secondary">
                    Total vendido
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {money(resumenFiltro.total)}
                  </Typography>
                </div>
              </Stack>
            </Paper>
          )}

          {ventasVisibles.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {hayFiltroProducto
                  ? 'No se vendió nada de ese artículo/familia ese día.'
                  : 'No hay ventas registradas ese día.'}
              </Typography>
            </Paper>
          )}

          {ventasVisibles.length > 0 && (
            <Stack
              direction="row"
              spacing={{ xs: 1.5, sm: 3 }}
              sx={{ display: { xs: 'none', sm: 'flex' }, px: 2, pr: 6 }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 56 }}>
                N°
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 160 }}>
                Cliente
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

          {ventasVisibles.map(({ venta, detalles }) => (
            <Accordion key={venta.id} variant="outlined" disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction="row"
                  spacing={{ xs: 1.5, sm: 3 }}
                  sx={{ flexWrap: 'wrap', alignItems: 'center', width: '100%', rowGap: 0.5, pr: 1 }}
                >
                  <Typography sx={{ fontWeight: 700, minWidth: 56 }}>#{venta.id}</Typography>
                  <Typography variant="body2" sx={{ minWidth: 160 }}>
                    {clientePorId.get(venta.idCliente)?.nombre ?? `Cliente #${venta.idCliente}`}
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
                  {hayFiltroProducto && (
                    <Alert severity="info" sx={{ py: 0 }}>
                      Mostrando solo los renglones que coinciden con el filtro — esta venta puede
                      tener otros artículos además de estos.
                    </Alert>
                  )}
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
                        {detalles.map((d) => (
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

                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography>Total {hayFiltroProducto ? 'de la venta completa' : ''}</Typography>
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

                  <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                    <BotonImprimirNota onImprimir={(formato) => imprimirNota(venta, formato)} />
                  </Stack>
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}

      <Dialog open={movimientoDialogAbierto} onClose={() => setMovimientoDialogAbierto(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Agregar movimiento de caja</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Tipo"
              fullWidth
              value={tipoNuevoMovimiento}
              onChange={(e) => setTipoNuevoMovimiento(e.target.value as TipoMovimientoCaja)}
            >
              <MenuItem value="SALIDA">Salida (sale plata de la caja)</MenuItem>
              <MenuItem value="ENTRADA">Entrada (entra plata a la caja)</MenuItem>
            </TextField>
            <TextField
              label="Monto"
              type="number"
              required
              fullWidth
              value={montoNuevoMovimiento}
              onChange={(e) => setMontoNuevoMovimiento(e.target.value)}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Motivo"
              required
              fullWidth
              multiline
              minRows={2}
              placeholder="Ej: Compré insumos de librería"
              value={motivoNuevoMovimiento}
              onChange={(e) => setMotivoNuevoMovimiento(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovimientoDialogAbierto(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={
              registrarMovimientoMutation.isPending ||
              !usuario ||
              !(Number(montoNuevoMovimiento) > 0) ||
              !motivoNuevoMovimiento.trim()
            }
            onClick={() =>
              usuario &&
              registrarMovimientoMutation.mutate({
                fecha: new Date(`${fecha}T00:00:00`).toISOString(),
                tipo: tipoNuevoMovimiento,
                monto: Number(montoNuevoMovimiento),
                motivo: motivoNuevoMovimiento.trim(),
                idUsuario: usuario.id,
              })
            }
          >
            {registrarMovimientoMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!movimientoAEliminar}
        titulo="Eliminar movimiento de caja"
        mensaje={`¿Seguro que querés eliminar este movimiento? "${movimientoAEliminar?.motivo}" — ${movimientoAEliminar ? money(movimientoAEliminar.monto) : ''}`}
        confirmando={eliminarMovimientoMutation.isPending}
        onConfirmar={() => movimientoAEliminar && eliminarMovimientoMutation.mutate(movimientoAEliminar.id)}
        onCancelar={() => setMovimientoAEliminar(null)}
      />
    </Stack>
  )
}
