import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
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
import { getErrorMessage } from '../../api/errors'
import { useIsMobile } from '../../hooks/useIsMobile'
import { stickyActionsSx } from '../../utils/tableStyles'
import { ConfirmDialog } from '../ConfirmDialog'
import type { CrudApi } from '../../api/crud'

/** Estado del formulario del diálogo: todo como string (así son los inputs controlados). */
export type CrudFormState = Record<string, string>

export interface CrudColumn<TDto> {
  key: keyof TDto & string
  label: string
  render?: (item: TDto) => React.ReactNode
}

export interface CrudField {
  key: string
  label: string
  required?: boolean
  multiline?: boolean
  type?: 'text' | 'number' | 'select' | 'checkbox'
  /** Opciones cuando type === 'select'. */
  options?: { value: string; label: string }[]
  /** Texto de ayuda debajo del control (checkbox u otro tipo). */
  helperText?: string
}

export interface SimpleCrudPageProps<TDto extends { id: number }, TForm> {
  title: string
  queryKey: string
  api: CrudApi<TDto, TForm>
  columns: CrudColumn<TDto>[]
  fields: CrudField[]
  emptyForm: CrudFormState
  toFormState: (dto: TDto) => CrudFormState
  serialize: (form: CrudFormState) => TForm
  matchesSearch: (item: TDto, search: string) => boolean
  newButtonLabel?: string
  searchPlaceholder?: string
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

/** true si el item tiene un campo "estado" (la convención de baja lógica de todo el sistema:
 * "AC"/"IN") y está dado de baja. Con un try/catch por si algún TDto no tiene ese campo. */
function estaDadoDeBaja(item: unknown): boolean {
  return typeof item === 'object' && item !== null && 'estado' in item && (item as { estado?: unknown }).estado === 'IN'
}

export function SimpleCrudPage<TDto extends { id: number }, TForm>({
  title,
  queryKey,
  api,
  columns,
  fields,
  emptyForm,
  toFormState,
  serialize,
  matchesSearch,
  newButtonLabel = 'Nuevo',
  searchPlaceholder = 'Buscar…',
}: SimpleCrudPageProps<TDto, TForm>) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [itemEnEdicion, setItemEnEdicion] = useState<TDto | null>(null)
  const [form, setForm] = useState<CrudFormState>(emptyForm)
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null)
  const [itemAEliminar, setItemAEliminar] = useState<TDto | null>(null)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const query = useQuery({ queryKey: [queryKey], queryFn: () => api.search() })

  const filtrados = useMemo(() => {
    // Sin este filtro, un registro dado de baja (Estado="IN") se seguía viendo en la lista
    // para siempre — la baja lógica funcionaba en la base, pero nunca se notaba porque la
    // lista igual lo mostraba (parecía que "no eliminaba").
    const data = (query.data ?? []).filter((item) => !estaDadoDeBaja(item))
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return data
    return data.filter((item) => matchesSearch(item, texto))
  }, [query.data, busqueda, matchesSearch])

  const guardarMutation = useMutation({
    mutationFn: () => {
      const payload = serialize(form)
      return itemEnEdicion ? api.update(itemEnEdicion.id, payload) : api.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      cerrarDialog()
    },
    onError: (err) => setErrorMutacion(getErrorMessage(err)),
  })

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => api.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      setItemAEliminar(null)
    },
    onError: (err) => setErrorEliminar(getErrorMessage(err)),
  })

  function abrirNuevo() {
    setItemEnEdicion(null)
    setForm(emptyForm)
    setErrorMutacion(null)
    setDialogAbierto(true)
  }

  function abrirEdicion(item: TDto) {
    setItemEnEdicion(item)
    setForm(toFormState(item))
    setErrorMutacion(null)
    setDialogAbierto(true)
  }

  function cerrarDialog() {
    setDialogAbierto(false)
  }

  function actualizarCampo(key: string, valor: string) {
    setForm((prev) => ({ ...prev, [key]: valor }))
  }

  const requiredMissing = fields.some((f) => f.required && !form[f.key]?.trim())

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={abrirNuevo}>
          {newButtonLabel}
        </Button>
      </Stack>

      <TextField
        placeholder={searchPlaceholder}
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

      {query.isError && <Alert severity="error">{getErrorMessage(query.error)}</Alert>}
      {errorEliminar && (
        <Alert severity="error" onClose={() => setErrorEliminar(null)}>
          {errorEliminar}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.key}>{c.label}</TableCell>
              ))}
              <TableCell align="right" sx={stickyActionsSx}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}

            {!query.isLoading && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Sin resultados para mostrar.</Typography>
                </TableCell>
              </TableRow>
            )}

            {filtrados.map((item) => (
              <TableRow key={item.id} hover>
                {columns.map((c) => (
                  <TableCell key={c.key}>{c.render ? c.render(item) : formatCell(item[c.key])}</TableCell>
                ))}
                <TableCell align="right" sx={stickyActionsSx}>
                  <IconButton size="small" onClick={() => abrirEdicion(item)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={eliminarMutation.isPending}
                    onClick={() => {
                      setErrorEliminar(null)
                      setItemAEliminar(item)
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
        <DialogTitle>{itemEnEdicion ? `Editar ${title.toLowerCase()}` : newButtonLabel}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMutacion && <Alert severity="error">{errorMutacion}</Alert>}
            {fields.map((f) =>
              f.type === 'checkbox' ? (
                <div key={f.key}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form[f.key] === 'true'}
                        onChange={(e) => actualizarCampo(f.key, e.target.checked ? 'true' : 'false')}
                      />
                    }
                    label={f.label}
                  />
                  {f.helperText && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -0.5 }}>
                      {f.helperText}
                    </Typography>
                  )}
                </div>
              ) : (
                <TextField
                  key={f.key}
                  label={f.label}
                  required={f.required}
                  fullWidth
                  select={f.type === 'select'}
                  multiline={f.multiline}
                  minRows={f.multiline ? 2 : undefined}
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={form[f.key] ?? ''}
                  onChange={(e) => actualizarCampo(f.key, e.target.value)}
                  helperText={f.helperText}
                >
                  {f.type === 'select' &&
                    (f.options ?? []).map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                </TextField>
              ),
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarDialog}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={guardarMutation.isPending || requiredMissing}
            onClick={() => guardarMutation.mutate()}
          >
            {guardarMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!itemAEliminar}
        titulo={`Eliminar ${title.toLowerCase()}`}
        mensaje={
          itemAEliminar
            ? `¿Seguro que querés eliminar "${columns[0] ? formatCell(itemAEliminar[columns[0].key]) : itemAEliminar.id}"?`
            : ''
        }
        confirmando={eliminarMutation.isPending}
        onConfirmar={() => itemAEliminar && eliminarMutation.mutate(itemAEliminar.id)}
        onCancelar={() => setItemAEliminar(null)}
      />
    </Stack>
  )
}
