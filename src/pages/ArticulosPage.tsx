import { useMemo, useState } from 'react'
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
import { articulosApi } from '../api/articulos'
import { familiasApi } from '../api/familias'
import { promocionesApi } from '../api/promociones'
import { caracteristicasApi } from '../api/caracteristicas'
import { getErrorMessage } from '../api/errors'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { imprimirEtiquetaArticulo } from '../utils/barcode'
import { obtenerUbicacion } from '../utils/articulo'
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

export function ArticulosPage() {
  const isMobile = useIsMobile()
  const { money, simboloMoneda } = useConfiguracionEmpresa()
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [articuloEnEdicion, setArticuloEnEdicion] = useState<Articulo | null>(null)
  const [form, setForm] = useState<ArticuloFormValues>(ARTICULO_VACIO)
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null)
  const [articuloAEliminar, setArticuloAEliminar] = useState<Articulo | null>(null)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [articuloParaEtiqueta, setArticuloParaEtiqueta] = useState<Articulo | null>(null)
  const [cantidadEtiquetas, setCantidadEtiquetas] = useState('1')

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
    setForm(ARTICULO_VACIO)
    setErrorMutacion(null)
    setDialogAbierto(true)
  }

  function abrirEdicion(articulo: Articulo) {
    setArticuloEnEdicion(articulo)
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

  const camposObligatoriosCompletos =
    form.codigo.trim() && form.tamano.trim() && form.idFamilia > 0

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Artículos
        </Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={abrirNuevo}>
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
              <TableCell>Estado</TableCell>
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

            {!articulosQuery.isLoading && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Sin artículos para mostrar.</Typography>
                </TableCell>
              </TableRow>
            )}

            {filtrados.map((articulo) => (
              <TableRow key={articulo.id} hover>
                <TableCell>{articulo.codigo}</TableCell>
                <TableCell>{articulo.descripcion || '—'}</TableCell>
                <TableCell>{familiaPorId.get(articulo.idFamilia) ?? '—'}</TableCell>
                <TableCell>{obtenerUbicacion(articulo) ?? '—'}</TableCell>
                <TableCell align="right">{money(articulo.precio)}</TableCell>
                <TableCell align="right">{articulo.costo.toFixed(2)}</TableCell>
                <TableCell>{articulo.estado}</TableCell>
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
                  <IconButton size="small" onClick={() => abrirEdicion(articulo)}>
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
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogAbierto} onClose={cerrarDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{articuloEnEdicion ? 'Editar artículo' : 'Nuevo artículo'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMutacion && <Alert severity="error">{errorMutacion}</Alert>}

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
              <TextField
                label="Precio de venta"
                type="number"
                fullWidth
                disabled={form.margenGanancia != null}
                value={form.precio}
                onChange={(e) => actualizarCampo('precio', Number(e.target.value))}
                helperText={
                  form.margenGanancia != null
                    ? 'Se calcula solo por el margen de ganancia'
                    : form.fraccion > 1
                      ? 'Precio del paquete completo'
                      : undefined
                }
              />
              <TextField
                label="Costo"
                type="number"
                fullWidth
                value={form.costo}
                onChange={(e) => {
                  const nuevoCosto = Number(e.target.value)
                  actualizarCampo('costo', nuevoCosto)
                  if (form.margenGanancia != null) {
                    actualizarCampo('precio', Math.round(nuevoCosto * (1 + form.margenGanancia / 100) * 100) / 100)
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
                  if (margen != null) {
                    actualizarCampo('precio', Math.round(form.costo * (1 + margen / 100) * 100) / 100)
                  }
                }}
                helperText={
                  form.margenGanancia != null
                    ? 'El precio de venta se recalcula solo cada vez que compres este artículo y el costo cambie — no hace falta tocarlo a mano.'
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

      <ConfirmDialog
        open={!!articuloAEliminar}
        titulo="Eliminar artículo"
        mensaje={`¿Seguro que querés eliminar "${articuloAEliminar?.codigo} — ${articuloAEliminar?.descripcion ?? ''}"? No se borra su historial de compras/ventas, solo deja de aparecer para elegirlo en operaciones nuevas.`}
        confirmando={eliminarMutation.isPending}
        onConfirmar={() => articuloAEliminar && eliminarMutation.mutate(articuloAEliminar.id)}
        onCancelar={() => setArticuloAEliminar(null)}
      />
    </Stack>
  )
}
