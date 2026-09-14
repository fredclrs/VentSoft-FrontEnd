import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'
import { ConfirmDialog } from './ConfirmDialog'
import { EntityAutocomplete } from './EntityAutocomplete'
import { obtenerUbicacion } from '../utils/articulo'
import { articulosApi, buscarArticulos, getStockTodos } from '../api/articulos'
import { getDevolucionesByVenta, registrarDevolucion } from '../api/devoluciones'
import { getErrorMessage } from '../api/errors'
import { imprimirNotaDevolucion } from '../utils/notaDevolucion'
import { useAuth } from '../auth/AuthContext'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import type { Articulo } from '../types/articulo'
import type { Cliente } from '../types/cliente'
import type { DevolucionVenta, RegistrarDetalleCambio, RegistrarDetalleDevolucion } from '../types/devolucion'
import type { Venta } from '../types/venta'

interface LineaCambio {
  articulo: Articulo
  cantidad: number
  precioUnitario: number
}

interface DevolucionDialogProps {
  open: boolean
  onClose: () => void
  venta: Venta
  cliente: Cliente
  onSuccess: (devolucion: DevolucionVenta) => void
}

/** Devolución (y opcionalmente cambio) de artículos de una venta ya registrada. Siempre
 * referencia la venta original: se elige qué renglones se devuelven y, si es un cambio,
 * qué artículos nuevos se lleva el cliente. El backend calcula la diferencia de dinero;
 * acá solo se muestra una vista previa para guiar al cajero. */
