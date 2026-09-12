import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
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
import { actualizarCliente, buscarClientes, crearCliente, eliminarCliente } from '../api/clientes'
import { getErrorMessage } from '../api/errors'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { stickyActionsSx } from '../utils/tableStyles'
import { useIsMobile } from '../hooks/useIsMobile'
import type { Cliente, ClienteFormValues } from '../types/cliente'

const CLIENTES_QUERY_KEY = ['clientes'] as const

const CLIENTE_VACIO: ClienteFormValues = {
  nombre: '',
  documentoIdentidad: '',
  personaContacto: '',
  direccion: '',
  zona: '',
  telefono: '',
  correo: '',
  nota: '',
}

export function ClientesPage() {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [clienteEnEdicion, setClienteEnEdicion] = useState<Cliente | null>(null)
  const [form, setForm] = useState<ClienteFormValues>(CLIENTE_VACIO)
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null)
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const clientesQuery = useQuery({
    queryKey: CLIENTES_QUERY_KEY,
    queryFn: () => buscarClientes(),
  })

  const clientesFiltrados = useMemo(() => {
    // Solo activos acá: esta búsqueda (buscarClientes) también la usan otros reportes para
    // reconocer nombres en ventas viejas, así que el filtro de "dado de baja" se hace acá y
    // no en el backend — si no, un cliente eliminado se seguía viendo en esta lista para
    // siempre (parecía que "no eliminaba", aunque la baja lógica sí se guardaba bien).
    const data = (clientesQuery.data ?? []).filter((c) => c.estado === 'AC')
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return data
    return data.filter(
      (c) =>
        c.nombre.toLowerCase().includes(texto) ||
        c.documentoIdentidad.toLowerCase().includes(texto),
    )
  }, [clientesQuery.data, busqueda])

  const guardarMutation = useMutation({
    mutationFn: () =>
      clienteEnEdicion ? actualizarCliente(clienteEnEdicion.id, form) : crearCliente(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTES_QUERY_KEY })
      cerrarDialog()
    },
    onError: (err) => setErrorMutacion(getErrorMessage(err)),
  })

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => eliminarCliente(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTES_QUERY_KEY })
      setClienteAEliminar(null)
    },
    onError: (err) => setErrorEliminar(getErrorMessage(err)),
  })

  function abrirNuevo() {
    setClienteEnEdicion(null)
    setForm(CLIENTE_VACIO)
    setErrorMutacion(null)
    setDialogAbierto(true)
  }

  function abrirEdicion(cliente: Cliente) {
    setClienteEnEdicion(cliente)
    setForm({
      nombre: cliente.nombre,
      documentoIdentidad: cliente.documentoIdentidad,
      personaContacto: cliente.personaContacto ?? '',
      direccion: cliente.direccion ?? '',
      zona: cliente.zona ?? '',
      telefono: cliente.telefono ?? '',
      correo: cliente.correo ?? '',
      nota: cliente.nota ?? '',
    })
    setErrorMutacion(null)
    setDialogAbierto(true)
  }

  function cerrarDialog() {
    setDialogAbierto(false)
  }

  function actualizarCampo(campo: keyof ClienteFormValues, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Clientes
        </Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={abrirNuevo}>
          Nuevo cliente
        </Button>
      </Stack>

      <TextField
        placeholder="Buscar por nombre o documento…"
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

      {clientesQuery.isError && (
        <Alert severity="error">{getErrorMessage(clientesQuery.error)}</Alert>
      )}
      {errorEliminar && (
        <Alert severity="error" onClose={() => setErrorEliminar(null)}>
          {errorEliminar}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell>Zona</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell align="right" sx={stickyActionsSx}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clientesQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}

            {!clientesQuery.isLoading && clientesFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Sin clientes para mostrar.</Typography>
                </TableCell>
              </TableRow>
            )}

            {clientesFiltrados.map((cliente) => (
              <TableRow key={cliente.id} hover>
                <TableCell>{cliente.nombre}</TableCell>
                <TableCell>{cliente.documentoIdentidad}</TableCell>
                <TableCell>{cliente.zona || '—'}</TableCell>
                <TableCell>{cliente.telefono || '—'}</TableCell>
                <TableCell>{cliente.correo || '—'}</TableCell>
                <TableCell align="right" sx={stickyActionsSx}>
                  <IconButton size="small" onClick={() => abrirEdicion(cliente)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={eliminarMutation.isPending}
                    onClick={() => {
                      setErrorEliminar(null)
                      setClienteAEliminar(cliente)
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
        <DialogTitle>{clienteEnEdicion ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMutacion && <Alert severity="error">{errorMutacion}</Alert>}
            <TextField
              label="Nombre"
              required
              fullWidth
              value={form.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
            />
            <TextField
              label="Documento de identidad"
              required
              fullWidth
              value={form.documentoIdentidad}
              onChange={(e) => actualizarCampo('documentoIdentidad', e.target.value)}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Zona"
                fullWidth
                value={form.zona}
                onChange={(e) => actualizarCampo('zona', e.target.value)}
              />
              <TextField
                label="Teléfono"
                fullWidth
                value={form.telefono}
                onChange={(e) => actualizarCampo('telefono', e.target.value)}
              />
            </Box>
            <TextField
              label="Correo"
              fullWidth
              value={form.correo}
              onChange={(e) => actualizarCampo('correo', e.target.value)}
            />
            <TextField
              label="Dirección"
              fullWidth
              value={form.direccion}
              onChange={(e) => actualizarCampo('direccion', e.target.value)}
            />
            <TextField
              label="Persona de contacto"
              fullWidth
              value={form.personaContacto}
              onChange={(e) => actualizarCampo('personaContacto', e.target.value)}
            />
            <TextField
              label="Nota"
              fullWidth
              multiline
              minRows={2}
              value={form.nota}
              onChange={(e) => actualizarCampo('nota', e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarDialog}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={guardarMutation.isPending || !form.nombre || !form.documentoIdentidad}
            onClick={() => guardarMutation.mutate()}
          >
            {guardarMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!clienteAEliminar}
        titulo="Eliminar cliente"
        mensaje={`¿Seguro que querés eliminar a "${clienteAEliminar?.nombre}"? No se borra su historial de ventas, solo deja de aparecer para elegirlo en ventas nuevas.`}
        confirmando={eliminarMutation.isPending}
        onConfirmar={() => clienteAEliminar && eliminarMutation.mutate(clienteAEliminar.id)}
        onCancelar={() => setClienteAEliminar(null)}
      />
    </Stack>
  )
}
