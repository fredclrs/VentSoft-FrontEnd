import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
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
import { EntityAutocomplete } from '../components/EntityAutocomplete'
import { buscarClientesTexto } from '../api/clientes'
import { registrarCobro, getDeudaCliente, getCobrosByCliente } from '../api/cobros'
import { useAuth } from '../auth/AuthContext'
import { getErrorMessage } from '../api/errors'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import type { Cliente } from '../types/cliente'

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function CobrosPage() {
  const { usuario } = useAuth()
  const { money } = useConfiguracionEmpresa()
  const queryClient = useQueryClient()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null)

  const [fecha, setFecha] = useState(hoyISO())
  const [monto, setMonto] = useState('')
  const [recibo, setRecibo] = useState('')
  const [nota, setNota] = useState('')

  const deudaQuery = useQuery({
    queryKey: ['cobros', 'deuda', cliente?.id],
    queryFn: () => getDeudaCliente(cliente!.id),
    enabled: !!cliente,
  })

  const historialQuery = useQuery({
    queryKey: ['cobros', 'byCliente', cliente?.id],
    queryFn: () => getCobrosByCliente(cliente!.id),
    enabled: !!cliente,
  })

  const registrarMutation = useMutation({
    mutationFn: () => {
      if (!cliente || !usuario) throw new Error('Falta seleccionar un cliente.')
      return registrarCobro({
        fecha: new Date(fecha).toISOString(),
        monto: Number(monto) || 0,
        recibo: recibo || undefined,
        nota: nota || undefined,
        idCliente: cliente.id,
        idUsuario: usuario.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobros', 'deuda', cliente?.id] })
      queryClient.invalidateQueries({ queryKey: ['cobros', 'byCliente', cliente?.id] })
      cerrarDialog()
    },
    onError: (err) => setErrorMutacion(getErrorMessage(err)),
  })

  function abrirNuevo() {
    setFecha(hoyISO())
    setMonto('')
    setRecibo('')
    setNota('')
    setErrorMutacion(null)
    setDialogAbierto(true)
  }

  function cerrarDialog() {
    setDialogAbierto(false)
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Cobros
      </Typography>

      <Box sx={{ maxWidth: 420 }}>
        <EntityAutocomplete
          label="Buscar cliente por nombre o documento…"
          queryKey="clientes-autocomplete-cobros"
          searchFn={buscarClientesTexto}
          getLabel={(c: Cliente) => c.nombre}
          getSecondaryLabel={(c: Cliente) => c.documentoIdentidad}
          getId={(c: Cliente) => c.id}
          value={cliente}
          onChange={setCliente}
        />
      </Box>

      {!cliente && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Elegí un cliente para ver su deuda e historial de cobros.</Typography>
        </Paper>
      )}

      {cliente && (
        <>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Deuda actual de {cliente.nombre}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }} color={deudaQuery.data && deudaQuery.data.deudaActual > 0 ? 'warning.main' : 'success.main'}>
                  {deudaQuery.isLoading ? '…' : money(deudaQuery.data?.deudaActual ?? 0)}
                </Typography>
              </Box>
              <Button startIcon={<AddIcon />} variant="contained" onClick={abrirNuevo}>
                Registrar cobro
              </Button>
            </Stack>
          </Paper>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell>Recibo</TableCell>
                  <TableCell align="right">Deuda luego del cobro</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historialQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                )}
                {historialQuery.isError && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Alert severity="error">{getErrorMessage(historialQuery.error)}</Alert>
                    </TableCell>
                  </TableRow>
                )}
                {!historialQuery.isLoading && (historialQuery.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">Todavía no tiene cobros registrados.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {(historialQuery.data ?? []).map((cobro) => (
                  <TableRow key={cobro.id} hover>
                    <TableCell>{new Date(cobro.fecha).toLocaleDateString()}</TableCell>
                    <TableCell align="right">{money(cobro.monto)}</TableCell>
                    <TableCell>{cobro.recibo || '—'}</TableCell>
                    <TableCell align="right">{money(cobro.deudaActual)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={dialogAbierto} onClose={cerrarDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar cobro — {cliente?.nombre}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMutacion && <Alert severity="error">{errorMutacion}</Alert>}
            <TextField
              label="Fecha"
              type="date"
              fullWidth
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Monto"
              type="number"
              required
              fullWidth
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
            <TextField label="N° de recibo" fullWidth value={recibo} onChange={(e) => setRecibo(e.target.value)} />
            <TextField label="Nota" fullWidth multiline minRows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarDialog}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={registrarMutation.isPending || !monto || Number(monto) <= 0}
            onClick={() => registrarMutation.mutate()}
          >
            {registrarMutation.isPending ? 'Registrando…' : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
