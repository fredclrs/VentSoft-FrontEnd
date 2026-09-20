import { Fragment, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
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
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import EditIcon from '@mui/icons-material/EditOutlined'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'
import BarcodeIcon from '@mui/icons-material/BarcodeReader'
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import { articulosApi } from '../api/articulos'
import { familiasApi } from '../api/familias'
import { promocionesApi } from '../api/promociones'
import { caracteristicasApi } from '../api/caracteristicas'
import { getErrorMessage } from '../api/errors'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorDialog } from '../components/ErrorDialog'
import { CampoNumero } from '../components/CampoNumero'
import { imprimirEtiquetaArticulo } from '../utils/barcode'
import { obtenerUbicacion, resumenVariante } from '../utils/articulo'
import { stickyActionsSx } from '../utils/tableStyles'
import { useIsMobile } from '../hooks/useIsMobile'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import type { Articulo, ArticuloCaracteristica, ArticuloFormValues } from '../types/articulo'

const ARTICULOS_QUERY_KEY = ['articulos'] as const

const ARTICULO_VACIO: ArticuloFormValues = {
  codigo: '',
  descripcion: '',
  tamano: '',
  unidadMedida: '',
  fraccion: 1,
  precio: 0,
  costo: 0,
  precioUnidadSuelta: undefined,
  margenGanancia: undefined,
  stockMinimo: undefined,
  stockIdeal: undefined,
  imagen: '',
  idFamilia: 0,
  idPromocion: undefined,
  caracteristicas: [],
}

/** Una fila de la tabla de variantes en "Nuevo producto (variantes)". Sin campos fijos de
 * "Talla"/"Color": son Características libres (igual que en el alta normal de un artículo), una
 * o varias por fila — el "Tamaño" que exige la base se arma solo uniendo sus valores (ver
 * tamanoDeFila). Costo/Precio son "override": null significa que esa fila todavía usa el valor
 * de arriba (el default del producto) — así cambiar el default de arriba actualiza todas las
 * filas que no se tocaron a mano, y las que sí se tocaron (ej. la talla más grande, que cuesta
 * un poco más) quedan con su propio valor sin que las demás se vean afectadas. */
interface FilaVariante {
  caracteristicas: ArticuloCaracteristica[]
  costoOverride: number | null
  precioOverride: number | null
}

const FILA_VARIANTE_VACIA: FilaVariante = { caracteristicas: [], costoOverride: null, precioOverride: null }

/** Un grupo en el listado: todos los Artículos que comparten Código + Descripción + Familia —
 * o sea, todas las variantes (talla/color) de una misma prenda. Con
 * PermiteCodigoCompartidoEntreArticulos apagado cada artículo es su propio grupo de 1 (el
 * listado se ve exactamente como antes). */
interface GrupoArticulos {
  clave: string
  codigo: string
  descripcion: string
  idFamilia: number
  articulos: Articulo[]
}

function rangoTexto(valores: number[], formatear: (n: number) => string): string {
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  return min === max ? formatear(min) : `${formatear(min)} – ${formatear(max)}`
}

/** Precio de venta sugerido por margen de ganancia, calculado sobre el PRECIO DE VENTA
 * (Costo / (1 - Margen/100)) — es la convención de indumentaria: un margen de 40% significa que
 * el costo es el 60% del precio final, no que el precio es el costo + 40%. Redondeo según la
 * configuración del negocio: a 2 decimales normalmente, o al entero de ARRIBA (nunca abajo, para
 * no perder margen) si el negocio no maneja centavos — mismo criterio que usa el backend al
 * recalcular el precio sugerido después de una Compra. */
function calcularPrecioPorMargen(costo: number, margen: number, redondearEnteros: boolean): number {
  const precio = costo / (1 - margen / 100)
  return redondearEnteros ? Math.ceil(precio) : Math.round(precio * 100) / 100
}

