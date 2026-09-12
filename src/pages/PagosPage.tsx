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
import { buscarProveedoresTexto } from '../api/proveedores'
import { registrarPago, getDeudaProveedor, getPagosByProveedor } from '../api/pagos'
import { useAuth } from '../auth/AuthContext'
import { getErrorMessage } from '../api/errors'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import type { Proveedor } from '../types/proveedor'

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PagosPage() {
  const { usuario } = useAuth()
  const { money } = useConfiguracionEmpresa()
  const queryClient = useQueryClient()
  const [proveedor, setProveedor] = useState<Proveedor | null>(null)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [errorMutacion, setErrorMutacion] = useState<string | null>(null)

  const [fecha, setFecha] = useState(hoyISO())
  const [monto, setMonto] = useState('')
  const [recibo, setRecibo] = useState('')
  const [nota, setNota] = useState('')

  const deudaQuery = useQuery({
    queryKey: ['pagos', 'deuda', proveedor?.id],
    queryFn: () => getDeudaProveedor(proveedor!.id),
    enabled: !!proveedor,
  })

  const historialQuery = useQuery({
    queryKey: ['pagos', 'byProveedor', proveedor?.id],
    queryFn: () => getPagosByProveedor(proveedor!.id),
    enabled: !!proveedor,
  })

  const registrarMutation = useMutation({
    mutationFn: () => {
      if (!proveedor || !usuario) throw new Error('Falta seleccionar un proveedor.')
      return registrarPago({
        fecha: new Date(fecha).toISOString(),
        monto: Number(monto) || 0,
        recibo: recibo || undefined,
        nota: nota || undefined,
        idProveedor: proveedor.id,
        idUsuario: usuario.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos', 'deuda', proveedor?.id] })
      queryClient.invalidateQueries({ queryKey: ['pagos', 'byProveedor', proveedor?.id] })
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
        Pagos
      </Typography>

      <Box sx={{ maxWidth: 420 }}>
        <EntityAutocomplete
          label="Buscar proveedor por nombre o NIT…"
          queryKey="proveedores-autocomplete-pagos"
          searchFn={buscarProveedoresTexto}
          getLabel={(p: Proveedor) => p.nombre}
          getSecondaryLabel={(p: Proveedor) => p.nit ?? undefined}
          getId={(p: Proveedor) => p.id}
          value={proveedor}
          onChange={setProveedor}
        />
      </Box>

      {!proveedor && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Elegí un proveedor para ver su deuda e historial de pagos.</Typography>
        </Paper>
      )}

      {proveedor && (
        <>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Deuda actual con {proveedor.nombre}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700 }}
                  color={deudaQuery.data && deudaQuery.data.deudaActual > 0 ? 'warning.main' : 'success.main'}
                >
                  {deudaQuery.isLoading ? '…' : money(deudaQuery.data?.deudaActual ?? 0)}
                </Typography>
              </Box>
              <Button startIcon={<AddIcon />} variant="contained" onClick={abrirNuevo}>
                Registrar pago
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
                  <TableCell align="right">Deuda luego del pago</TableCell>
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
                      <Typography color="text.secondary">Todavía no tiene pagos registrados.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {(historialQuery.data ?? []).map((pago) => (
                  <TableRow key={pago.id} hover>
                    <TableCell>{new Date(pago.fecha).toLocaleDateString()}</TableCell>
                    <TableCell align="right">{money(pago.monto)}</TableCell>
                    <TableCell>{pago.recibo || '—'}</TableCell>
                    <TableCell align="right">{money(pago.deudaActual)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={dialogAbierto} onClose={cerrarDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar pago — {proveedor?.nombre}</DialogTitle>
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
