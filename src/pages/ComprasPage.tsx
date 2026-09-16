import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
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
import BarcodeIcon from '@mui/icons-material/BarcodeReader'
import { EntityAutocomplete } from '../components/EntityAutocomplete'
import { obtenerUbicacion } from '../utils/articulo'
import { fraccionDe, costoUnidadSueltaDe } from '../utils/fraccion'
import type { ModoVentaCompra } from '../utils/fraccion'
import { buscarProveedoresTexto } from '../api/proveedores'
import { actualizarPrecioArticulo, articulosApi, buscarArticulos } from '../api/articulos'
import { registrarCompra } from '../api/compras'
import { useAuth } from '../auth/AuthContext'
import { getErrorMessage } from '../api/errors'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import type { Proveedor } from '../types/proveedor'
import type { Articulo } from '../types/articulo'
import type { AvisoSinMargen, PrecioSugerido, RegistrarDetalleCompra } from '../types/compra'

interface LineaCompra {
  articulo: Articulo
  cantidad: number
  costoUnitario: number
  lote: string
  fechaVencimiento: string
  /** Solo relevante si articulo.fraccion > 1 (se compra por paquete); si no, es indistinto. */
  modo: ModoVentaCompra
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Convierte lo cargado en un renglón (paquetes o unidades sueltas, según su modo) a unidades
 * reales — es lo que efectivamente suma al stock y se manda al backend. */
function aUnidades(linea: LineaCompra): number {
  return linea.modo === 'caja' ? linea.cantidad * fraccionDe(linea.articulo) : linea.cantidad
}

/** Costo por unidad real (no por paquete) — el backend siempre trabaja en unidades. */
function costoPorUnidadDe(linea: LineaCompra): number {
  return linea.modo === 'caja' ? linea.costoUnitario / fraccionDe(linea.articulo) : linea.costoUnitario
}

export function ComprasPage() {
  const { usuario } = useAuth()
  const { money, proveedorPorDefecto, permiteCompraACredito } = useConfiguracionEmpresa()
  const queryClient = useQueryClient()

  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [referencias, setReferencias] = useState('')
  const [nota, setNota] = useState('')
  const [pagado, setPagado] = useState('0')
  const [contado, setContado] = useState(false)
  const [lineas, setLineas] = useState<LineaCompra[]>([])
  const [articuloParaAgregar, setArticuloParaAgregar] = useState<Articulo | null>(null)
  const [modoParaAgregar, setModoParaAgregar] = useState<ModoVentaCompra>('caja')
  const [codigoEscaneado, setCodigoEscaneado] = useState('')
  const [errorEscaneo, setErrorEscaneo] = useState<string | null>(null)
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null)
  const [preciosSugeridos, setPreciosSugeridos] = useState<PrecioSugerido[] | null>(null)
  // Por defecto todos marcados para aplicar — el cajero desmarca los que no quiere.
  const [preciosAceptados, setPreciosAceptados] = useState<Record<number, boolean>>({})
  const [errorPrecios, setErrorPrecios] = useState<string | null>(null)
  const [avisosSinMargen, setAvisosSinMargen] = useState<AvisoSinMargen[] | null>(null)
  const [avisoExito, setAvisoExito] = useState<string | null>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)

  // Solo para resolver código/descripción al agregar por escaneo; no es historial.
  const articulosQuery = useQuery({ queryKey: ['articulos'], queryFn: () => articulosApi.search() })

  const total = useMemo(() => lineas.reduce((acc, l) => acc + l.cantidad * l.costoUnitario, 0), [lineas])

  // La columna "Comprado por" solo se muestra si hay al menos un artículo que se compra por
  // paquete — el resto de los negocios (ropa, ferretería, etc.) nunca la ve.
  const hayFraccionados = useMemo(() => lineas.some((l) => fraccionDe(l.articulo) > 1), [lineas])

  // El lector de código de barras funciona como un teclado: "escribe" el código
  // y manda Enter solo. Enfocamos este campo al entrar y después de cada compra
  // para poder seguir escaneando sin tocar el mouse.
  useEffect(() => {
    const id = setTimeout(() => scanInputRef.current?.focus(), 100)
    return () => clearTimeout(id)
  }, [])

  // Si el negocio no compra a crédito (Configuración → Datos del negocio), la compra siempre se
  // comporta como al contado, sin importar el estado del checkbox (que además queda bloqueado).
  const contadoEfectivo = !permiteCompraACredito || contado

  // "Contado" carga el pagado = total solo (y lo mantiene al día si cambia el total).
  // Con el checkbox destildado el monto se escribe a mano, pero igual lo topamos a
  // que nunca quede pagando de más si sacás un artículo y el total baja de lo tipeado.
  useEffect(() => {
    if (contadoEfectivo) {
      setPagado(String(total))
    } else {
      setPagado((prev) => (Number(prev) > total ? String(total) : prev))
    }
  }, [contadoEfectivo, total])

  // Proveedor por defecto (Configuración → Datos del negocio): se precarga UNA sola vez, apenas
  // termina de llegar la configuración. A propósito NO reacciona cada vez que "proveedor" queda
  // en null: si dependiera de eso, cada vez que se lo borrara a mano para buscar a otro, se lo
  // volvería a pisar solo antes de poder elegir el nuevo. El re-preseleccionado después de cada
  // compra lo hace resetearCompra() directamente, no este efecto.
  const proveedorDefectoCargadoRef = useRef(false)
  useEffect(() => {
    if (!proveedorDefectoCargadoRef.current && proveedorPorDefecto) {
      proveedorDefectoCargadoRef.current = true
      setProveedor((actual) => actual ?? proveedorPorDefecto)
    }
  }, [proveedorPorDefecto])

  function resetearCompra() {
    // "Contado" queda como estaba: si el negocio compra siempre al contado, no hay
    // que volver a tildarlo en cada compra.
    setProveedor(proveedorPorDefecto)
    setFecha(hoyISO())
    setReferencias('')
    setNota('')
    setPagado('0')
    setLineas([])
    setArticuloParaAgregar(null)
    setModoParaAgregar('caja')
    setCodigoEscaneado('')
    setErrorEscaneo(null)
    setErrorMutacion(null)
    setTimeout(() => scanInputRef.current?.focus(), 100)
  }

  const registrarMutation = useMutation({
    mutationFn: () => {
      if (!proveedor || !usuario) throw new Error('Falta seleccionar un proveedor.')
      if (lineas.length === 0) throw new Error('Agregá al menos un artículo.')

      // El backend siempre trabaja en unidades: acá se convierte lo cargado (paquetes o
      // unidades sueltas, según el modo de cada renglón) antes de mandarlo.
      const detalles: RegistrarDetalleCompra[] = lineas.map((l) => ({
        idArticulo: l.articulo.id,
        cantidad: aUnidades(l),
        costoUnitario: costoPorUnidadDe(l),
        lote: l.lote || undefined,
        fechaVencimiento: l.fechaVencimiento ? new Date(l.fechaVencimiento).toISOString() : undefined,
      }))

      return registrarCompra({
        fecha: new Date(fecha).toISOString(),
        referencias: referencias || undefined,
        nota: nota || undefined,
        idProveedor: proveedor.id,
        idUsuario: usuario.id,
        pagado: Number(pagado) || 0,
        detalles,
      })
    },
    onSuccess: (compra) => {
      queryClient.invalidateQueries({ queryKey: ['compras', 'byProveedor', proveedor?.id] })
      queryClient.invalidateQueries({ queryKey: ['reportes', 'stockBajo'] })
      queryClient.invalidateQueries({ queryKey: ['articulos'] })
      // Sin esto, si después de esta compra se va a Ventas sin recargar la página, el
      // stock que se usa ahí para bloquear "Agregar" seguía siendo el de antes de comprar
      // (podía mostrar "Sin stock" en un artículo que esta misma compra acaba de reponer).
      queryClient.invalidateQueries({ queryKey: ['stock', 'todos'] })

      setAvisoExito(`Compra #${compra.id} registrada correctamente.`)
      if (compra.preciosSugeridos.length > 0) {
        setPreciosSugeridos(compra.preciosSugeridos)
        setPreciosAceptados(Object.fromEntries(compra.preciosSugeridos.map((p) => [p.idArticulo, true])))
      }
      if (compra.avisosSinMargen.length > 0) {
        setAvisosSinMargen(compra.avisosSinMargen)
      }
      resetearCompra()
    },
    onError: (err) => setErrorMutacion(getErrorMessage(err)),
  })

  const aplicarPreciosMutation = useMutation({
    mutationFn: async () => {
      const aceptados = (preciosSugeridos ?? []).filter((p) => preciosAceptados[p.idArticulo])
      await Promise.all(aceptados.map((p) => actualizarPrecioArticulo(p.idArticulo, p.precioSugerido)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articulos'] })
      setPreciosSugeridos(null)
      setPreciosAceptados({})
    },
    onError: (err) => setErrorPrecios(getErrorMessage(err)),
  })

  /**
   * Agrega el artículo a la compra. Si ya había un renglón de ese artículo SIN lote cargado
   * todavía y en el MISMO modo (paquete o suelto), suma una unidad ahí en vez de duplicar
   * (conveniente para escanear varias unidades seguidas de la misma partida). Pero si ese
   * renglón ya tiene un lote puesto, se crea uno nuevo aparte — así una misma compra puede
   * traer el mismo artículo en lotes distintos (con su propio vencimiento cada uno), típico
   * en farmacia.
   */
  function agregarOIncrementarLinea(articulo: Articulo, modo: ModoVentaCompra = 'caja') {
    const costoUnitario = modo === 'caja' ? articulo.costo : costoUnidadSueltaDe(articulo)
    setLineas((prev) => {
      const index = prev.findIndex((l) => l.articulo.id === articulo.id && !l.lote && l.modo === modo)
      if (index === -1) {
        return [...prev, { articulo, cantidad: 1, costoUnitario, lote: '', fechaVencimiento: '', modo }]
      }
      const copia = [...prev]
      copia[index] = { ...copia[index], cantidad: copia[index].cantidad + 1 }
      return copia
    })
  }

  function agregarLinea() {
    if (!articuloParaAgregar) return
    agregarOIncrementarLinea(articuloParaAgregar, modoParaAgregar)
    setArticuloParaAgregar(null)
    setModoParaAgregar('caja')
  }

  function handleScanKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const codigo = codigoEscaneado.trim()
    if (!codigo) return

    const encontrado = (articulosQuery.data ?? []).find(
      (a) => a.codigo.toLowerCase() === codigo.toLowerCase(),
    )
    if (encontrado) {
      // El código de barras está impreso en el paquete: escanear siempre carga "por
      // paquete" (que para un artículo sin fracción es lo mismo que cargar la unidad).
      agregarOIncrementarLinea(encontrado, 'caja')
      setErrorEscaneo(null)
    } else {
      setErrorEscaneo(`No se encontró ningún artículo con el código "${codigo}".`)
    }
    setCodigoEscaneado('')
  }

  function actualizarLinea(index: number, cambios: Partial<LineaCompra>) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)))
  }

  function quitarLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Nueva compra
      </Typography>

      {errorMutacion && <Alert severity="error">{errorMutacion}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' }, gap: 1.5 }}>
        <EntityAutocomplete
          label="Proveedor (nombre o NIT)"
          size="small"
          queryKey="proveedores-autocomplete-compras"
          searchFn={buscarProveedoresTexto}
          getLabel={(p: Proveedor) => p.nombre}
          getSecondaryLabel={(p: Proveedor) => p.nit ?? undefined}
          getId={(p: Proveedor) => p.id}
          value={proveedor}
          onChange={setProveedor}
        />
        <TextField
          label="Fecha"
          type="date"
          size="small"
          fullWidth
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="N° comprobante proveedor"
          size="small"
          fullWidth
          placeholder="Ej: Factura 00123"
          value={referencias}
          onChange={(e) => setReferencias(e.target.value)}
        />
        <TextField
          label="Pagado ahora"
          type="number"
          size="small"
          fullWidth
          disabled={contadoEfectivo}
          value={pagado}
          onChange={(e) => setPagado(e.target.value)}
          helperText={contadoEfectivo ? 'Se carga solo (contado)' : '0 = compra a crédito'}
        />
      </Box>

      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={contadoEfectivo}
            disabled={!permiteCompraACredito}
            onChange={(e) => {
              const checked = e.target.checked
              setContado(checked)
              if (!checked) setPagado('0')
            }}
          />
        }
        label={
          permiteCompraACredito
            ? 'Contado (carga el pagado automático)'
            : 'Contado (este negocio no compra a crédito)'
        }
      />

      <Divider />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 2fr auto' }, gap: 1.5, alignItems: 'flex-start' }}>
        <TextField
          inputRef={scanInputRef}
          label="Escanear código de barras"
          placeholder="Escaneá o escribí el código y Enter"
          size="small"
          fullWidth
          autoComplete="off"
          value={codigoEscaneado}
          onChange={(e) => setCodigoEscaneado(e.target.value)}
          onKeyDown={handleScanKeyDown}
          error={!!errorEscaneo}
          helperText={errorEscaneo ?? 'El lector agrega el artículo solo.'}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <BarcodeIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <EntityAutocomplete
          label="…o buscar por código o descripción"
          size="small"
          queryKey="articulos-autocomplete-compra"
          searchFn={buscarArticulos}
          getLabel={(a: Articulo) => `${a.codigo} — ${a.descripcion ?? ''}`}
          getSecondaryLabel={(a: Articulo) => {
            const ubicacion = obtenerUbicacion(a)
            return `Costo: ${money(a.costo)}${ubicacion ? ` · Ubicación: ${ubicacion}` : ''}`
          }}
          getId={(a: Articulo) => a.id}
          value={articuloParaAgregar}
          onChange={(a) => {
            setArticuloParaAgregar(a)
            setModoParaAgregar('caja')
          }}
        />
        <Button
          variant="outlined"
          color="success"
          size="small"
          onClick={agregarLinea}
          disabled={!articuloParaAgregar}
          sx={{ height: 40 }}
        >
          Agregar
        </Button>
      </Box>

      {/* Solo aparece para artículos que se compran por paquete (fracción > 1) — el resto de
          los negocios (ropa, ferretería, etc.) nunca ve este selector. */}
      {articuloParaAgregar && fraccionDe(articuloParaAgregar) > 1 && (
        <Box sx={{ maxWidth: 280 }}>
          <TextField
            select
            label="Comprar por"
            size="small"
            fullWidth
            value={modoParaAgregar}
            onChange={(e) => setModoParaAgregar(e.target.value as ModoVentaCompra)}
          >
            <MenuItem value="caja">Paquete (x{fraccionDe(articuloParaAgregar)} — {money(articuloParaAgregar.costo)})</MenuItem>
            <MenuItem value="unidad">Unidad suelta ({money(costoUnidadSueltaDe(articuloParaAgregar))})</MenuItem>
          </TextField>
        </Box>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Artículo</TableCell>
              {hayFraccionados && <TableCell>Comprado por</TableCell>}
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Costo unit.</TableCell>
              <TableCell>Lote</TableCell>
              <TableCell>Vencimiento</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {lineas.length === 0 && (
              <TableRow>
                <TableCell colSpan={hayFraccionados ? 8 : 7} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary" variant="body2">
                    Agregá artículos a la compra.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {lineas.map((linea, index) => (
              <TableRow key={index}>
                <TableCell>
                  {linea.articulo.codigo} — {linea.articulo.descripcion}
                </TableCell>
                {hayFraccionados && (
                  <TableCell>
                    {fraccionDe(linea.articulo) > 1 ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={linea.modo === 'caja' ? `Paquete (x${fraccionDe(linea.articulo)})` : 'Unidad suelta'}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                )}
                <TableCell align="right" sx={{ width: 100 }}>
                  <TextField
                    size="small"
                    type="number"
                    value={linea.cantidad}
                    onChange={(e) => actualizarLinea(index, { cantidad: Number(e.target.value) })}
                    slotProps={{ htmlInput: { min: 1, style: { textAlign: 'right' } } }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ width: 120 }}>
                  <TextField
                    size="small"
                    type="number"
                    value={linea.costoUnitario}
                    onChange={(e) => actualizarLinea(index, { costoUnitario: Number(e.target.value) })}
                    slotProps={{ htmlInput: { style: { textAlign: 'right' } } }}
                  />
                </TableCell>
                <TableCell sx={{ width: 110 }}>
                  <TextField
                    size="small"
                    value={linea.lote}
                    onChange={(e) => actualizarLinea(index, { lote: e.target.value })}
                  />
                </TableCell>
                <TableCell sx={{ width: 150 }}>
                  <TextField
                    size="small"
                    type="date"
                    value={linea.fechaVencimiento}
                    onChange={(e) => actualizarLinea(index, { fechaVencimiento: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </TableCell>
                <TableCell align="right">{money(linea.cantidad * linea.costoUnitario)}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="error" onClick={() => quitarLinea(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2, alignItems: 'end' }}>
        <TextField label="Nota" size="small" fullWidth multiline minRows={1} value={nota} onChange={(e) => setNota(e.target.value)} />
        <Stack spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'flex-end' } }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Total: {money(total)}
          </Typography>
          <Button
            variant="contained"
            size="large"
            disabled={registrarMutation.isPending || !proveedor || lineas.length === 0}
            onClick={() => registrarMutation.mutate()}
          >
            {registrarMutation.isPending ? 'Registrando…' : 'Registrar compra'}
          </Button>
        </Stack>
      </Box>

      <Snackbar
        open={!!avisoExito}
        autoHideDuration={4000}
        onClose={() => setAvisoExito(null)}
        message={avisoExito}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <Dialog
        open={!!preciosSugeridos}
        onClose={() => {
          setPreciosSugeridos(null)
          setPreciosAceptados({})
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Precios sugeridos por margen de ganancia</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>
            Estos artículos tienen un margen configurado y su costo cambió — así quedaría el
            precio de venta según ese margen. Desmarcá los que no quieras aplicar.
          </DialogContentText>
          {errorPrecios && <Alert severity="error">{errorPrecios}</Alert>}
          <Stack spacing={1}>
            {(preciosSugeridos ?? []).map((p) => (
              <Stack key={p.idArticulo} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Checkbox
                  size="small"
                  checked={preciosAceptados[p.idArticulo] ?? true}
                  onChange={(e) =>
                    setPreciosAceptados((prev) => ({ ...prev, [p.idArticulo]: e.target.checked }))
                  }
                />
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {p.codigo}
                </Typography>
                <Typography variant="body2">
                  {money(p.precioActual)} → <strong>{money(p.precioSugerido)}</strong>
                </Typography>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPreciosSugeridos(null)
              setPreciosAceptados({})
            }}
          >
            Rechazar todos
          </Button>
          <Button
            variant="contained"
            disabled={aplicarPreciosMutation.isPending}
            onClick={() => aplicarPreciosMutation.mutate()}
          >
            {aplicarPreciosMutation.isPending ? 'Aplicando…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!avisosSinMargen} onClose={() => setAvisosSinMargen(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Revisá el precio de venta</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>
            Estos artículos no tienen un margen de ganancia configurado y su costo subió — el
            sistema no puede recalcular el precio de venta solo, revisalo a mano.
          </DialogContentText>
          <Stack spacing={1}>
            {(avisosSinMargen ?? []).map((a) => (
              <Stack key={a.idArticulo} spacing={0}>
                <Typography variant="body2">
                  <strong>{a.codigo}</strong> — Precio de venta actual: {money(a.precioActual)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Costo: {money(a.costoAnterior)} → {money(a.costoNuevo)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setAvisosSinMargen(null)}>
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