export function ArticulosPage() {
  const isMobile = useIsMobile()
  const { money, simboloMoneda, redondearPreciosEnteros, permiteCodigoCompartidoEntreArticulos } =
    useConfiguracionEmpresa()
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [articuloEnEdicion, setArticuloEnEdicion] = useState<Articulo | null>(null)
  const [esDuplicado, setEsDuplicado] = useState(false)
  const [form, setForm] = useState<ArticuloFormValues>(ARTICULO_VACIO)
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null)
  const [articuloAEliminar, setArticuloAEliminar] = useState<Articulo | null>(null)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [articuloParaEtiqueta, setArticuloParaEtiqueta] = useState<Articulo | null>(null)
  const [cantidadEtiquetas, setCantidadEtiquetas] = useState('1')

  // "Nuevo producto (variantes)" — solo visible con el código compartido activado (ver
  // ConfiguracionEmpresa.PermiteCodigoCompartidoEntreArticulos): carga un producto (código,
  // familia, costo/precio) una sola vez y una tabla de variantes (talla + color opcional), y al
  // guardar crea un Artículo por fila, todos con el mismo código. Sin cantidad: el stock se carga
  // después por Compras o Ajuste de stock, como cualquier artículo nuevo.
  const [dialogVariantesAbierto, setDialogVariantesAbierto] = useState(false)
  const [baseVariantes, setBaseVariantes] = useState({
    codigo: '',
    descripcion: '',
    idFamilia: 0,
    costo: 0,
    precio: 0,
    margenGanancia: undefined as number | undefined,
    stockMinimo: undefined as number | undefined,
    stockIdeal: undefined as number | undefined,
  })
  const [filasVariantes, setFilasVariantes] = useState<FilaVariante[]>([FILA_VARIANTE_VACIA])
  const [errorVariantes, setErrorVariantes] = useState<string | null>(null)
  // Si no es null, el diálogo de arriba está agregando variante(s) a un grupo YA existente
  // (Código/Descripción/Familia vienen fijos, no se pueden tocar acá) en vez de armar un
  // producto nuevo desde cero.
  const [grupoOrigen, setGrupoOrigen] = useState<GrupoArticulos | null>(null)

  // Agrupa el listado por Código + Descripción + Familia — todas las variantes de una misma
  // prenda quedan juntas bajo un desplegable. Con el flag apagado no tiene sentido (cada
  // artículo ya es único por código), así que ahí queda deshabilitado.
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({})
  const [grupoEnEdicion, setGrupoEnEdicion] = useState<GrupoArticulos | null>(null)
  const [formGrupo, setFormGrupo] = useState({
    descripcion: '',
    idFamilia: 0,
    stockMinimo: undefined as number | undefined,
    stockIdeal: undefined as number | undefined,
  })
  const [errorGrupo, setErrorGrupo] = useState<string | null>(null)
  const [grupoAEliminar, setGrupoAEliminar] = useState<GrupoArticulos | null>(null)
  const [errorEliminarGrupo, setErrorEliminarGrupo] = useState<string | null>(null)

  const articulosQuery = useQuery({ queryKey: ARTICULOS_QUERY_KEY, queryFn: () => articulosApi.search() })
  const familiasQuery = useQuery({ queryKey: ['familias'], queryFn: () => familiasApi.search() })
  const promocionesQuery = useQuery({ queryKey: ['promociones'], queryFn: () => promocionesApi.search() })
  const caracteristicasQuery = useQuery({ queryKey: ['caracteristicas'], queryFn: () => caracteristicasApi.search() })

  const familiaPorId = useMemo(
    () => new Map((familiasQuery.data ?? []).map((f) => [f.id, f.nombreFamilia])),
    [familiasQuery.data],
  )

  const filtrados = useMemo(() => {
    const data = articulosQuery.data ?? []
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return data
    return data.filter(
      (a) => a.codigo.toLowerCase().includes(texto) || (a.descripcion ?? '').toLowerCase().includes(texto),
    )
  }, [articulosQuery.data, busqueda])

  const grupos = useMemo<GrupoArticulos[]>(() => {
    if (!permiteCodigoCompartidoEntreArticulos) {
      // Sin el flag, cada artículo es su propio grupo — el listado se comporta exactamente
      // como antes (ver renderizado más abajo, que no muestra desplegable en ese caso).
      return filtrados.map((a) => ({
        clave: String(a.id),
        codigo: a.codigo,
        descripcion: a.descripcion ?? '',
        idFamilia: a.idFamilia,
        articulos: [a],
      }))
    }
    const mapa = new Map<string, GrupoArticulos>()
    for (const a of filtrados) {
      const clave = `${a.codigo}||${(a.descripcion ?? '').trim().toLowerCase()}||${a.idFamilia}`
      const existente = mapa.get(clave)
      if (existente) existente.articulos.push(a)
      else mapa.set(clave, { clave, codigo: a.codigo, descripcion: a.descripcion ?? '', idFamilia: a.idFamilia, articulos: [a] })
    }
    return Array.from(mapa.values())
  }, [filtrados, permiteCodigoCompartidoEntreArticulos])

  function alternarGrupo(clave: string) {
    setGruposExpandidos((prev) => ({ ...prev, [clave]: !(prev[clave] ?? !!busqueda.trim()) }))
  }

  const guardarMutation = useMutation({
    mutationFn: () =>
      articuloEnEdicion ? articulosApi.update(articuloEnEdicion.id, form) : articulosApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARTICULOS_QUERY_KEY })
      cerrarDialog()
    },
    onError: (err) => setErrorMutacion(getErrorMessage(err)),
  })

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => articulosApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARTICULOS_QUERY_KEY })
      setArticuloAEliminar(null)
    },
    onError: (err) => setErrorEliminar(getErrorMessage(err)),
  })

  function abrirNuevo() {
    setArticuloEnEdicion(null)
    setEsDuplicado(false)
    setForm(ARTICULO_VACIO)
    setErrorMutacion(null)
    setDialogAbierto(true)
  }

  function abrirEdicion(articulo: Articulo) {
    setArticuloEnEdicion(articulo)
    setEsDuplicado(false)
    setForm({
      codigo: articulo.codigo,
      descripcion: articulo.descripcion ?? '',
      tamano: articulo.tamano,
      unidadMedida: articulo.unidadMedida ?? '',
      fraccion: articulo.fraccion,
      precio: articulo.precio,
      costo: articulo.costo,
      precioUnidadSuelta: articulo.precioUnidadSuelta ?? undefined,
      margenGanancia: articulo.margenGanancia ?? undefined,
      stockMinimo: articulo.stockMinimo ?? undefined,
      stockIdeal: articulo.stockIdeal ?? undefined,
      imagen: articulo.imagen ?? '',
      idFamilia: articulo.idFamilia,
      idPromocion: articulo.idPromocion ?? undefined,
      caracteristicas: articulo.caracteristicas,
    })
    setErrorMutacion(null)
    setDialogAbierto(true)
  }

  /** Precarga el alta con los datos de un artículo existente (marca, familia, precio, etc.) para
   * no volver a tipear todo cuando lo único que cambia es la variante (talla/color u otra). Código
   * y tamaño quedan vacíos porque son justo lo que hay que cambiar. */
  function abrirDuplicado(articulo: Articulo) {
    setArticuloEnEdicion(null)
    setEsDuplicado(true)
    setForm({
      codigo: '',
      descripcion: articulo.descripcion ?? '',
      tamano: '',
      unidadMedida: articulo.unidadMedida ?? '',
      fraccion: articulo.fraccion,
      precio: articulo.precio,
      costo: articulo.costo,
      precioUnidadSuelta: articulo.precioUnidadSuelta ?? undefined,
      margenGanancia: articulo.margenGanancia ?? undefined,
      stockMinimo: articulo.stockMinimo ?? undefined,
      stockIdeal: articulo.stockIdeal ?? undefined,
      imagen: articulo.imagen ?? '',
      idFamilia: articulo.idFamilia,
      idPromocion: articulo.idPromocion ?? undefined,
      caracteristicas: articulo.caracteristicas.map((c) => ({ ...c, id: 0, valor: '' })),
    })
    setErrorMutacion(null)
    setDialogAbierto(true)
  }

  function cerrarDialog() {
    setDialogAbierto(false)
  }

  function actualizarCampo<K extends keyof ArticuloFormValues>(campo: K, valor: ArticuloFormValues[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function agregarCaracteristica() {
    const primera = caracteristicasQuery.data?.[0]
    if (!primera) return
    const nueva: ArticuloCaracteristica = {
      id: 0,
      idCaracteristica: primera.id,
      nombreCaracteristica: primera.nombreCaracteristica,
      valor: '',
    }
    actualizarCampo('caracteristicas', [...form.caracteristicas, nueva])
  }

  function actualizarCaracteristica(index: number, cambios: Partial<ArticuloCaracteristica>) {
    const copia = [...form.caracteristicas]
    copia[index] = { ...copia[index], ...cambios }
    actualizarCampo('caracteristicas', copia)
  }

  function quitarCaracteristica(index: number) {
    actualizarCampo(
      'caracteristicas',
      form.caracteristicas.filter((_, i) => i !== index),
    )
  }

  function abrirNuevoConVariantes() {
    setGrupoOrigen(null)
    setBaseVariantes({
      codigo: '',
      descripcion: '',
      idFamilia: 0,
      costo: 0,
      precio: 0,
      margenGanancia: undefined,
      stockMinimo: undefined,
      stockIdeal: undefined,
    })
    setFilasVariantes([FILA_VARIANTE_VACIA])
    setErrorVariantes(null)
    setDialogVariantesAbierto(true)
  }

  /** Suma una o más variantes (talla/color) a un grupo que ya existe — Código, Descripción y
   * Familia quedan fijos (son los del grupo), solo se completa lo que cambia. */
  function abrirAgregarVariante(grupo: GrupoArticulos) {
    const base = grupo.articulos[0]
    setGrupoOrigen(grupo)
    setBaseVariantes({
      codigo: grupo.codigo,
      descripcion: grupo.descripcion,
      idFamilia: grupo.idFamilia,
      costo: base.costo,
      precio: base.precio,
      margenGanancia: base.margenGanancia ?? undefined,
      stockMinimo: base.stockMinimo ?? undefined,
      stockIdeal: base.stockIdeal ?? undefined,
    })
    setFilasVariantes([FILA_VARIANTE_VACIA])
    setErrorVariantes(null)
    setDialogVariantesAbierto(true)
  }

  function abrirEditarGrupo(grupo: GrupoArticulos) {
    const base = grupo.articulos[0]
    setGrupoEnEdicion(grupo)
    setFormGrupo({
      descripcion: grupo.descripcion,
      idFamilia: grupo.idFamilia,
      stockMinimo: base.stockMinimo ?? undefined,
      stockIdeal: base.stockIdeal ?? undefined,
    })
    setErrorGrupo(null)
  }

  function cerrarEditarGrupo() {
    setGrupoEnEdicion(null)
  }

  const editarGrupoMutation = useMutation({
    mutationFn: async () => {
      if (!grupoEnEdicion) return
      const resultados = await Promise.allSettled(
        grupoEnEdicion.articulos.map((a) =>
          articulosApi.update(a.id, {
            codigo: a.codigo,
            descripcion: formGrupo.descripcion,
            tamano: a.tamano,
            unidadMedida: a.unidadMedida ?? '',
            fraccion: a.fraccion,
            precio: a.precio,
            costo: a.costo,
            precioUnidadSuelta: a.precioUnidadSuelta ?? undefined,
            margenGanancia: a.margenGanancia ?? undefined,
            stockMinimo: formGrupo.stockMinimo,
            stockIdeal: formGrupo.stockIdeal,
            imagen: a.imagen ?? '',
            idFamilia: formGrupo.idFamilia,
            idPromocion: a.idPromocion ?? undefined,
            caracteristicas: a.caracteristicas,
          }),
        ),
      )
      const fallidas = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      if (fallidas.length > 0) {
        throw new Error(
          `No se pudieron actualizar ${fallidas.length} de ${grupoEnEdicion.articulos.length} variante(s). Primer error: ${getErrorMessage(fallidas[0].reason)}`,
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARTICULOS_QUERY_KEY })
      cerrarEditarGrupo()
    },
    onError: (err) => setErrorGrupo(getErrorMessage(err)),
  })

  /** Baja lógica de todas las variantes del grupo de una sola vez — mismo criterio que borrar
   * un artículo suelto (no se pierde el historial, solo dejan de poder elegirse en operaciones
   * nuevas), pero sin tener que entrar variante por variante. */
  const eliminarGrupoMutation = useMutation({
    mutationFn: async () => {
      if (!grupoAEliminar) return
      const resultados = await Promise.allSettled(grupoAEliminar.articulos.map((a) => articulosApi.remove(a.id)))
      const fallidas = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      if (fallidas.length > 0) {
        throw new Error(
          `No se pudieron eliminar ${fallidas.length} de ${grupoAEliminar.articulos.length} variante(s). Primer error: ${getErrorMessage(fallidas[0].reason)}`,
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARTICULOS_QUERY_KEY })
      setGrupoAEliminar(null)
    },
    onError: (err) => setErrorEliminarGrupo(getErrorMessage(err)),
  })

  function cerrarDialogVariantes() {
    setDialogVariantesAbierto(false)
  }

  function actualizarBaseVariantes<K extends keyof typeof baseVariantes>(campo: K, valor: (typeof baseVariantes)[K]) {
    setBaseVariantes((prev) => ({ ...prev, [campo]: valor }))
  }

  function actualizarFilaVariante(index: number, cambios: Partial<FilaVariante>) {
    setFilasVariantes((prev) => prev.map((f, i) => (i === index ? { ...f, ...cambios } : f)))
  }

  function quitarFilaVariante(index: number) {
    setFilasVariantes((prev) => prev.filter((_, i) => i !== index))
  }

  function agregarCaracteristicaFila(indexFila: number) {
    const primera = caracteristicasQuery.data?.[0]
    if (!primera) return
    setFilasVariantes((prev) =>
      prev.map((f, i) =>
        i === indexFila
          ? {
              ...f,
              caracteristicas: [
                ...f.caracteristicas,
                { id: 0, idCaracteristica: primera.id, nombreCaracteristica: primera.nombreCaracteristica, valor: '' },
              ],
            }
          : f,
      ),
    )
  }

  function actualizarCaracteristicaFila(indexFila: number, indexCaract: number, cambios: Partial<ArticuloCaracteristica>) {
    setFilasVariantes((prev) =>
      prev.map((f, i) => {
        if (i !== indexFila) return f
        const copia = [...f.caracteristicas]
        copia[indexCaract] = { ...copia[indexCaract], ...cambios }
        return { ...f, caracteristicas: copia }
      }),
    )
  }

  function quitarCaracteristicaFila(indexFila: number, indexCaract: number) {
    setFilasVariantes((prev) =>
      prev.map((f, i) => (i === indexFila ? { ...f, caracteristicas: f.caracteristicas.filter((_, j) => j !== indexCaract) } : f)),
    )
  }

  /** El "Tamaño" que exige la base se arma solo uniendo los valores de las características de
   * la fila (ej. "40 · Azul") — no es un campo que el negocio llene a mano acá. */
  function tamanoDeFila(fila: FilaVariante): string {
    return fila.caracteristicas
      .map((c) => c.valor.trim())
      .filter(Boolean)
      .join(' · ')
  }

  function costoEfectivo(fila: FilaVariante): number {
    return fila.costoOverride ?? baseVariantes.costo
  }

  /** Si la fila tiene su propio precio (lo tocaron a mano), ese manda siempre. Si no:
   * - Mismo costo que el de arriba (no tocaron el costo de ESTA fila) → usa el precio de
   *   arriba tal cual esté (calculado con margen, o ajustado a mano — es el mismo campo para
   *   los dos casos, así una fila nueva agregada después también lo hereda).
   * - Costo propio y distinto (ej. la talla más grande, que cuesta un poco más) → se calcula
   *   con margen a partir de SU costo, porque el precio de arriba ya no le corresponde. */
  function precioEfectivo(fila: FilaVariante): number {
    if (fila.precioOverride != null) return fila.precioOverride
    if (fila.costoOverride == null) return baseVariantes.precio
    if (baseVariantes.margenGanancia != null && baseVariantes.margenGanancia < 100) {
      return calcularPrecioPorMargen(costoEfectivo(fila), baseVariantes.margenGanancia, redondearPreciosEnteros)
    }
    return baseVariantes.precio
  }

  const camposObligatoriosVariantesCompletos =
    baseVariantes.codigo.trim() &&
    baseVariantes.idFamilia > 0 &&
    filasVariantes.some((f) => tamanoDeFila(f)) &&
    (baseVariantes.margenGanancia == null || baseVariantes.margenGanancia < 100)

  const guardarVariantesMutation = useMutation({
    mutationFn: async () => {
      const filas = filasVariantes.filter((f) => tamanoDeFila(f))
      if (filas.length === 0) throw new Error('Agregá al menos una variante con alguna característica (talla, color, etc.).')

      const resultados = await Promise.allSettled(
        filas.map((fila) =>
          articulosApi.create({
            codigo: baseVariantes.codigo,
            descripcion: baseVariantes.descripcion,
            tamano: tamanoDeFila(fila),
            unidadMedida: '',
            fraccion: 1,
            precio: precioEfectivo(fila),
            costo: costoEfectivo(fila),
            precioUnidadSuelta: undefined,
            margenGanancia: baseVariantes.margenGanancia,
            stockMinimo: baseVariantes.stockMinimo,
            stockIdeal: baseVariantes.stockIdeal,
            imagen: '',
            idFamilia: baseVariantes.idFamilia,
            idPromocion: undefined,
            caracteristicas: fila.caracteristicas
              .filter((c) => c.valor.trim())
              .map((c) => ({ ...c, valor: c.valor.trim() })),
          }),
        ),
      )

      const fallidas = resultados
        .map((resultado, i) => ({ resultado, fila: filas[i] }))
        .filter((x): x is { resultado: PromiseRejectedResult; fila: FilaVariante } => x.resultado.status === 'rejected')

      if (fallidas.length > 0) {
        // Deja en la tabla solo las que fallaron (las que sí se crearon ya no hace falta
        // reintentarlas), para poder corregir y volver a guardar sin repetir todo.
        setFilasVariantes(fallidas.map((x) => x.fila))
        throw new Error(
          `${fallidas.length} de ${filas.length} variante(s) no se pudieron crear (quedaron en la lista para reintentar). Primer error: ${getErrorMessage(fallidas[0].resultado.reason)}`,
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ARTICULOS_QUERY_KEY })
      cerrarDialogVariantes()
    },
    onError: (err) => setErrorVariantes(getErrorMessage(err)),
  })

  const camposObligatoriosCompletos =
    form.codigo.trim() &&
    form.tamano.trim() &&
    form.idFamilia > 0 &&
    (form.margenGanancia == null || form.margenGanancia < 100)

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Artículos
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={permiteCodigoCompartidoEntreArticulos ? abrirNuevoConVariantes : abrirNuevo}
        >
          Nuevo artículo
        </Button>
      </Stack>

      <TextField
        placeholder="Buscar por código o descripción…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        size="small"
        sx={{ maxWidth: 360 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {articulosQuery.isError && <Alert severity="error">{getErrorMessage(articulosQuery.error)}</Alert>}
      {errorEliminar && (
        <Alert severity="error" onClose={() => setErrorEliminar(null)}>
          {errorEliminar}
        </Alert>
      )}
      {errorEliminarGrupo && (
        <Alert severity="error" onClose={() => setErrorEliminarGrupo(null)}>
          {errorEliminarGrupo}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Familia</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell align="right">Costo</TableCell>
              <TableCell>{permiteCodigoCompartidoEntreArticulos ? 'Variante' : 'Estado'}</TableCell>
              <TableCell align="right" sx={stickyActionsSx}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {articulosQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}

            {!articulosQuery.isLoading && grupos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Sin artículos para mostrar.</Typography>
                </TableCell>
              </TableRow>
            )}

            {grupos.map((grupo) => {
              // Grupo de una sola variante: se ve exactamente como una fila suelta de siempre
              // (no hay nada que desplegar), pero si el negocio comparte código entre artículos
              // igual ofrecemos "+ Variante" para poder sumarle otra talla/color más adelante.
              if (grupo.articulos.length === 1) {
                const articulo = grupo.articulos[0]
                return (
                  <TableRow key={grupo.clave} hover>
                    <TableCell>{articulo.codigo}</TableCell>
                    <TableCell>{articulo.descripcion || '—'}</TableCell>
                    <TableCell>{familiaPorId.get(articulo.idFamilia) ?? '—'}</TableCell>
                    <TableCell>{obtenerUbicacion(articulo) ?? '—'}</TableCell>
                    <TableCell align="right">{money(articulo.precio)}</TableCell>
                    <TableCell align="right">{articulo.costo.toFixed(2)}</TableCell>
                    <TableCell>
                      {permiteCodigoCompartidoEntreArticulos ? resumenVariante(articulo) || '—' : articulo.estado}
                    </TableCell>
                    <TableCell align="right" sx={stickyActionsSx}>
                      <IconButton
                        size="small"
                        title="Imprimir etiquetas con código de barras"
                        onClick={() => {
                          setArticuloParaEtiqueta(articulo)
                          setCantidadEtiquetas('1')
                        }}
                      >
                        <BarcodeIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="Editar" onClick={() => abrirEdicion(articulo)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {permiteCodigoCompartidoEntreArticulos ? (
                        <IconButton size="small" title="Agregar variante (talla/color)" onClick={() => abrirAgregarVariante(grupo)}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <IconButton size="small" title="Duplicar artículo" onClick={() => abrirDuplicado(articulo)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        color="error"
                        disabled={eliminarMutation.isPending}
                        onClick={() => {
                          setErrorEliminar(null)
                          setArticuloAEliminar(articulo)
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              }

              // Grupo con varias variantes: una fila cabecera desplegable + una fila por
              // variante cuando está expandido.
              const expandido = gruposExpandidos[grupo.clave] ?? !!busqueda.trim()
              const precios = grupo.articulos.map((a) => a.precio)
              const costos = grupo.articulos.map((a) => a.costo)
              return (
                <Fragment key={grupo.clave}>
                  <TableRow hover sx={{ '& td': { fontWeight: 600, backgroundColor: 'action.hover' } }}>
                    <TableCell>
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => alternarGrupo(grupo.clave)}>
                          {expandido ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                        </IconButton>
                        {grupo.codigo}
                      </Stack>
                    </TableCell>
                    <TableCell>{grupo.descripcion || '—'}</TableCell>
                    <TableCell>{familiaPorId.get(grupo.idFamilia) ?? '—'}</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell align="right">{rangoTexto(precios, money)}</TableCell>
                    <TableCell align="right">{rangoTexto(costos, (n) => n.toFixed(2))}</TableCell>
                    <TableCell>{grupo.articulos.length} variantes</TableCell>
                    <TableCell align="right" sx={stickyActionsSx}>
                      <IconButton
                        size="small"
                        title="Imprimir etiquetas con código de barras (es el mismo para todas las variantes)"
                        onClick={() => {
                          setArticuloParaEtiqueta(grupo.articulos[0])
                          setCantidadEtiquetas('1')
                        }}
                      >
                        <BarcodeIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="Agregar variante (talla/color)" onClick={() => abrirAgregarVariante(grupo)}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="Editar descripción/familia del grupo" onClick={() => abrirEditarGrupo(grupo)}>
                        <DriveFileRenameOutlineIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        title="Eliminar todas las variantes de este grupo"
                        onClick={() => {
                          setErrorEliminarGrupo(null)
                          setGrupoAEliminar(grupo)
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  {expandido &&
                    grupo.articulos.map((articulo) => (
                      <TableRow key={articulo.id} hover>
                        <TableCell sx={{ pl: 5 }} colSpan={3}>
                          {resumenVariante(articulo) || '—'}
                        </TableCell>
                        <TableCell>{obtenerUbicacion(articulo) ?? '—'}</TableCell>
                        <TableCell align="right">{money(articulo.precio)}</TableCell>
                        <TableCell align="right">{articulo.costo.toFixed(2)}</TableCell>
                        <TableCell>{articulo.estado}</TableCell>
                        <TableCell align="right" sx={stickyActionsSx}>
                          <IconButton size="small" title="Editar" onClick={() => abrirEdicion(articulo)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={eliminarMutation.isPending}
                            onClick={() => {
                              setErrorEliminar(null)
                              setArticuloAEliminar(articulo)
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogAbierto} onClose={cerrarDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          {articuloEnEdicion ? 'Editar artículo' : esDuplicado ? 'Duplicar artículo' : 'Nuevo artículo'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMutacion && <Alert severity="error">{errorMutacion}</Alert>}
            {esDuplicado && !errorMutacion && (
              <Alert severity="info">
                Se copiaron los demás datos del artículo original — completá el Código y el
                Tamaño/variante (y las características que cambien, como la talla) para este nuevo.
              </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 2 }}>
              <TextField
                label="Código"
                required
                fullWidth
                value={form.codigo}
                onChange={(e) => actualizarCampo('codigo', e.target.value)}
              />
              <TextField
                label="Descripción"
                fullWidth
                value={form.descripcion ?? ''}
                onChange={(e) => actualizarCampo('descripcion', e.target.value)}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Tamaño / variante"
                required
                fullWidth
                value={form.tamano}
                onChange={(e) => actualizarCampo('tamano', e.target.value)}
              />
              <TextField
                label="Unidad de medida"
                fullWidth
                value={form.unidadMedida ?? ''}
                onChange={(e) => actualizarCampo('unidadMedida', e.target.value)}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                select
                label="Familia"
                required
                fullWidth
                value={form.idFamilia || ''}
                onChange={(e) => actualizarCampo('idFamilia', Number(e.target.value))}
                helperText={
                  !familiasQuery.isLoading && (familiasQuery.data?.length ?? 0) === 0 ? (
                    <>
                      No hay familias creadas —{' '}
                      <Link component={RouterLink} to="/familias">
                        crear una
                      </Link>
                    </>
                  ) : undefined
                }
              >
                {(familiasQuery.data ?? []).map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.nombreFamilia}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Promoción (opcional)"
                fullWidth
                value={form.idPromocion ?? ''}
                onChange={(e) => actualizarCampo('idPromocion', e.target.value ? Number(e.target.value) : undefined)}
              >
                <MenuItem value="">Sin promoción</MenuItem>
                {(promocionesQuery.data ?? []).map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nombrePromocion}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
              <CampoNumero
                label="Precio de venta"
                fullWidth
                value={form.precio}
                onChange={(precio) => actualizarCampo('precio', precio)}
                helperText={
                  form.margenGanancia != null
                    ? 'Calculado con el margen — lo podés ajustar (ej. redondearlo a un precio cerrado).'
                    : form.fraccion > 1
                      ? 'Precio del paquete completo'
                      : undefined
                }
              />
              <CampoNumero
                label="Costo"
                fullWidth
                value={form.costo}
                onChange={(nuevoCosto) => {
                  actualizarCampo('costo', nuevoCosto)
                  if (form.margenGanancia != null) {
                    actualizarCampo('precio', calcularPrecioPorMargen(nuevoCosto, form.margenGanancia, redondearPreciosEnteros))
                  }
                }}
              />
              <TextField
                label="Unidades por paquete"
                type="number"
                fullWidth
                value={form.fraccion}
                onChange={(e) => actualizarCampo('fraccion', Math.max(1, Number(e.target.value)))}
                helperText="Dejalo en 1 si no vendés por paquete"
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 2 }}>
              <TextField
                label="Margen de ganancia % (opcional)"
                type="number"
                fullWidth
                value={form.margenGanancia ?? ''}
                onChange={(e) => {
                  const valor = e.target.value
                  const margen = valor === '' ? undefined : Number(valor)
                  actualizarCampo('margenGanancia', margen)
                  if (margen != null && margen < 100) {
                    actualizarCampo('precio', calcularPrecioPorMargen(form.costo, margen, redondearPreciosEnteros))
                  }
                }}
                error={form.margenGanancia != null && form.margenGanancia >= 100}
                slotProps={{ htmlInput: { min: 0, max: 99.99, step: 0.01 } }}
                helperText={
                  form.margenGanancia != null && form.margenGanancia >= 100
                    ? 'Tiene que ser menor a 100 (es sobre el precio de venta: el costo es el (100 - margen)% del precio).'
                    : form.margenGanancia != null
                      ? 'El precio de venta se recalcula solo cada vez que compres este artículo y el costo cambie — podés ajustarlo igual (ej. redondearlo).'
                      : 'Si lo dejás vacío, el precio de venta sigue siendo 100% manual, como siempre.'
                }
              />
            </Box>

            {form.fraccion > 1 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr' }, gap: 2 }}>
                <TextField
                  label="Precio por unidad suelta (opcional)"
                  type="number"
                  fullWidth
                  value={form.precioUnidadSuelta ?? ''}
                  onChange={(e) => actualizarCampo('precioUnidadSuelta', e.target.value ? Number(e.target.value) : undefined)}
                  helperText={`Si vendés una sola unidad suelta del paquete. Vacío = se usa ${money(form.precio / form.fraccion)} (proporcional).`}
                />
              </Box>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Stock mínimo"
                type="number"
                fullWidth
                value={form.stockMinimo ?? ''}
                onChange={(e) => actualizarCampo('stockMinimo', e.target.value ? Number(e.target.value) : undefined)}
              />
              <TextField
                label="Stock ideal"
                type="number"
                fullWidth
                value={form.stockIdeal ?? ''}
                onChange={(e) => actualizarCampo('stockIdeal', e.target.value ? Number(e.target.value) : undefined)}
              />
            </Box>

            <Divider />

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2">Características</Typography>
              <Button
                size="small"
                color="success"
                startIcon={<AddIcon />}
                onClick={agregarCaracteristica}
                disabled={!caracteristicasQuery.data?.length}
              >
                Agregar
              </Button>
            </Stack>

            {!caracteristicasQuery.isLoading && (caracteristicasQuery.data?.length ?? 0) === 0 ? (
              <Alert severity="info">
                Todavía no creaste ninguna característica (Color, Talla, etc.). Primero dalas de
                alta en{' '}
                <Link component={RouterLink} to="/caracteristicas">
                  Inventario → Características
                </Link>
                , y después vas a poder agregarlas acá.
              </Alert>
            ) : (
              form.caracteristicas.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Este artículo no tiene características particulares (talla, color, etc.).
                </Typography>
              )
            )}

            {form.caracteristicas.map((c, index) => (
              <Box
                key={index}
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1.5fr 1fr auto' }, gap: 1 }}
              >
                <TextField
                  select
                  size="small"
                  label="Característica"
                  value={c.idCaracteristica}
                  onChange={(e) => {
                    const idCaracteristica = Number(e.target.value)
                    const nombre = caracteristicasQuery.data?.find((x) => x.id === idCaracteristica)
                      ?.nombreCaracteristica
                    actualizarCaracteristica(index, { idCaracteristica, nombreCaracteristica: nombre })
                  }}
                >
                  {(caracteristicasQuery.data ?? []).map((carac) => (
                    <MenuItem key={carac.id} value={carac.id}>
                      {carac.nombreCaracteristica}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Valor"
                  value={c.valor}
                  onChange={(e) => actualizarCaracteristica(index, { valor: e.target.value })}
                />
                <IconButton size="small" color="error" onClick={() => quitarCaracteristica(index)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarDialog}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={guardarMutation.isPending || !camposObligatoriosCompletos}
            onClick={() => guardarMutation.mutate()}
          >
            {guardarMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogVariantesAbierto}
        onClose={cerrarDialogVariantes}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{grupoOrigen ? `Agregar variante — ${grupoOrigen.codigo}` : 'Nuevo artículo'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorVariantes && <Alert severity="error">{errorVariantes}</Alert>}
            <Alert severity="info">
              {grupoOrigen
                ? 'Código, Descripción y Familia son los del grupo (no se pueden cambiar acá). Agregá abajo la nueva talla/color — podés sumar más de una a la vez.'
                : 'Cargá los datos una sola vez y agregá abajo cada variante (talla, color, o lo que corresponda) — se crea un Artículo por fila, todos con el mismo código. Arranca sin stock: se carga después por Compras o Ajuste de stock.'}
            </Alert>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 2 }}>
              <TextField
                label="Código"
                required
                fullWidth
                disabled={!!grupoOrigen}
                value={baseVariantes.codigo}
                onChange={(e) => actualizarBaseVariantes('codigo', e.target.value)}
                helperText="El mismo para todas las variantes de abajo."
              />
              <TextField
                label="Descripción"
                fullWidth
                disabled={!!grupoOrigen}
                value={baseVariantes.descripcion}
                onChange={(e) => actualizarBaseVariantes('descripcion', e.target.value)}
              />
            </Box>

            <TextField
              select
              label="Familia"
              required
              fullWidth
              disabled={!!grupoOrigen}
              value={baseVariantes.idFamilia || ''}
              onChange={(e) => actualizarBaseVariantes('idFamilia', Number(e.target.value))}
              sx={{ maxWidth: { sm: '50%' } }}
              helperText={
                !familiasQuery.isLoading && (familiasQuery.data?.length ?? 0) === 0 ? (
                  <>
                    No hay familias creadas —{' '}
                    <Link component={RouterLink} to="/familias">
                      crear una
                    </Link>
                  </>
                ) : undefined
              }
            >
              {(familiasQuery.data ?? []).map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.nombreFamilia}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
              <CampoNumero
                label="Costo (por defecto)"
                fullWidth
                value={baseVariantes.costo}
                onChange={(costo) => {
                  actualizarBaseVariantes('costo', costo)
                  if (baseVariantes.margenGanancia != null && baseVariantes.margenGanancia < 100) {
                    actualizarBaseVariantes('precio', calcularPrecioPorMargen(costo, baseVariantes.margenGanancia, redondearPreciosEnteros))
                  }
                }}
                helperText="Cada fila puede pisarlo."
              />
              <CampoNumero
                label="Precio de venta (por defecto)"
                fullWidth
                value={baseVariantes.precio}
                onChange={(precio) => actualizarBaseVariantes('precio', precio)}
                helperText={
                  baseVariantes.margenGanancia != null
                    ? 'Calculado con el margen — lo podés ajustar (ej. redondearlo a un precio cerrado).'
                    : 'Cada fila puede pisarlo.'
                }
              />
              <TextField
                label="Margen de ganancia % (opcional)"
                type="number"
                fullWidth
                value={baseVariantes.margenGanancia ?? ''}
                onChange={(e) => {
                  const valor = e.target.value
                  const margen = valor === '' ? undefined : Number(valor)
                  actualizarBaseVariantes('margenGanancia', margen)
                  if (margen != null && margen < 100) {
                    actualizarBaseVariantes('precio', calcularPrecioPorMargen(baseVariantes.costo, margen, redondearPreciosEnteros))
                  }
                }}
                error={baseVariantes.margenGanancia != null && baseVariantes.margenGanancia >= 100}
                slotProps={{ htmlInput: { min: 0, max: 99.99, step: 0.01 } }}
                helperText={
                  baseVariantes.margenGanancia != null && baseVariantes.margenGanancia >= 100
                    ? 'Tiene que ser menor a 100.'
                    : 'Si se carga, el precio de cada fila se calcula solo (editable igual).'
                }
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Stock mínimo (opcional)"
                type="number"
                fullWidth
                value={baseVariantes.stockMinimo ?? ''}
                onChange={(e) => actualizarBaseVariantes('stockMinimo', e.target.value ? Number(e.target.value) : undefined)}
                helperText="Mismo umbral para todas las variantes de abajo — si querés que aparezcan en el aviso de 'Stock bajo'."
              />
              <TextField
                label="Stock ideal (opcional)"
                type="number"
                fullWidth
                value={baseVariantes.stockIdeal ?? ''}
                onChange={(e) => actualizarBaseVariantes('stockIdeal', e.target.value ? Number(e.target.value) : undefined)}
              />
            </Box>

            <Divider />

            <Typography variant="subtitle2">Variantes</Typography>
            {!caracteristicasQuery.isLoading && (caracteristicasQuery.data?.length ?? 0) === 0 && (
              <Alert severity="warning">
                Todavía no hay ninguna Característica creada (Talla, Color, etc.) —{' '}
                <Link component={RouterLink} to="/caracteristicas">
                  creá al menos una
                </Link>{' '}
                para poder armar las variantes.
              </Alert>
            )}
            <Stack spacing={2}>
              {filasVariantes.map((fila, index) => (
                <Paper key={index} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr auto' }, gap: 1.5, alignItems: 'flex-start' }}>
                      <CampoNumero
                        label="Costo"
                        size="small"
                        fullWidth
                        value={costoEfectivo(fila)}
                        onChange={(costo) => actualizarFilaVariante(index, { costoOverride: costo })}
                      />
                      <CampoNumero
                        label="Precio"
                        size="small"
                        fullWidth
                        value={precioEfectivo(fila)}
                        onChange={(precio) => actualizarFilaVariante(index, { precioOverride: precio })}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => quitarFilaVariante(index)}
                        disabled={filasVariantes.length === 1}
                        sx={{ justifySelf: 'end' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Talla, color, etc. — las mismas Características que en el alta normal de
                        un artículo. El "Tamaño" que exige la base se arma solo con estos valores
                        (ver tamanoDeFila), acá no aparece como campo aparte. */}
                    {fila.caracteristicas.map((c, indexCaract) => (
                      <Box
                        key={indexCaract}
                        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1.5fr 1fr auto' }, gap: 1 }}
                      >
                        <TextField
                          select
                          size="small"
                          label="Característica"
                          value={c.idCaracteristica}
                          onChange={(e) => {
                            const idCaracteristica = Number(e.target.value)
                            const nombre = caracteristicasQuery.data?.find((x) => x.id === idCaracteristica)
                              ?.nombreCaracteristica
                            actualizarCaracteristicaFila(index, indexCaract, { idCaracteristica, nombreCaracteristica: nombre })
                          }}
                        >
                          {(caracteristicasQuery.data ?? []).map((carac) => (
                            <MenuItem key={carac.id} value={carac.id}>
                              {carac.nombreCaracteristica}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          size="small"
                          label="Valor"
                          value={c.valor}
                          onChange={(e) => actualizarCaracteristicaFila(index, indexCaract, { valor: e.target.value })}
                        />
                        <IconButton size="small" color="error" onClick={() => quitarCaracteristicaFila(index, indexCaract)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Button
                      startIcon={<AddIcon />}
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                      disabled={(caracteristicasQuery.data?.length ?? 0) === 0}
                      onClick={() => agregarCaracteristicaFila(index)}
                    >
                      Agregar característica
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
            <Button
              startIcon={<AddIcon />}
              size="small"
              sx={{ alignSelf: 'flex-start' }}
              onClick={() => setFilasVariantes((prev) => [...prev, FILA_VARIANTE_VACIA])}
            >
              Agregar variante
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarDialogVariantes}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={guardarVariantesMutation.isPending || !camposObligatoriosVariantesCompletos}
            onClick={() => guardarVariantesMutation.mutate()}
          >
            {guardarVariantesMutation.isPending ? 'Guardando…' : `Guardar (${filasVariantes.filter((f) => tamanoDeFila(f)).length})`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!articuloParaEtiqueta} onClose={() => setArticuloParaEtiqueta(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Imprimir etiquetas — {articuloParaEtiqueta?.codigo}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Se genera una hoja con esta cantidad de copias del mismo código de barras, para
              recortar y pegar en cada prenda/unidad.
            </Typography>
            <TextField
              label="Cantidad de etiquetas"
              type="number"
              autoFocus
              fullWidth
              value={cantidadEtiquetas}
              onChange={(e) => setCantidadEtiquetas(e.target.value)}
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArticuloParaEtiqueta(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!Number(cantidadEtiquetas) || Number(cantidadEtiquetas) < 1}
            onClick={() => {
              if (articuloParaEtiqueta) {
                imprimirEtiquetaArticulo(articuloParaEtiqueta, Number(cantidadEtiquetas), simboloMoneda)
              }
              setArticuloParaEtiqueta(null)
            }}
          >
            Imprimir
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!grupoEnEdicion} onClose={cerrarEditarGrupo} maxWidth="xs" fullWidth>
        <DialogTitle>Editar grupo — {grupoEnEdicion?.codigo}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorGrupo && <Alert severity="error">{errorGrupo}</Alert>}
            <Alert severity="info">
              Descripción, Familia y Stock mínimo/ideal se actualizan en las{' '}
              {grupoEnEdicion?.articulos.length} variantes de este grupo a la vez — talla/color,
              precio, costo y el stock actual de cada una no se tocan.
            </Alert>
            <TextField
              label="Descripción"
              fullWidth
              value={formGrupo.descripcion}
              onChange={(e) => setFormGrupo((prev) => ({ ...prev, descripcion: e.target.value }))}
            />
            <TextField
              select
              label="Familia"
              required
              fullWidth
              value={formGrupo.idFamilia || ''}
              onChange={(e) => setFormGrupo((prev) => ({ ...prev, idFamilia: Number(e.target.value) }))}
            >
              {(familiasQuery.data ?? []).map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.nombreFamilia}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Stock mínimo (opcional)"
                type="number"
                fullWidth
                value={formGrupo.stockMinimo ?? ''}
                onChange={(e) =>
                  setFormGrupo((prev) => ({ ...prev, stockMinimo: e.target.value ? Number(e.target.value) : undefined }))
                }
                helperText="Para que aparezcan en el aviso de 'Stock bajo'."
              />
              <TextField
                label="Stock ideal (opcional)"
                type="number"
                fullWidth
                value={formGrupo.stockIdeal ?? ''}
                onChange={(e) =>
                  setFormGrupo((prev) => ({ ...prev, stockIdeal: e.target.value ? Number(e.target.value) : undefined }))
                }
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarEditarGrupo}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={editarGrupoMutation.isPending || formGrupo.idFamilia <= 0}
            onClick={() => editarGrupoMutation.mutate()}
          >
            {editarGrupoMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ErrorDialog mensaje={errorMutacion} onCerrar={() => setErrorMutacion(null)} />
      <ErrorDialog mensaje={errorVariantes} onCerrar={() => setErrorVariantes(null)} />

      <ConfirmDialog
        open={!!articuloAEliminar}
        titulo="Eliminar artículo"
        mensaje={`¿Seguro que querés eliminar "${articuloAEliminar?.codigo} — ${articuloAEliminar?.descripcion ?? ''}"? No se borra su historial de compras/ventas, solo deja de aparecer para elegirlo en operaciones nuevas.`}
        confirmando={eliminarMutation.isPending}
        onConfirmar={() => articuloAEliminar && eliminarMutation.mutate(articuloAEliminar.id)}
        onCancelar={() => setArticuloAEliminar(null)}
      />

      <ConfirmDialog
        open={!!grupoAEliminar}
        titulo="Eliminar grupo"
        mensaje={`¿Seguro que querés eliminar las ${grupoAEliminar?.articulos.length} variantes de "${grupoAEliminar?.codigo} — ${grupoAEliminar?.descripcion}"? No se borra su historial de compras/ventas, solo dejan de aparecer para elegirlas en operaciones nuevas.`}
        confirmando={eliminarGrupoMutation.isPending}
        onConfirmar={() => eliminarGrupoMutation.mutate()}
        onCancelar={() => setGrupoAEliminar(null)}
      />
    </Stack>
  )
}
