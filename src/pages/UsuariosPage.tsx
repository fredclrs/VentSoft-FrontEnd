import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
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
import { usuariosApi } from '../api/usuarios'
import { getErrorMessage } from '../api/errors'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { stickyActionsSx } from '../utils/tableStyles'
import { useIsMobile } from '../hooks/useIsMobile'
import { OPCIONES_PERMISOS } from '../types/permisos'
import type { Usuario, UsuarioFormValues } from '../types/usuario'

const USUARIOS_QUERY_KEY = ['usuarios'] as const

const USUARIO_VACIO: UsuarioFormValues = {
  nombre: '',
  documentoIdentidad: '',
  nit: '',
  direccion: '',
  zona: '',
  telefono: '',
  correo: '',
  nota: '',
  nombreUsuario: '',
  esAdministrador: false,
  permisos: '',
  contrasena: '',
}

function listaPermisos(permisos: string): string[] {
  return permisos
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
}

function descripcionAcceso(usuario: Usuario): string {
  if (usuario.esAdministrador) return 'Administrador (todo)'
  const claves = new Set(listaPermisos(usuario.permisos))
  const etiquetas = OPCIONES_PERMISOS.filter((o) => claves.has(o.value)).map((o) => o.label)
  return etiquetas.length > 0 ? etiquetas.join(', ') : 'Sin permisos'
}

