import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
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
import { SelectorVariantes } from '../components/SelectorVariantes'
import { CampoNumero } from '../components/CampoNumero'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { etiquetaArticulo, obtenerUbicacion } from '../utils/articulo'
import { imprimirNotaVenta } from '../utils/notaVenta'
import type { FormatoImpresion } from '../utils/notaVenta'
import { fraccionDe, precioUnidadSueltaDe } from '../utils/fraccion'
import type { ModoVentaCompra } from '../utils/fraccion'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import { buscarClientesTexto } from '../api/clientes'
import { articulosApi, buscarArticulos, getStockTodos } from '../api/articulos'
import { formasDePagoApi } from '../api/formasDePago'
import { registrarVenta } from '../api/ventas'
import { useAuth } from '../auth/AuthContext'
import { getErrorMessage } from '../api/errors'
import type { Cliente } from '../types/cliente'
import type { Articulo } from '../types/articulo'
import type { RegistrarDetalleVenta } from '../types/venta'

interface LineaVenta {
  articulo: Articulo
  cantidad: number
  precioUnitario: number
  /** Solo relevante si articulo.fraccion > 1 (se vende por paquete); si no, es indistinto. */
  modo: ModoVentaCompra
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Convierte lo cargado en un renglón (paquetes o unidades sueltas, según su modo) a unidades
 * reales — es lo que efectivamente se descuenta del stock y se manda al backend. */
function aUnidades(linea: LineaVenta): number {
  return linea.modo === 'caja' ? linea.cantidad * fraccionDe(linea.articulo) : linea.cantidad
}

/** Precio por unidad real (no por paquete) — el backend siempre trabaja en unidades. */
function precioPorUnidadDe(linea: LineaVenta): number {
  return linea.modo === 'caja' ? linea.precioUnitario / fraccionDe(linea.articulo) : linea.precioUnitario
}

export function VentasPage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()
  const {
    nombreNegocio,
    simboloMoneda,
    money,
    permiteVentaACredito,
    permiteCodigoCompartidoEntreArticulos,
    clientePorDefecto,
  } = useConfiguracionEmpresa()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [referencias, setReferencias] = useState('')
  const [nota, setNota] = useState('')
  const [pagado, setPagado] = useState('0')
  const [idFormaDePago, setIdFormaDePago] = useState<number | ''>('')
  // Recargo (%) por la forma de pago elegida (ej. Transferencia) — se sugiere solo desde el %
  // configurado en esa forma de pago, pero se puede ajustar acá para esta venta puntual.
  const [recargoPorcentaje, setRecargoPorcentaje] = useState(0)
  const [montoSaldoAFavor, setMontoSaldoAFavor] = useState('0')
  const [recibido, setRecibido] = useState('')
  const [contado, setContado] = useState(false)
  const [imprimirComprobante, setImprimirComprobante] = useState(true)
  const [formatoImpresion, setFormatoImpresion] = useState<FormatoImpresion>('ticket')
  const [lineas, setLineas] = useState<LineaVenta[]>([])
  const [articuloParaAgregar, setArticuloParaAgregar] = useState<Articulo | null>(null)
  const [modoParaAgregar, setModoParaAgregar] = useState<ModoVentaCompra>('caja')
  const [codigoEscaneado, setCodigoEscaneado] = useState('')
  const [errorEscaneo, setErrorEscaneo] = useState<string | null>(null)
  // Cuando el código escaneado tiene más de un artículo (mismo código, distinta talla/color —
  // ver ConfiguracionEmpresa.PermiteCodigoCompartidoEntreArticulos), se elige cuál es acá en vez
  // de agregarlo directo.
  const [variantesParaElegir, setVariantesParaElegir] = useState<Articulo[] | null>(null)
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null)
  const [avisoExito, setAvisoExito] = useState<string | null>(null)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const scanInputRef = useRef<HTMLInputElement>(null)

  // Solo para resolver código/descripción al agregar por escaneo; no es historial.
  const articulosQuery = useQuery({ queryKey: ['articulos'], queryFn: () => articulosApi.search() })

  const formasDePagoQuery = useQuery({ queryKey: ['formasDePago'], queryFn: () => formasDePagoApi.search() })
  const formaDePagoSeleccionada = (formasDePagoQuery.data ?? []).find((f) => f.id === idFormaDePago)

  // Stock de todo el catálogo, para poder mostrar "sin stock" y bloquear el agregado antes de
  // llegar a registrar la venta (el backend igual lo vuelve a validar al confirmar).
  const stockQuery = useQuery({ queryKey: ['stock', 'todos'], queryFn: getStockTodos })
  const stockPorArticulo = useMemo(
    () => new Map((stockQuery.data ?? []).map((s) => [s.idArticulo, s.stockActual])),
    [stockQuery.data],
  )

  /** Stock que queda libre para un artículo (en unidades), descontando lo que ya está en esta
   * venta en CUALQUIER renglón suyo —por paquete o suelto, ambos salen del mismo stock— (no lo
   * que ya se vendió antes: eso ya está descontado en el número que manda el backend).
   * Mientras el stock todavía no cargó, no bloquea nada (evita un parpadeo de "sin stock"). */
  function stockLibreUnidades(articulo: Articulo) {
    if (!stockQuery.data) return Infinity
    const stockTotal = stockPorArticulo.get(articulo.id) ?? 0
    const enCarritoUnidades = lineas
      .filter((l) => l.articulo.id === articulo.id)
      .reduce((acc, l) => acc + aUnidades(l), 0)
    return stockTotal - enCarritoUnidades
  }

  /** Igual que stockLibreUnidades, pero excluyendo el propio renglón (para saber cuánto más
   * se le puede cargar a ESE renglón sin pasarse, considerando los demás renglones del mismo
   * artículo que ya estén en el carrito). */
  function stockLibreParaLinea(index: number): number {
    if (!stockQuery.data) return Infinity
    const linea = lineas[index]
    const stockTotal = stockPorArticulo.get(linea.articulo.id) ?? 0
    const unidadesEnOtrasLineas = lineas
      .filter((l, i) => i !== index && l.articulo.id === linea.articulo.id)
      .reduce((acc, l) => acc + aUnidades(l), 0)
    const libreUnidades = stockTotal - unidadesEnOtrasLineas
    return linea.modo === 'caja' ? Math.floor(libreUnidades / fraccionDe(linea.articulo)) : libreUnidades
  }

  /** ¿Hay stock para agregar al menos 1 más de este artículo, en el modo elegido? */
  function hayStockParaAgregar(articulo: Articulo, modo: ModoVentaCompra) {
    const libreUnidades = stockLibreUnidades(articulo)
    const necesarias = modo === 'caja' ? fraccionDe(articulo) : 1
    return libreUnidades >= necesarias
  }

  const total = useMemo(() => lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0), [lineas])
  // Recargo aplicado sobre el total completo (no solo lo que se cobra ahora) — así la deuda
  // pendiente de una venta a crédito también queda con el recargo incluido.
  const totalConRecargo = total * (1 + recargoPorcentaje / 100)

  // La columna "Vendido por" solo se muestra si hay al menos un artículo que se vende por
  // paquete — el resto de los negocios (ropa, ferretería, etc.) nunca la ve.
  const hayFraccionados = useMemo(() => lineas.some((l) => fraccionDe(l.articulo) > 1), [lineas])

  // Tope de saldo a favor aplicable: no más de lo que tiene el cliente, ni más de lo que
  // hace falta pagar (no tiene sentido "sobre-aplicar" crédito a una venta más chica).
  const saldoAFavorMax = Math.min(cliente?.saldoAFavor ?? 0, totalConRecargo)

  // Si cambia el cliente o el total baja, el monto a aplicar nunca puede quedar por
  // encima de lo disponible.
  useEffect(() => {
    setMontoSaldoAFavor((prev) => (Number(prev) > saldoAFavorMax ? String(saldoAFavorMax) : prev))
  }, [saldoAFavorMax])

  // "Recibido" solo tiene sentido si hay plata en efectivo circulando en esta venta ahora
  // mismo — no si es puro crédito (Pagado = 0). No lo atamos al checkbox "Contado" porque
  // una venta a crédito puede igual cobrar una parte en efectivo ahora.
  const mostrarRecibido = (Number(pagado) || 0) > 0

  // Vuelto = lo que entrega el cliente en efectivo menos lo que efectivamente se cobra
  // ahora (Pagado). Es solo una ayuda para el cajero: no se manda al backend, la venta
  // se registra igual con el monto de "Pagado".
  const vuelto = useMemo(() => {
    if (!recibido.trim()) return null
    const r = Number(recibido)
    if (Number.isNaN(r)) return null
    return r - (Number(pagado) || 0)
  }, [recibido, pagado])

  // Si deja de haber pago en efectivo, no queda un "recibido" viejo escondido esperando
  // a reaparecer con un valor que ya no tiene relación con la venta actual.
  useEffect(() => {
    if (!mostrarRecibido && recibido) setRecibido('')
  }, [mostrarRecibido, recibido])

  // El lector de código de barras funciona como un teclado: "escribe" el código
  // y manda Enter solo. Enfocamos este campo al entrar y después de cada venta
  // para poder seguir escaneando sin tocar el mouse.
  useEffect(() => {
    const id = setTimeout(() => scanInputRef.current?.focus(), 100)
    return () => clearTimeout(id)
  }, [])

  // Si el negocio no vende a crédito (Configuración → Datos del negocio), la venta siempre se
  // comporta como al contado, sin importar el estado del checkbox (que además queda bloqueado).
  const contadoEfectivo = !permiteVentaACredito || contado

  // "Contado" carga el pagado = lo que resta del total después del saldo a favor aplicado
  // (y lo mantiene al día si cambia el total o el saldo aplicado). Con el checkbox
  // destildado el monto se escribe a mano, pero igual lo topamos a que nunca quede
  // pagando de más si sacás un artículo y el total baja de lo tipeado.
  const restaPorPagar = Math.max(0, totalConRecargo - (Number(montoSaldoAFavor) || 0))
  useEffect(() => {
    if (contadoEfectivo) {
      setPagado(String(restaPorPagar))
    } else {
      setPagado((prev) => (Number(prev) > restaPorPagar ? String(restaPorPagar) : prev))
    }
  }, [contadoEfectivo, restaPorPagar])

  // Cliente por defecto (Configuración → Datos del negocio): se precarga UNA sola vez, apenas
  // termina de llegar la configuración (para no perder tiempo cargando un cliente ocasional en
  // temporada alta). A propósito NO reacciona cada vez que "cliente" queda en null: si dependiera
  // de eso, cada vez que el cajero lo borrara a mano para buscar a otra persona, se lo volvería a
  // pisar solo antes de poder elegir el nuevo. El re-preseleccionado después de cada venta lo hace
  // resetearVenta() directamente, no este efecto.
  const clienteDefectoCargadoRef = useRef(false)
  useEffect(() => {
    if (!clienteDefectoCargadoRef.current && clientePorDefecto) {
      clienteDefectoCargadoRef.current = true
      setCliente((actual) => actual ?? clientePorDefecto)
    }
  }, [clientePorDefecto])

  function resetearVenta() {
    // "Contado" e "Imprimir comprobante" quedan como estaban: si el negocio vende
    // siempre al contado o nunca imprime, no tiene que volver a tildarlo cada venta.
    setCliente(clientePorDefecto)
    setFecha(hoyISO())
    setReferencias('')
    setNota('')
    setPagado('0')
    setIdFormaDePago('')
    setRecargoPorcentaje(0)
    setMontoSaldoAFavor('0')
    setRecibido('')
    setLineas([])
    setArticuloParaAgregar(null)
    setModoParaAgregar('caja')
    setCodigoEscaneado('')
    setErrorEscaneo(null)
    setErrorMutacion(null)
    setTimeout(() => scanInputRef.current?.focus(), 100)
  }

  /** "Cancelar venta": si no hay nada cargado todavía, resetea directo sin preguntar nada — no
   * hay nada que se pueda perder. Si ya hay artículos en el carrito, primero confirma (mismo
   * criterio que Devolución/Cambio al descartar un cambio cargado). */
  function cancelarVenta() {
    if (lineas.length === 0) {
      resetearVenta()
      return
    }
    setConfirmarCancelar(true)
  }

  function confirmarCancelarVenta() {
    resetearVenta()
    setConfirmarCancelar(false)
  }

  const registrarMutation = useMutation({
    mutationFn: () => {
      if (!cliente || !usuario) throw new Error('Falta seleccionar un cliente.')
      if (lineas.length === 0) throw new Error('Agregá al menos un artículo.')
      if (mostrarRecibido && !idFormaDePago) throw new Error('Elegí una forma de pago.')

      // El backend siempre trabaja en unidades: acá se convierte lo cargado (paquetes o
      // unidades sueltas, según el modo de cada renglón) antes de mandarlo.
      const detalles: RegistrarDetalleVenta[] = lineas.map((l) => ({
        idArticulo: l.articulo.id,
        cantidad: aUnidades(l),
        precioUnitario: precioPorUnidadDe(l),
      }))

      return registrarVenta({
        fecha: new Date(fecha).toISOString(),
        referencias: referencias || undefined,
        nota: nota || undefined,
        idCliente: cliente.id,
        idUsuario: usuario.id,
        pagado: Number(pagado) || 0,
        idFormaDePago: idFormaDePago || undefined,
        recargoPorcentaje: recargoPorcentaje || undefined,
        montoSaldoAFavorAplicado: Number(montoSaldoAFavor) || 0,
        detalles,
      })
    },
    onSuccess: (venta) => {
      queryClient.invalidateQueries({ queryKey: ['ventas', 'byCliente', cliente?.id] })
      queryClient.invalidateQueries({ queryKey: ['reportes', 'stockBajo'] })
      // Sin esto, el stock que se usa para bloquear "Agregar" quedaba con la foto de
      // cuando se entró a la pantalla: después de vender la última unidad, el sistema
      // igual dejaba agregarla de nuevo al carrito (recién se enteraba del error al
      // confirmar, porque el backend sí revalida). Se refresca acá para que se entere al toque.
      queryClient.invalidateQueries({ queryKey: ['stock', 'todos'] })

      if (imprimirComprobante) {
        imprimirNotaVenta({
          nombreNegocio,
          simboloMoneda,
          id: venta.id,
          // fechaRegistro tiene la hora real de cuando se guardó la venta; "fecha" es solo la
          // fecha "de negocio" (sin hora) que se puede elegir a mano en el formulario — para
          // el comprobante importa la hora real, no esa.
          fecha: venta.fechaRegistro ?? venta.fecha,
          cliente: cliente!.nombre,
          documentoCliente: cliente!.documentoIdentidad,
          vendedor: usuario!.nombre,
          referencia: referencias || undefined,
          nota: nota || undefined,
          items: lineas.map((l) => ({
            codigo: l.articulo.codigo,
            descripcion:
              l.modo === 'caja' && fraccionDe(l.articulo) > 1
                ? `${l.articulo.descripcion ?? ''} (paquete x${fraccionDe(l.articulo)})`
                : l.articulo.descripcion,
            cantidad: l.cantidad,
            precioUnitario: l.precioUnitario,
            subtotal: l.cantidad * l.precioUnitario,
          })),
          total: venta.total,
          pagado: venta.pagado,
          porPagar: venta.porPagar,
        }, formatoImpresion)
      }

      setAvisoExito(`Venta #${venta.id} registrada correctamente.`)
      resetearVenta()
    },
    onError: (err) => setErrorMutacion(getErrorMessage(err)),
  })

  /** Agrega el artículo a la venta; si ya había un renglón de ese artículo en el MISMO modo
   * (paquete o suelto), suma una unidad ahí en vez de duplicar el renglón. */
  function agregarOIncrementarLinea(articulo: Articulo, modo: ModoVentaCompra = 'caja') {
    const precioUnitario = modo === 'caja' ? articulo.precio : precioUnidadSueltaDe(articulo)
    setLineas((prev) => {
      const index = prev.findIndex((l) => l.articulo.id === articulo.id && l.modo === modo)
      if (index === -1) return [...prev, { articulo, cantidad: 1, precioUnitario, modo }]
      const copia = [...prev]
      copia[index] = { ...copia[index], cantidad: copia[index].cantidad + 1 }
      return copia
    })
  }

  function agregarLinea() {
    if (!articuloParaAgregar || !hayStockParaAgregar(articuloParaAgregar, modoParaAgregar)) return
    agregarOIncrementarLinea(articuloParaAgregar, modoParaAgregar)
    setArticuloParaAgregar(null)
    setModoParaAgregar('caja')
  }

  /** Agrega el artículo escaneado/elegido a la venta, o muestra el error de siempre si no hay
   * stock — el mismo chequeo se use como se llegue a este artículo (match único o elegido del
   * selector de variantes). */
  function agregarSiHayStock(articulo: Articulo) {
    if (!hayStockParaAgregar(articulo, 'caja')) {
      setErrorEscaneo(`"${articulo.codigo}" no tiene stock disponible.`)
    } else {
      // El código de barras está impreso en el paquete: escanear siempre vende "por paquete"
      // (que para un artículo sin fracción es lo mismo que vender la unidad).
      agregarOIncrementarLinea(articulo, 'caja')
      setErrorEscaneo(null)
    }
  }

  function elegirVariante(articulo: Articulo) {
    agregarSiHayStock(articulo)
    setVariantesParaElegir(null)
  }

  function handleScanKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Selector de variantes abierto: 1-9 elige directo sin escribir nada en el cuadro (el foco
    // nunca se mueve, así se sigue escaneando sin tocar el mouse). Cualquier otra tecla que no
    // sea Enter/Escape se ignora mientras está abierto.
    if (variantesParaElegir) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setVariantesParaElegir(null)
        return
      }
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault()
        const elegida = variantesParaElegir[Number(e.key) - 1]
        if (elegida) elegirVariante(elegida)
        return
      }
      if (e.key !== 'Enter') return
    }

    if (e.key !== 'Enter') return
    e.preventDefault()
    const codigo = codigoEscaneado.trim()
    if (!codigo) return

    setVariantesParaElegir(null)
    const coincidencias = (articulosQuery.data ?? []).filter(
      (a) => a.codigo.toLowerCase() === codigo.toLowerCase(),
    )
    if (coincidencias.length === 0) {
      setErrorEscaneo(`No se encontró ningún artículo con el código "${codigo}".`)
    } else if (coincidencias.length === 1) {
      agregarSiHayStock(coincidencias[0])
    } else {
      // Mismo código, varias variantes (talla/color) — se elige acá en vez de agregar directo.
      setVariantesParaElegir(coincidencias)
      setErrorEscaneo(null)
    }
    setCodigoEscaneado('')
  }

  function actualizarLinea(index: number, cambios: Partial<LineaVenta>) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...cambios } : l)))
  }

  function quitarLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Nueva venta
      </Typography>

      {errorMutacion && <Alert severity="error">{errorMutacion}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: !mostrarRecibido
              ? '2fr 1fr 1fr 1fr'
              : formaDePagoSeleccionada?.porcentajeRecargo
                ? '2fr 1fr 1fr 1fr 1fr 1fr'
                : '2fr 1fr 1fr 1fr 1fr',
          },
          gap: 1.5,
        }}
      >
        <EntityAutocomplete
          label="Cliente (nombre o documento)"
          size="small"
          queryKey="clientes-autocomplete-ventas"
          searchFn={buscarClientesTexto}
          getLabel={(c: Cliente) => c.nombre}
          getSecondaryLabel={(c: Cliente) => c.documentoIdentidad}
          getId={(c: Cliente) => c.id}
          value={cliente}
          onChange={setCliente}
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
          label="Referencia"
          size="small"
          fullWidth
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
          helperText={contadoEfectivo ? 'Se carga solo (contado)' : '0 = venta a crédito'}
        />
        {mostrarRecibido && (
          <TextField
            select
            required
            label="Forma de pago"
            size="small"
            fullWidth
            value={idFormaDePago}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : ''
              setIdFormaDePago(id)
              const forma = (formasDePagoQuery.data ?? []).find((f) => f.id === id)
              setRecargoPorcentaje(forma?.porcentajeRecargo ?? 0)
            }}
            error={!idFormaDePago}
            helperText={!idFormaDePago ? 'Elegí cómo se cobra' : undefined}
          >
            {(formasDePagoQuery.data ?? []).map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.nombre}
              </MenuItem>
            ))}
          </TextField>
        )}
        {/* Solo con formas de pago que tienen % de recargo configurado (no es exclusivo de
            Transferencia — cualquiera que lo tenga cargado en Configuración → Formas de pago). */}
        {mostrarRecibido && !!formaDePagoSeleccionada?.porcentajeRecargo && (
          <CampoNumero
            label="% de recargo"
            size="small"
            fullWidth
            value={recargoPorcentaje}
            onChange={setRecargoPorcentaje}
            helperText={`+${money(totalConRecargo - total)} (a ${money(totalConRecargo)})`}
          />
        )}
      </Box>

      {cliente && cliente.saldoAFavor > 0 && (
        <Alert severity="info" sx={{ alignItems: 'center' }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Este cliente tiene {money(cliente.saldoAFavor)} de saldo a favor.</span>
            <TextField
              label="Aplicar a esta venta"
              type="number"
              size="small"
              value={montoSaldoAFavor}
              onChange={(e) => setMontoSaldoAFavor(e.target.value)}
              slotProps={{ htmlInput: { min: 0, max: saldoAFavorMax } }}
              sx={{ width: 180 }}
            />
          </Stack>
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={contadoEfectivo}
              disabled={!permiteVentaACredito}
              onChange={(e) => {
                const checked = e.target.checked
                setContado(checked)
                // Al destildar, vuelve a 0: si no es contado, es fiado/parcial y hay
                // que tipear a mano cuánto paga, no dejar pegado el monto de contado.
                if (!checked) setPagado('0')
              }}
            />
          }
          label={
            permiteVentaACredito
              ? 'Contado (carga el pagado automático)'
              : 'Contado (este negocio no vende a crédito)'
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={imprimirComprobante}
              onChange={(e) => setImprimirComprobante(e.target.checked)}
            />
          }
          label="Imprimir comprobante al guardar"
        />
        {imprimirComprobante && (
          <TextField
            select
            size="small"
            label="Formato"
            value={formatoImpresion}
            onChange={(e) => setFormatoImpresion(e.target.value as FormatoImpresion)}
            sx={{ width: 200 }}
          >
            <MenuItem value="ticket">Ticket angosto (térmica)</MenuItem>
            <MenuItem value="hoja">Hoja completa (A4/Carta)</MenuItem>
          </TextField>
        )}
        {mostrarRecibido && (
          // Agrupados en su propio Stack (no dos hijos sueltos del Stack de afuera) para que
          // viajen siempre juntos: si no entran en la fila y el "wrap" los manda a la línea de
          // abajo, bajan LOS DOS juntos — nunca se separan entre sí.
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              label="Recibido"
              type="number"
              size="small"
              value={recibido}
              onChange={(e) => setRecibido(e.target.value)}
              error={vuelto !== null && vuelto < 0}
              sx={{ width: 150 }}
              placeholder="Con cuánto paga"
              // Sin texto de ayuda: "Opcional: con cuánto paga el cliente" ocupaba 2 líneas y
              // desalineaba esta fila con los checkboxes. El Vuelto/Falta se muestra al lado.
            />
            {vuelto !== null && (
              <Typography variant="body1" sx={{ fontWeight: 700 }} color={vuelto >= 0 ? 'success.main' : 'error.main'}>
                {vuelto >= 0 ? `Vuelto: ${money(vuelto)}` : `Falta ${money(-vuelto)}`}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>

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
          queryKey="articulos-autocomplete-venta"
          searchFn={buscarArticulos}
          getLabel={(a: Articulo) => etiquetaArticulo(a, permiteCodigoCompartidoEntreArticulos)}
          getSecondaryLabel={(a: Articulo) => {
            const ubicacion = obtenerUbicacion(a)
            const stock = stockPorArticulo.get(a.id) ?? 0
            const textoStock = !stockQuery.data ? '' : ` · ${stock > 0 ? `Stock: ${stock}` : 'Sin stock'}`
            return `Precio: ${money(a.precio)}${ubicacion ? ` · Ubicación: ${ubicacion}` : ''}${textoStock}`
          }}
          getId={(a: Articulo) => a.id}
          value={articuloParaAgregar}
          onChange={(a) => {
            setArticuloParaAgregar(a)
            setModoParaAgregar('caja')
            setErrorEscaneo(null)
          }}
        />
        <Button
          variant="outlined"
          color="success"
          size="small"
          onClick={agregarLinea}
          disabled={!articuloParaAgregar || !hayStockParaAgregar(articuloParaAgregar, modoParaAgregar)}
          sx={{ height: 40 }}
        >
          Agregar
        </Button>
      </Box>

      {/* Aparece cuando el código escaneado tiene varias variantes (mismo código, distinta
          talla/color). Apretar el número (o clickear) agrega esa variante — no es un Dialog a
          propósito, para no interrumpir el flujo de escaneo con un modal. */}
      {variantesParaElegir && (
        <SelectorVariantes
          variantes={variantesParaElegir}
          stockPorArticulo={stockPorArticulo}
          onElegir={elegirVariante}
          onCerrar={() => setVariantesParaElegir(null)}
        />
      )}

      {/* Solo aparece para artículos que se venden por paquete (fracción > 1) — el resto de los
          negocios (ropa, ferretería, etc.) nunca ve este selector. */}
      {articuloParaAgregar && fraccionDe(articuloParaAgregar) > 1 && (() => {
        const fraccion = fraccionDe(articuloParaAgregar)
        const libreUnidades = stockQuery.data ? stockLibreUnidades(articuloParaAgregar) : null
        const cajasCompletas = libreUnidades === null ? null : Math.floor(libreUnidades / fraccion)
        return (
          <Box sx={{ maxWidth: 320 }}>
            <TextField
              select
              label="Vender por"
              size="small"
              fullWidth
              value={modoParaAgregar}
              onChange={(e) => setModoParaAgregar(e.target.value as ModoVentaCompra)}
            >
              <MenuItem value="caja" disabled={cajasCompletas !== null && cajasCompletas <= 0}>
                Paquete (x{fraccion} — {money(articuloParaAgregar.precio)})
                {cajasCompletas !== null ? ` · quedan ${cajasCompletas}` : ''}
              </MenuItem>
              <MenuItem value="unidad" disabled={libreUnidades !== null && libreUnidades <= 0}>
                Unidad suelta ({money(precioUnidadSueltaDe(articuloParaAgregar))})
                {libreUnidades !== null ? ` · quedan ${libreUnidades} sueltas` : ''}
              </MenuItem>
            </TextField>
          </Box>
        )
      })()}

      {articuloParaAgregar && !hayStockParaAgregar(articuloParaAgregar, modoParaAgregar) && (() => {
        const otroModo = modoParaAgregar === 'caja' ? 'unidad' : 'caja'
        const hayEnElOtroModo = fraccionDe(articuloParaAgregar) > 1 && hayStockParaAgregar(articuloParaAgregar, otroModo)
        // Si tampoco hay stock en el otro modo, no tiene sentido decir "no hay POR PAQUETE"
        // (suena a que suelto sí podría haber) — directamente no hay stock del artículo.
        return (
          <Alert severity="warning">
            "{articuloParaAgregar.codigo}" no tiene stock disponible
            {hayEnElOtroModo && ` ${modoParaAgregar === 'caja' ? 'por paquete' : 'suelto'} — probá vendiendo ${otroModo === 'caja' ? 'por paquete' : 'suelto'}`}
            .
          </Alert>
        )
      })()}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Artículo</TableCell>
              <TableCell>Ubicación</TableCell>
              {hayFraccionados && <TableCell>Vendido por</TableCell>}
              <TableCell align="right">Queda</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Precio unit.</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {lineas.length === 0 && (
              <TableRow>
                <TableCell colSpan={hayFraccionados ? 8 : 7} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary" variant="body2">
                    Agregá artículos a la venta.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {lineas.map((linea, index) => {
              const quedaUnidades = (stockPorArticulo.get(linea.articulo.id) ?? 0) - lineas
                .filter((l) => l.articulo.id === linea.articulo.id)
                .reduce((acc, l) => acc + aUnidades(l), 0)
              // stockLibreParaLinea ya excluye el propio uso actual de este renglón (lo trata
              // como si estuviera en 0), así que YA es el tope absoluto para su cantidad.
              const maxParaEsteRenglon = stockLibreParaLinea(index)
              return (
                <TableRow key={index}>
                  <TableCell>
                    {etiquetaArticulo(linea.articulo, permiteCodigoCompartidoEntreArticulos)}
                  </TableCell>
                  <TableCell>{obtenerUbicacion(linea.articulo) ?? '—'}</TableCell>
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
                  <TableCell align="right">
                    {stockQuery.data && (
                      <Typography variant="body2" color={quedaUnidades > 0 ? 'text.secondary' : 'warning.main'}>
                        {quedaUnidades}
                        {linea.articulo.unidadMedida ? ` ${linea.articulo.unidadMedida}` : ''}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ width: 110 }}>
                    <CampoNumero
                      size="small"
                      value={linea.cantidad}
                      valorVacio={1}
                      onChange={(valor) => {
                        // Nunca por encima del stock del artículo (convertido a la unidad de
                        // este renglón: paquetes o sueltas) — igual que antes, ahora en unidades reales.
                        const tope = stockQuery.data ? maxParaEsteRenglon : Infinity
                        actualizarLinea(index, { cantidad: Math.max(1, Math.min(valor, tope)) })
                      }}
                      slotProps={{
                        htmlInput: {
                          min: 1,
                          max: stockQuery.data ? maxParaEsteRenglon : undefined,
                          style: { textAlign: 'right' },
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ width: 130 }}>
                    <CampoNumero
                      size="small"
                      value={linea.precioUnitario}
                      onChange={(precioUnitario) => actualizarLinea(index, { precioUnitario })}
                      slotProps={{ htmlInput: { style: { textAlign: 'right' } } }}
                    />
                  </TableCell>
                  <TableCell align="right">{money(linea.cantidad * linea.precioUnitario)}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => quitarLinea(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2, alignItems: 'end' }}>
        <TextField label="Nota" size="small" fullWidth multiline minRows={1} value={nota} onChange={(e) => setNota(e.target.value)} />
        <Stack spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'flex-end' } }}>
          {recargoPorcentaje > 0 && (
            <Typography variant="caption" color="text.secondary">
              Subtotal: {money(total)} + {recargoPorcentaje}% recargo
            </Typography>
          )}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Total: {money(totalConRecargo)}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="large"
              disabled={registrarMutation.isPending}
              onClick={cancelarVenta}
            >
              Cancelar venta
            </Button>
            <Button
              variant="contained"
              size="large"
              disabled={registrarMutation.isPending || !cliente || lineas.length === 0 || (mostrarRecibido && !idFormaDePago)}
              onClick={() => registrarMutation.mutate()}
            >
              {registrarMutation.isPending ? 'Registrando…' : 'Registrar venta'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <ConfirmDialog
        open={confirmarCancelar}
        titulo="Cancelar venta"
        mensaje={`Tenés ${lineas.length} artículo(s) cargado(s) en el carrito. Si cancelás, se pierden y no queda ningún registro. ¿Seguro?`}
        confirmarLabel="Sí, cancelar"
        cancelarLabel="Seguir cargando"
        onConfirmar={confirmarCancelarVenta}
        onCancelar={() => setConfirmarCancelar(false)}
      />

      <Snackbar
        open={!!avisoExito}
        autoHideDuration={4000}
        onClose={() => setAvisoExito(null)}
        message={avisoExito}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  )
}