export function DevolucionDialog({ open, onClose, venta, cliente, onSuccess }: DevolucionDialogProps) {
  const { usuario } = useAuth()
  const { nombreNegocio, simboloMoneda, money, permiteVentaACredito } = useConfiguracionEmpresa()
  const queryClient = useQueryClient()

  const [cantidades, setCantidades] = useState<Record<number, string>>({})
  const [vendibles, setVendibles] = useState<Record<number, boolean>>({})
  const [esCambio, setEsCambio] = useState(false)
  const [articulosNuevos, setArticulosNuevos] = useState<LineaCambio[]>([])
  const [articuloParaAgregar, setArticuloParaAgregar] = useState<Articulo | null>(null)
  // Si destilda "Es un cambio" habiendo algo cargado, se le confirma antes de perderlo — sin
  // esto, quedaba oculto pero sin borrarse de verdad (reaparecía si volvía a tildar).
  const [confirmarDescartarCambio, setConfirmarDescartarCambio] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [montoCobradoAhora, setMontoCobradoAhora] = useState('0')
  const [devolverEnEfectivo, setDevolverEnEfectivo] = useState(true)
  const [imprimirComprobante, setImprimirComprobante] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stock de todo el catálogo (mismo criterio que Ventas): se muestra en cada opción del
  // listado de "Artículo nuevo", para no descubrir recién al guardar que no hay stock (el
  // backend igual lo vuelve a validar al confirmar).
  const stockQuery = useQuery({ queryKey: ['stock', 'todos'], queryFn: getStockTodos })
  const stockPorArticulo = useMemo(
    () => new Map((stockQuery.data ?? []).map((s) => [s.idArticulo, s.stockActual])),
    [stockQuery.data],
  )
  const stockNuevo = articuloParaAgregar && stockQuery.data ? stockPorArticulo.get(articuloParaAgregar.id) ?? 0 : null

  const devolucionesQuery = useQuery({
    queryKey: ['devoluciones', 'byVenta', venta.id],
    queryFn: () => getDevolucionesByVenta(venta.id),
    enabled: open,
  })

  // Solo para mostrar código/descripción en la tabla (los renglones traen apenas idArticulo).
  const articulosQuery = useQuery({ queryKey: ['articulos'], queryFn: () => articulosApi.search() })
  const articuloPorId = useMemo(
    () => new Map((articulosQuery.data ?? []).map((a) => [a.id, a])),
    [articulosQuery.data],
  )

  // Cuánto ya se devolvió antes de cada renglón, para no dejar devolver de más.
  const yaDevueltoPorLinea = useMemo(() => {
    const mapa = new Map<number, number>();
    (devolucionesQuery.data ?? []).forEach((d) => {
      d.detalles.forEach((det) => {
        mapa.set(det.idDetalleVenta, (mapa.get(det.idDetalleVenta) ?? 0) + det.cantidad)
      })
    })
    return mapa
  }, [devolucionesQuery.data])

  function disponible(idDetalleVenta: number, cantidadVendida: number) {
    return cantidadVendida - (yaDevueltoPorLinea.get(idDetalleVenta) ?? 0)
  }

  const totalDevuelto = useMemo(
    () =>
      venta.detalles.reduce((acc, d) => {
        const cant = Number(cantidades[d.id]) || 0
        return acc + cant * d.precioUnitario
      }, 0),
    [cantidades, venta.detalles],
  )

  const totalCambio = useMemo(
    () => articulosNuevos.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0),
    [articulosNuevos],
  )

  // Si eligió "cambio" pero todavía no cargó qué se lleva, no hay nada real que mostrar ni
  // confirmar — recién tiene sentido calcular la diferencia una vez que se sabe el artículo nuevo.
  const faltaCargarCambio = esCambio && articulosNuevos.length === 0

  // Vista previa del mismo cálculo que hace el backend (ver RegistrarDevolucionCommandHandler):
  // el Total se recalcula sacando lo devuelto y sumando lo nuevo EN UN SOLO paso — la deuda que
  // la venta ya tenía por el artículo devuelto sigue siendo válida para el artículo nuevo, no se
  // "pierde" para volver a cobrarlo desde cero. Solo se avisa/cobra la diferencia EXTRA, por
  // encima de lo que la venta ya debía antes de esta operación.
  const preview = useMemo(() => {
    const nuevoTotal = Math.max(0, venta.total - totalDevuelto + totalCambio)
    const porPagarBruto = nuevoTotal - venta.pagado
    const sobrante = porPagarBruto < 0 ? -porPagarBruto : 0
    const nuevaDeuda = porPagarBruto < 0 ? 0 : porPagarBruto
    const extraAPagar = Math.max(0, nuevaDeuda - venta.porPagar)
    return { sobrante, extraAPagar }
  }, [venta.total, venta.pagado, venta.porPagar, totalDevuelto, totalCambio])

  // Si el negocio no vende a crédito, la diferencia a favor del negocio en un cambio se cobra
  // SIEMPRE completa (mismo criterio que "Contado" en Ventas) — no se puede dejar ni un poco
  // como deuda nueva solo porque vino disfrazada de cambio en vez de una venta común.
  useEffect(() => {
    if (!permiteVentaACredito) setMontoCobradoAhora(String(preview.extraAPagar))
  }, [permiteVentaACredito, preview.extraAPagar])

  function limpiar() {
    setCantidades({})
    setVendibles({})
    setEsCambio(false)
    setArticulosNuevos([])
    setArticuloParaAgregar(null)
    setMotivo('')
    setMontoCobradoAhora('0')
    setDevolverEnEfectivo(true)
    setError(null)
  }

  /** Tildar "Es un cambio" es directo. Destildarlo, si hay algo cargado (un artículo ya
   * agregado, o elegido pero todavía sin agregar), primero confirma — para no perderlo sin
   * darse cuenta. Si no hay nada cargado, destilda derecho. */
  function alTildarCambio(checked: boolean) {
    if (checked) {
      setEsCambio(true)
      return
    }
    if (articulosNuevos.length > 0 || articuloParaAgregar) {
      setConfirmarDescartarCambio(true)
      return
    }
    setEsCambio(false)
  }

  function confirmarDescartarCambioYDestildar() {
    setArticulosNuevos([])
    setArticuloParaAgregar(null)
    setEsCambio(false)
    setConfirmarDescartarCambio(false)
  }

  function cerrar() {
    limpiar()
    onClose()
  }

  function agregarArticuloNuevo() {
    if (!articuloParaAgregar) return
    setArticulosNuevos((prev) => {
      const index = prev.findIndex((l) => l.articulo.id === articuloParaAgregar.id)
      if (index === -1) return [...prev, { articulo: articuloParaAgregar, cantidad: 1, precioUnitario: articuloParaAgregar.precio }]
      const copia = [...prev]
      copia[index] = { ...copia[index], cantidad: copia[index].cantidad + 1 }
      return copia
    })
    setArticuloParaAgregar(null)
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!usuario) throw new Error('Falta el usuario.')

      const detalles: RegistrarDetalleDevolucion[] = venta.detalles
        .filter((d) => (Number(cantidades[d.id]) || 0) > 0)
        .map((d) => ({
          idDetalleVenta: d.id,
          cantidad: Number(cantidades[d.id]),
          vendible: vendibles[d.id] ?? true,
        }))

      if (detalles.length === 0) throw new Error('Indicá al menos un artículo a devolver.')

      const articulosCambio: RegistrarDetalleCambio[] = esCambio
        ? articulosNuevos.map((l) => ({ idArticulo: l.articulo.id, cantidad: l.cantidad, precioUnitario: l.precioUnitario }))
        : []

      return registrarDevolucion({
        idVenta: venta.id,
        idUsuario: usuario.id,
        motivo: motivo || undefined,
        detalles,
        articulosCambio,
        montoCobradoAhora: preview.extraAPagar > 0 ? Number(montoCobradoAhora) || 0 : 0,
        devolverEnEfectivo,
      })
    },
    onSuccess: (devolucion) => {
      queryClient.invalidateQueries({ queryKey: ['ventas', 'byCliente', cliente.id] })
      queryClient.invalidateQueries({ queryKey: ['devoluciones'] })
      queryClient.invalidateQueries({ queryKey: ['reportes', 'stockBajo'] })
      // Un cambio también puede descontar stock (el artículo nuevo entregado): sin esto,
      // el desplegable de "artículo nuevo" seguía mostrando el stock viejo hasta refrescar
      // la página entera.
      queryClient.invalidateQueries({ queryKey: ['stock', 'todos'] })

      if (imprimirComprobante) {
        imprimirNotaDevolucion({
          nombreNegocio,
          simboloMoneda,
          id: devolucion.id,
          idVenta: venta.id,
          fecha: devolucion.fecha,
          cliente: cliente.nombre,
          documentoCliente: cliente.documentoIdentidad,
          vendedor: usuario!.nombre,
          motivo: motivo || undefined,
          devueltos: venta.detalles
            .filter((d) => (Number(cantidades[d.id]) || 0) > 0)
            .map((d) => {
              const articulo = articuloPorId.get(d.idArticulo)
              return {
                codigo: articulo?.codigo ?? `#${d.idArticulo}`,
                descripcion: articulo?.descripcion,
                cantidad: Number(cantidades[d.id]),
                precioUnitario: d.precioUnitario,
                subtotal: Number(cantidades[d.id]) * d.precioUnitario,
              }
            }),
          nuevos: articulosNuevos.map((l) => ({
            codigo: l.articulo.codigo,
            descripcion: l.articulo.descripcion,
            cantidad: l.cantidad,
            precioUnitario: l.precioUnitario,
            subtotal: l.cantidad * l.precioUnitario,
          })),
          montoCobradoAhora: devolucion.montoCobradoAhora,
          porPagar: devolucion.porPagar,
          montoDevueltoEfectivo: devolucion.montoDevueltoEfectivo,
          saldoAFavorGenerado: devolucion.saldoAFavorGenerado,
        })
      }

      onSuccess(devolucion)
      cerrar()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  return (
    <>
    <Dialog open={open} onClose={cerrar} maxWidth="md" fullWidth>
      <DialogTitle>
        {esCambio ? 'Cambio' : 'Devolución'} — Venta #{venta.id}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="subtitle2">Artículos a devolver</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Artículo</TableCell>
                  <TableCell align="right">Vendido</TableCell>
                  <TableCell align="right">Disponible</TableCell>
                  <TableCell align="right">Cant. a devolver</TableCell>
                  <TableCell align="center">Vendible</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {venta.detalles.map((d) => {
                  const disp = disponible(d.id, d.cantidad)
                  const articulo = articuloPorId.get(d.idArticulo)
                  const seDevuelve = (Number(cantidades[d.id]) || 0) > 0
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{articulo ? `${articulo.codigo} — ${articulo.descripcion ?? ''}` : `#${d.idArticulo}`}</TableCell>
                      <TableCell align="right">{d.cantidad}</TableCell>
                      <TableCell align="right">{disp}</TableCell>
                      <TableCell align="right" sx={{ width: 120 }}>
                        <TextField
                          size="small"
                          type="number"
                          disabled={disp <= 0}
                          value={cantidades[d.id] ?? ''}
                          onChange={(e) => setCantidades((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          slotProps={{ htmlInput: { min: 0, max: disp, style: { textAlign: 'right' } } }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          size="small"
                          disabled={!seDevuelve}
                          checked={seDevuelve && (vendibles[d.id] ?? true)}
                          onChange={(e) => setVendibles((prev) => ({ ...prev, [d.id]: e.target.checked }))}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary">
            "Vendible" tildado = vuelve a stock para vender de nuevo. Destildalo si el artículo está dañado o no se puede revender.
          </Typography>

          <Divider />

          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Checkbox checked={esCambio} onChange={(e) => alTildarCambio(e.target.checked)} />}
              label="Es un cambio (el cliente se lleva otro artículo)"
            />
            <FormControlLabel
              control={<Checkbox checked={imprimirComprobante} onChange={(e) => setImprimirComprobante(e.target.checked)} />}
              label="Imprimir comprobante al confirmar"
            />
          </Stack>

          {esCambio && (
            <Stack spacing={1.5}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr auto' }, gap: 1.5 }}>
                <EntityAutocomplete
                  label="Artículo nuevo"
                  size="small"
                  queryKey="articulos-autocomplete-cambio"
                  searchFn={buscarArticulos}
                  getLabel={(a: Articulo) => `${a.codigo} — ${a.descripcion ?? ''}`}
                  getSecondaryLabel={(a: Articulo) => {
                    const ubicacion = obtenerUbicacion(a)
                    const stock = stockPorArticulo.get(a.id) ?? 0
                    const textoStock = !stockQuery.data ? '' : ` · ${stock > 0 ? `Stock: ${stock}` : 'Sin stock'}`
                    return `Precio: ${money(a.precio)}${ubicacion ? ` · Ubicación: ${ubicacion}` : ''}${textoStock}`
                  }}
                  getId={(a: Articulo) => a.id}
                  value={articuloParaAgregar}
                  onChange={setArticuloParaAgregar}
                />
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  onClick={agregarArticuloNuevo}
                  disabled={!articuloParaAgregar || stockNuevo === 0}
                  sx={{ height: 40 }}
                >
                  Agregar
                </Button>
              </Box>
              {articuloParaAgregar && stockNuevo !== null && (
                <Typography variant="caption" color={stockNuevo > 0 ? 'text.secondary' : 'error'}>
                  {stockNuevo > 0 ? `Stock disponible: ${stockNuevo}` : 'Sin stock disponible de este artículo.'}
                </Typography>
              )}

              {articulosNuevos.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Artículo</TableCell>
                        <TableCell align="right">Cantidad</TableCell>
                        <TableCell align="right">Precio unit.</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {articulosNuevos.map((l, index) => (
                        <TableRow key={l.articulo.id}>
                          <TableCell>{l.articulo.codigo} — {l.articulo.descripcion}</TableCell>
                          <TableCell align="right" sx={{ width: 100 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={l.cantidad}
                              onChange={(e) =>
                                setArticulosNuevos((prev) =>
                                  prev.map((x, i) => (i === index ? { ...x, cantidad: Number(e.target.value) } : x)),
                                )
                              }
                              slotProps={{ htmlInput: { min: 1, style: { textAlign: 'right' } } }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ width: 120 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={l.precioUnitario}
                              onChange={(e) =>
                                setArticulosNuevos((prev) =>
                                  prev.map((x, i) => (i === index ? { ...x, precioUnitario: Number(e.target.value) } : x)),
                                )
                              }
                              slotProps={{ htmlInput: { style: { textAlign: 'right' } } }}
                            />
                          </TableCell>
                          <TableCell align="right">{money(l.cantidad * l.precioUnitario)}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setArticulosNuevos((prev) => prev.filter((_, i) => i !== index))}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          )}

          <Divider />

          {faltaCargarCambio ? (
            <Typography variant="body2" color="text.secondary">
              Elegí el artículo nuevo para ver la diferencia a cobrar o a favor del cliente.
            </Typography>
          ) : (
            <Stack spacing={1}>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography>Total devuelto</Typography>
                <Typography>{money(totalDevuelto)}</Typography>
              </Stack>
              {esCambio && (
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>Total artículo(s) nuevo(s)</Typography>
                  <Typography>{money(totalCambio)}</Typography>
                </Stack>
              )}

              {preview.extraAPagar > 0 && (
                <>
                  <Alert severity="warning">
                    {permiteVentaACredito
                      ? `Se lleva ${money(preview.extraAPagar)} más de lo que devuelve — esa diferencia se suma a lo que debe.`
                      : `Se lleva ${money(preview.extraAPagar)} más de lo que devuelve — este negocio no vende a crédito, así que se cobra completo ahora.`}
                  </Alert>
                  <TextField
                    label="Cobrar ahora"
                    type="number"
                    size="small"
                    disabled={!permiteVentaACredito}
                    value={montoCobradoAhora}
                    onChange={(e) => setMontoCobradoAhora(e.target.value)}
                    helperText={
                      permiteVentaACredito
                        ? `Lo que no se cobre ahora (${money(
                            Math.max(0, preview.extraAPagar - (Number(montoCobradoAhora) || 0)),
                          )}) queda pendiente como deuda.`
                        : 'Se carga solo (este negocio no vende a crédito)'
                    }
                    slotProps={{ htmlInput: { min: 0, max: preview.extraAPagar } }}
                  />
                </>
              )}

              {preview.sobrante > 0 && (
                <>
                  <Alert severity="info">Queda {money(preview.sobrante)} a favor del cliente.</Alert>
                  <RadioGroup
                    value={devolverEnEfectivo ? 'efectivo' : 'credito'}
                    onChange={(e) => setDevolverEnEfectivo(e.target.value === 'efectivo')}
                  >
                    <FormControlLabel value="efectivo" control={<Radio size="small" />} label="Devolver en efectivo ahora" />
                    <FormControlLabel
                      value="credito"
                      control={<Radio size="small" />}
                      label="Dejar como saldo a favor para su próxima compra"
                    />
                  </RadioGroup>
                </>
              )}
            </Stack>
          )}

          <TextField
            label="Motivo (opcional)"
            size="small"
            fullWidth
            multiline
            minRows={1}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={mutation.isPending || totalDevuelto <= 0 || faltaCargarCambio}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Guardando…' : esCambio ? 'Confirmar cambio' : 'Confirmar devolución'}
        </Button>
      </DialogActions>
    </Dialog>

    <ConfirmDialog
      open={confirmarDescartarCambio}
      titulo="Descartar el cambio"
      mensaje={`Tenés ${articulosNuevos.length > 0 ? `${articulosNuevos.length} artículo(s) cargado(s)` : 'un artículo elegido'} para el cambio. Si destildás "Es un cambio" ahora, se descarta. ¿Seguro?`}
      confirmarLabel="Descartar"
      onConfirmar={confirmarDescartarCambioYDestildar}
      onCancelar={() => setConfirmarDescartarCambio(false)}
    />
    </>
  )
}