export function UsuariosPage() {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<Usuario | null>(null)
  const [form, setForm] = useState<UsuarioFormValues>(USUARIO_VACIO)
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null)
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<Usuario | null>(null)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const usuariosQuery = useQuery({
    queryKey: USUARIOS_QUERY_KEY,
    queryFn: () => usuariosApi.search(),
  })

  const filtrados = useMemo(() => {
    const data = usuariosQuery.data ?? []
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return data
    return data.filter(
      (u) =>
        u.nombre.toLowerCase().includes(texto) ||
        u.nombreUsuario.toLowerCase().includes(texto) ||
        u.documentoIdentidad.toLowerCase().includes(texto),
    )
  }, [usuariosQuery.data, busqueda])

  const guardarMutation = useMutation({
    mutationFn: () => {
      const payload: UsuarioFormValues = {
        ...form,
        telefono: form.telefono,
      }
      return usuarioEnEdicion ? usuariosApi.update(usuarioEnEdicion.id, payload) : usuariosApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USUARIOS_QUERY_KEY })
      cerrarDialog()
    },
    onError: (err) => setErrorMutacion(getErrorMessage(err)),
  })

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => usuariosApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USUARIOS_QUERY_KEY })
      setUsuarioAEliminar(null)
    },
    onError: (err) => setErrorEliminar(getErrorMessage(err)),
  })

  function abrirNuevo() {
    setUsuarioEnEdicion(null)
    setForm(USUARIO_VACIO)
    setErrorMutacion(null)
    setDialogAbierto(true)
  }

  function abrirEdicion(usuario: Usuario) {
    setUsuarioEnEdicion(usuario)
    setForm({
      nombre: usuario.nombre,
      documentoIdentidad: usuario.documentoIdentidad,
      nit: usuario.nit ?? '',
      direccion: usuario.direccion ?? '',
      zona: usuario.zona ?? '',
      telefono: usuario.telefono?.toString() ?? '',
      correo: usuario.correo ?? '',
      nota: usuario.nota ?? '',
      nombreUsuario: usuario.nombreUsuario,
      esAdministrador: usuario.esAdministrador,
      permisos: usuario.permisos,
      contrasena: '',
    })
    setErrorMutacion(null)
    setDialogAbierto(true)
  }

  function cerrarDialog() {
    setDialogAbierto(false)
  }

  function actualizarCampo(campo: keyof UsuarioFormValues, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function alternarPermiso(permiso: string, marcado: boolean) {
    setForm((prev) => {
      const actuales = new Set(listaPermisos(prev.permisos))
      if (marcado) actuales.add(permiso)
      else actuales.delete(permiso)
      return { ...prev, permisos: Array.from(actuales).join(',') }
    })
  }

  const permisosSeleccionados = useMemo(() => new Set(listaPermisos(form.permisos)), [form.permisos])

  const faltaContrasena = !usuarioEnEdicion && !form.contrasena.trim()
  const camposObligatoriosCompletos = form.nombre.trim() && form.documentoIdentidad.trim() && form.nombreUsuario.trim()

  return (
    <Stack spacing={3}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Usuarios
        </Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={abrirNuevo}>
          Nuevo usuario
        </Button>
      </Stack>

      <TextField
        placeholder="Buscar por nombre, usuario o documento…"
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

      {usuariosQuery.isError && <Alert severity="error">{getErrorMessage(usuariosQuery.error)}</Alert>}
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
              <TableCell>Usuario</TableCell>
              <TableCell>Acceso</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell>Zona</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right" sx={stickyActionsSx}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuariosQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            )}

            {!usuariosQuery.isLoading && filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Sin usuarios para mostrar.</Typography>
                </TableCell>
              </TableRow>
            )}

            {filtrados.map((usuario) => (
              <TableRow key={usuario.id} hover>
                <TableCell>{usuario.nombre}</TableCell>
                <TableCell>{usuario.nombreUsuario}</TableCell>
                <TableCell>{descripcionAcceso(usuario)}</TableCell>
                <TableCell>{usuario.documentoIdentidad}</TableCell>
                <TableCell>{usuario.zona || '—'}</TableCell>
                <TableCell>{usuario.correo || '—'}</TableCell>
                <TableCell>{usuario.estado}</TableCell>
                <TableCell align="right" sx={stickyActionsSx}>
                  <IconButton size="small" onClick={() => abrirEdicion(usuario)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={eliminarMutation.isPending}
                    onClick={() => {
                      setErrorEliminar(null)
                      setUsuarioAEliminar(usuario)
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
        <DialogTitle>{usuarioEnEdicion ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMutacion && <Alert severity="error">{errorMutacion}</Alert>}
            <TextField
              label="Nombre completo"
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
                label="Usuario (para iniciar sesión)"
                required
                fullWidth
                value={form.nombreUsuario}
                onChange={(e) => actualizarCampo('nombreUsuario', e.target.value)}
                autoComplete="off"
              />
              <TextField
                label={usuarioEnEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                required={!usuarioEnEdicion}
                type="password"
                fullWidth
                value={form.contrasena}
                onChange={(e) => actualizarCampo('contrasena', e.target.value)}
                autoComplete="new-password"
                helperText={usuarioEnEdicion ? 'Dejar vacío para no cambiarla' : undefined}
              />
            </Box>

            <Divider />

            <FormControlLabel
              control={
                <Checkbox
                  checked={form.esAdministrador}
                  onChange={(e) => setForm((prev) => ({ ...prev, esAdministrador: e.target.checked }))}
                />
              }
              label="Es administrador (acceso total, no hace falta tildar nada más)"
            />

            {!form.esAdministrador && (
              <Stack spacing={0.5}>
                <Typography variant="subtitle2">Permisos</Typography>
                <Typography variant="body2" color="text.secondary">
                  Tildá a qué puede entrar este usuario. No hay roles fijos: elegís puntualmente cada cosa.
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.5 }}>
                  {OPCIONES_PERMISOS.map((opcion) => (
                    <FormControlLabel
                      key={opcion.value}
                      sx={{ alignItems: 'flex-start', mr: 0 }}
                      control={
                        <Checkbox
                          size="small"
                          sx={{ pt: 0.5 }}
                          checked={permisosSeleccionados.has(opcion.value)}
                          onChange={(e) => alternarPermiso(opcion.value, e.target.checked)}
                        />
                      }
                      label={
                        <Stack sx={{ py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {opcion.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {opcion.descripcion}
                          </Typography>
                        </Stack>
                      }
                    />
                  ))}
                </Box>
              </Stack>
            )}

            <Divider />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Zona"
                fullWidth
                value={form.zona}
                onChange={(e) => actualizarCampo('zona', e.target.value)}
              />
              <TextField
                label="Teléfono"
                type="number"
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
              label="NIT"
              fullWidth
              value={form.nit}
              onChange={(e) => actualizarCampo('nit', e.target.value)}
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
            disabled={guardarMutation.isPending || !camposObligatoriosCompletos || faltaContrasena}
            onClick={() => guardarMutation.mutate()}
          >
            {guardarMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!usuarioAEliminar}
        titulo="Eliminar usuario"
        mensaje={`¿Seguro que querés eliminar a "${usuarioAEliminar?.nombre}"? Ya no va a poder iniciar sesión, pero su historial de ventas/movimientos queda intacto.`}
        confirmando={eliminarMutation.isPending}
        onConfirmar={() => usuarioAEliminar && eliminarMutation.mutate(usuarioAEliminar.id)}
        onCancelar={() => setUsuarioAEliminar(null)}
      />
    </Stack>
  )
}
