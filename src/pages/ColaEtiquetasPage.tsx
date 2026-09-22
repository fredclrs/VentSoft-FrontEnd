import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
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
import Typography from '@mui/material/Typography'
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined'
import PrintIcon from '@mui/icons-material/PrintOutlined'
import { CampoNumero } from '../components/CampoNumero'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorDialog } from '../components/ErrorDialog'
import { articulosApi } from '../api/articulos'
import {
  actualizarCantidadEtiquetaPendiente,
  eliminarEtiquetaPendiente,
  getEtiquetasPendientes,
  vaciarEtiquetasPendientes,
} from '../api/etiquetasPendientes'
import { imprimirHojaDeCola } from '../utils/barcode'
import { getErrorMessage } from '../api/errors'
import { resumenVariante } from '../utils/articulo'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'

const QUERY_KEY = ['etiquetasPendientes'] as const

/** "hoy", "ayer", "hace 5 días" — para que se note de un vistazo si algo lleva mucho tiempo
 * esperando (el backend descarta solo lo que pasa los 30 días, pero conviene que se note antes). */
function haceCuanto(fechaIso: string): string {
  const dias = Math.floor((Date.now() - new Date(fechaIso).getTime()) / (1000 * 60 * 60 * 24))
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}

/**
 * Cola de etiquetas de código de barras pendientes de imprimir. Pensada para juntar varios
 * productos nuevos a lo largo del día (a veces son solo 3-5 prendas de una marca) y mandarlos
 * todos juntos a una sola impresión, en vez de desperdiciar una hoja por cada producto — se
 * agrega desde Artículos ("Agregar a la cola" en el diálogo de imprimir etiquetas).
 */
export function ColaEtiquetasPage() {
  const queryClient = useQueryClient()
  const { permiteCodigoCompartidoEntreArticulos } = useConfiguracionEmpresa()
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmarVaciar, setConfirmarVaciar] = useState(false)

  const colaQuery = useQuery({ queryKey: QUERY_KEY, queryFn: getEtiquetasPendientes })
  const articulosQuery = useQuery({ queryKey: ['articulos'], queryFn: () => articulosApi.search() })

  const articuloPorId = useMemo(
    () => new Map((articulosQuery.data ?? []).map((a) => [a.id, a])),
    [articulosQuery.data],
  )

  const cola = colaQuery.data ?? []
  const totalEtiquetas = cola.reduce((suma, e) => suma + e.cantidad, 0)

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  }

  const actualizarMutation = useMutation({
    mutationFn: ({ id, cantidad }: { id: number; cantidad: number }) => actualizarCantidadEtiquetaPendiente(id, cantidad),
    onSuccess: invalidar,
    onError: (err) => setError(getErrorMessage(err)),
  })

  const eliminarMutation = useMutation({
    mutationFn: eliminarEtiquetaPendiente,
    onSuccess: invalidar,
    onError: (err) => setError(getErrorMessage(err)),
  })

  const imprimirMutation = useMutation({
    mutationFn: async () => {
      const items = cola
        .map((e) => {
          const articulo = articuloPorId.get(e.idArticulo)
          if (!articulo) return null
          return {
            codigo: articulo.codigo,
            descripcion: permiteCodigoCompartidoEntreArticulos
              ? `${articulo.descripcion ?? ''} ${resumenVariante(articulo)}`.trim()
              : articulo.descripcion,
            cantidad: e.cantidad,
          }
        })
        .filter((item): item is { codigo: string; descripcion: string; cantidad: number } => item !== null)

      if (items.length === 0) throw new Error('No hay etiquetas para imprimir.')

      imprimirHojaDeCola(items)
      const cantidadVaciada = await vaciarEtiquetasPendientes()
      return cantidadVaciada
    },
    onSuccess: (cantidad) => {
      invalidar()
      setAviso(`Se mandaron a imprimir ${cantidad} producto(s) de la cola.`)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const vaciarMutation = useMutation({
    mutationFn: vaciarEtiquetasPendientes,
    onSuccess: () => {
      invalidar()
      setConfirmarVaciar(false)
    },
    onError: (err) => {
      setError(getErrorMessage(err))
      setConfirmarVaciar(false)
    },
  })

  const cargando = colaQuery.isLoading || articulosQuery.isLoading

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Cola de etiquetas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Productos esperando a imprimirse — juntá varios (aunque sean pocas unidades de cada
            uno) y mandalos todos de una vez, en vez de desperdiciar una hoja por producto. Se
            agrega desde Artículos, en el diálogo de "Imprimir etiquetas".
          </Typography>
        </div>
        <Stack direction="row" spacing={1}>
          <Button
            color="error"
            disabled={cola.length === 0 || vaciarMutation.isPending}
            onClick={() => setConfirmarVaciar(true)}
          >
            Vaciar
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            disabled={cola.length === 0 || imprimirMutation.isPending}
            onClick={() => imprimirMutation.mutate()}
          >
            {imprimirMutation.isPending ? 'Imprimiendo…' : `Imprimir todo (${totalEtiquetas})`}
          </Button>
        </Stack>
      </Stack>

      {colaQuery.isError && <Alert severity="error">{getErrorMessage(colaQuery.error)}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Agregado</TableCell>
              <TableCell align="right" sx={{ width: 140 }}>
                Cantidad
              </TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cargando && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}
            {!cargando && cola.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">La cola está vacía.</Typography>
                </TableCell>
              </TableRow>
            )}
            {cola.map((e) => {
              const articulo = articuloPorId.get(e.idArticulo)
              return (
                <TableRow key={e.id} hover>
                  <TableCell>{articulo?.codigo ?? '—'}</TableCell>
                  <TableCell>
                    {articulo?.descripcion || '—'}
                    {permiteCodigoCompartidoEntreArticulos && articulo && (
                      <Typography variant="body2" color="text.secondary">
                        {resumenVariante(articulo)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <CampoNumero
                      size="small"
                      value={e.cantidad}
                      valorVacio={1}
                      onChange={() => {}}
                      onBlur={(ev) => {
                        const valor = Math.max(1, Math.round(Number(ev.target.value) || 1))
                        if (valor !== e.cantidad) actualizarMutation.mutate({ id: e.id, cantidad: valor })
                      }}
                      slotProps={{ htmlInput: { min: 1, style: { textAlign: 'right' } } }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      disabled={eliminarMutation.isPending}
                      onClick={() => eliminarMutation.mutate(e.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        open={confirmarVaciar}
        titulo="Vaciar la cola de etiquetas"
        mensaje={`¿Seguro que querés sacar los ${cola.length} producto(s) de la cola sin imprimirlos?`}
        confirmando={vaciarMutation.isPending}
        onConfirmar={() => vaciarMutation.mutate()}
        onCancelar={() => setConfirmarVaciar(false)}
      />

      <ErrorDialog mensaje={error} onCerrar={() => setError(null)} />

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
