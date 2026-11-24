import { useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import InputAdornment from '@mui/material/InputAdornment'
import BarcodeIcon from '@mui/icons-material/BarcodeReader'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import { SelectorVariantes } from '../components/SelectorVariantes'
import { EscanerCamara } from '../components/EscanerCamara'
import { articulosPorCodigo } from '../utils/fraccion'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
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
import { EntityAutocomplete } from '../components/EntityAutocomplete'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { etiquetaArticulo } from '../utils/articulo'
import { articulosApi, buscarArticulos, getStockArticulo } from '../api/articulos'
import { registrarAjusteStock, getAjustesByArticulo, eliminarAjusteStock } from '../api/ajusteStock'
import { getErrorMessage } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import type { Articulo } from '../types/articulo'
import type { AjusteStock, TipoAjusteStock } from '../types/ajusteStock'

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Corrección manual de stock (rotura, vencimiento, robo, conteo real distinto) que no viene de
 * una Compra ni de una Venta — hasta ahora el sistema no tenía forma de reflejar esto, el stock
 * quedaba mal sin remedio. Queda historial de cada ajuste: quién, cuándo, por qué. */
export function AjusteStockPage() {
  const { usuario } = useAuth()
  const { permiteCodigoCompartidoEntreArticulos } = useConfiguracionEmpresa()
  const queryClient = useQueryClient()

  const [articulo, setArticulo] = useState<Articulo | null>(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [tipo, setTipo] = useState<TipoAjusteStock>('SALIDA')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ajusteAEliminar, setAjusteAEliminar] = useState<AjusteStock | null>(null)

  // Escaneo con el lector (o la cámara): mismo funcionamiento que en Ventas. Flujo pensado
  // para hacer muchos ajustes seguidos sin mouse: escanear → cantidad → Enter → (motivo →
  // Enter la primera vez) → registrado y el foco vuelve al cuadro de escaneo.
  const [codigoEscaneado, setCodigoEscaneado] = useState('')
  const [errorEscaneo, setErrorEscaneo] = useState<string | null>(null)
  const [variantesParaElegir, setVariantesParaElegir] = useState<Articulo[] | null>(null)
  const [escanerCamaraAbierto, setEscanerCamaraAbierto] = useState(false)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const cantidadInputRef = useRef<HTMLInputElement>(null)
  const motivoInputRef = useRef<HTMLInputElement>(null)

  // Misma consulta (y caché) que usa Ventas para resolver códigos escaneados.
  const articulosQuery = useQuery({ queryKey: ['articulos'], queryFn: () => articulosApi.search() })

  const stockQuery = useQuery({
    queryKey: ['stock', 'articulo', articulo?.id],
    queryFn: () => getStockArticulo(articulo!.id),
    enabled: !!articulo,
  })

  const ajustesQuery = useQuery({
    queryKey: ['ajustesStock', 'byArticulo', articulo?.id],
    queryFn: () => getAjustesByArticulo(articulo!.id),
    enabled: !!articulo,
  })

  /** Elige el artículo a ajustar (escaneado, de las variantes, o del buscador) y lleva el foco a
   * la cantidad — el campo recién aparece al elegir el artículo, por eso el setTimeout. */
  function elegirArticulo(a: Articulo | null) {
    setArticulo(a)
    setCantidad('')
    setVariantesParaElegir(null)
    setErrorEscaneo(null)
    if (a) setTimeout(() => cantidadInputRef.current?.focus(), 0)
  }

  function procesarCodigo(codigoCrudo: string) {
    const codigo = codigoCrudo.trim()
    if (!codigo) return
    setVariantesParaElegir(null)
    const coincidencias = articulosPorCodigo(articulosQuery.data ?? [], codigo)
    if (coincidencias.length === 0) {
      setErrorEscaneo(`No se encontró ningún artículo con el código "${codigo}".`)
    } else if (coincidencias.length === 1) {
      elegirArticulo(coincidencias[0])
    } else {
      // Mismo código, varias variantes (talla/color): se elige con 1-9 o con un clic.
      setVariantesParaElegir(coincidencias)
      setErrorEscaneo(null)
    }
  }

  function handleScanKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (variantesParaElegir) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setVariantesParaElegir(null)
        return
      }
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault()
        const elegida = variantesParaElegir[Number(e.key) - 1]
        if (elegida) elegirArticulo(elegida)
        return
      }
      if (e.key !== 'Enter') return
    }
    if (e.key !== 'Enter') return
    e.preventDefault()
    procesarCodigo(codigoEscaneado)
    setCodigoEscaneado('')
  }

  const datosCompletos = !!articulo && Number(cantidad) > 0 && !!motivo.trim()

  /** Enter en Cantidad: si ya hay motivo (de un ajuste anterior) registra directo; si no, pasa
   * al motivo. Enter en Motivo: registra. */
  function handleCantidadKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (datosCompletos) {
      if (!mutation.isPending) mutation.mutate()
    } else if (Number(cantidad) > 0) motivoInputRef.current?.focus()
  }

  function handleMotivoKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (datosCompletos && !mutation.isPending) mutation.mutate()
  }

  /** Después de registrar se deja el Tipo y el Motivo como estaban (lo normal es ajustar varios
   * productos seguidos por la misma razón: vencidos, rotos, conteo…) y se vuelve al escaneo. */
  function limpiarFormulario() {
    setCantidad('')
    setTimeout(() => scanInputRef.current?.focus(), 0)
  }

  function invalidarStock() {
    // El stock de este artículo cambió: se refresca en todos lados donde se muestra
    // (Ventas, Compras, Stock actual, etc.), no solo acá.
    queryClient.invalidateQueries({ queryKey: ['stock'] })
    queryClient.invalidateQueries({ queryKey: ['ajustesStock', 'byArticulo', articulo?.id] })
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!articulo || !usuario) throw new Error('Faltan datos.')
      const cant = Number(cantidad)
      if (!cant || cant <= 0) throw new Error('La cantidad debe ser mayor a 0.')

      return registrarAjusteStock({
        fecha: new Date(fecha).toISOString(),
        tipo,
        cantidad: cant,
        motivo,
        idArticulo: articulo.id,
        idUsuario: usuario.id,
      })
    },
    onSuccess: (ajuste) => {
      invalidarStock()
      setAviso(`Ajuste #${ajuste.id} registrado correctamente.`)
      limpiarFormulario()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const eliminarMutation = useMutation({
    mutationFn: eliminarAjusteStock,
    onSuccess: () => {
      invalidarStock()
      setAjusteAEliminar(null)
    },
    onError: (err) => {
      setError(getErrorMessage(err))
      setAjusteAEliminar(null)
    },
  })

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ajuste de stock
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Corregí el stock cuando no viene de una compra ni de una venta: rotura, vencimiento,
          robo, o un conteo real distinto al que el sistema tiene calculado. Queda registrado
          quién lo hizo, cuándo y por qué.
        </Typography>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, maxWidth: 860, alignItems: 'flex-start' }}>
        <Box
          component="form"
          sx={{ display: 'contents' }}
          onSubmit={(e: FormEvent) => {
            // Igual que en Ventas: algunos celulares mandan la tecla "Ir" como submit del form.
            e.preventDefault()
            if (!variantesParaElegir) {
              procesarCodigo(codigoEscaneado)
              setCodigoEscaneado('')
            }
          }}
        >
          <TextField
            inputRef={scanInputRef}
            autoFocus
            label="Escanear código de barras"
            placeholder="Escaneá o escribí el código y Enter"
            size="small"
            fullWidth
            autoComplete="off"
            value={codigoEscaneado}
            onChange={(e) => setCodigoEscaneado(e.target.value)}
            onKeyDown={handleScanKeyDown}
            error={!!errorEscaneo}
            helperText={errorEscaneo ?? 'El lector elige el artículo solo.'}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <BarcodeIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      title={escanerCamaraAbierto ? 'Cerrar cámara' : 'Escanear con la cámara'}
                      color={escanerCamaraAbierto ? 'primary' : 'default'}
                      onClick={() => setEscanerCamaraAbierto((v) => !v)}
                    >
                      <CameraAltIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
              htmlInput: { enterKeyHint: 'go' },
            }}
          />
        </Box>
        <EntityAutocomplete
          label="…o buscar por código o descripción"
          size="small"
          queryKey="articulos-autocomplete-ajuste-stock"
          searchFn={buscarArticulos}
          getLabel={(a: Articulo) => etiquetaArticulo(a, permiteCodigoCompartidoEntreArticulos)}
          getId={(a: Articulo) => a.id}
          value={articulo}
          onChange={elegirArticulo}
        />
      </Box>

      {escanerCamaraAbierto && (
        <EscanerCamara
          onCodigo={procesarCodigo}
          pausado={!!variantesParaElegir}
          onCerrar={() => setEscanerCamaraAbierto(false)}
        />
      )}

      {variantesParaElegir && (
        <SelectorVariantes
          variantes={variantesParaElegir}
          onElegir={elegirArticulo}
          onCerrar={() => setVariantesParaElegir(null)}
        />
      )}

      {articulo && (
        <>
          <Paper variant="outlined" sx={{ p: 2, maxWidth: 420 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
              {etiquetaArticulo(articulo, permiteCodigoCompartidoEntreArticulos)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Stock actual
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {stockQuery.isLoading ? '…' : (stockQuery.data?.stockActual ?? 0)}
              {articulo.unidadMedida ? ` ${articulo.unidadMedida}` : ''}
            </Typography>
          </Paper>

          <Divider />

          <Typography variant="subtitle2">Nuevo ajuste</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
            <TextField
              select
              label="Tipo"
              size="small"
              fullWidth
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAjusteStock)}
            >
              <MenuItem value="SALIDA">Salida (se pierde stock)</MenuItem>
              <MenuItem value="ENTRADA">Entrada (se suma stock)</MenuItem>
            </TextField>
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
              label={`Cantidad${articulo.unidadMedida ? ` (${articulo.unidadMedida})` : ''}`}
              type="number"
              size="small"
              fullWidth
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              onKeyDown={handleCantidadKeyDown}
              inputRef={cantidadInputRef}
              slotProps={{ htmlInput: { min: 1, enterKeyHint: 'next' } }}
            />
            <Button
              variant="contained"
              disabled={mutation.isPending || !cantidad || !motivo.trim()}
              onClick={() => mutation.mutate()}
              sx={{ height: 40 }}
            >
              {mutation.isPending ? 'Guardando…' : 'Registrar ajuste'}
            </Button>
          </Box>
          <TextField
            label="Motivo"
            size="small"
            fullWidth
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            onKeyDown={handleMotivoKeyDown}
            inputRef={motivoInputRef}
            helperText="Se mantiene para el próximo ajuste. Enter registra."
            placeholder="Ej: se rompieron 3 en el depósito, conteo real distinto, etc."
          />

          <Divider />

          <Typography variant="subtitle2">Historial de ajustes de este artículo</Typography>
          {ajustesQuery.isLoading && (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Paper>
          )}
          {!ajustesQuery.isLoading && (ajustesQuery.data ?? []).length === 0 && (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                Este artículo no tiene ajustes registrados.
              </Typography>
            </Paper>
          )}
          {(ajustesQuery.data ?? []).length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell align="center" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(ajustesQuery.data ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{new Date(a.fecha).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={a.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}
                          color={a.tipo === 'ENTRADA' ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {a.tipo === 'ENTRADA' ? '+' : '−'}
                        {a.cantidad}
                      </TableCell>
                      <TableCell>{a.motivo}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => setAjusteAEliminar(a)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!ajusteAEliminar}
        titulo="Eliminar ajuste de stock"
        mensaje={
          ajusteAEliminar
            ? `¿Eliminar el ajuste de ${ajusteAEliminar.tipo === 'ENTRADA' ? 'entrada' : 'salida'} de ${ajusteAEliminar.cantidad} unidades? El stock del artículo se recalcula al toque.`
            : ''
        }
        confirmando={eliminarMutation.isPending}
        onConfirmar={() => ajusteAEliminar && eliminarMutation.mutate(ajusteAEliminar.id)}
        onCancelar={() => setAjusteAEliminar(null)}
      />

      <Snackbar
        open={!!aviso}
        autoHideDuration={4000}
        onClose={() => setAviso(null)}
        message={aviso}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  )
}
