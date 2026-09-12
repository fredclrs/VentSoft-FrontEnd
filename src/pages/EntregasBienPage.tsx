import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
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
import { EntityAutocomplete } from '../components/EntityAutocomplete'
import { buscarClientesTexto } from '../api/clientes'
import { tiposBienApi } from '../api/tiposBien'
import { registrarEntregaBien, getEntregasByCliente } from '../api/entregasBien'
import { getErrorMessage } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import type { Cliente } from '../types/cliente'
import type { TipoBien } from '../types/tipoBien'

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Registro de entregas de bienes (pago en especie de una deuda, ej: grano, maquinaria). El
 * precio es opcional acá — se fija recién al liquidar (ver LiquidacionPage). */
export function EntregasBienPage() {
  const { usuario } = useAuth()
  const { money } = useConfiguracionEmpresa()
  const queryClient = useQueryClient()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [tipoBien, setTipoBien] = useState<TipoBien | null>(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [numeroBoleta, setNumeroBoleta] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [precioUnitario, setPrecioUnitario] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const tiposBienQuery = useQuery({ queryKey: ['tiposBien'], queryFn: () => tiposBienApi.search() })
  const tipoBienPorId = useMemo(
    () => new Map((tiposBienQuery.data ?? []).map((t) => [t.id, t])),
    [tiposBienQuery.data],
  )

  const entregasQuery = useQuery({
    queryKey: ['entregasBien', 'byCliente', cliente?.id],
    queryFn: () => getEntregasByCliente(cliente!.id),
    enabled: !!cliente,
  })

  const pendientes = (entregasQuery.data ?? []).filter((e) => !e.idLiquidacion)
  const liquidadas = (entregasQuery.data ?? []).filter((e) => e.idLiquidacion)

  function limpiarFormulario() {
    setTipoBien(null)
    setNumeroBoleta('')
    setCantidad('')
    setPrecioUnitario('')
    setNota('')
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!cliente || !usuario || !tipoBien) throw new Error('Faltan datos.')
      const cant = Number(cantidad)
      if (!cant || cant <= 0) throw new Error('La cantidad debe ser mayor a 0.')

      return registrarEntregaBien({
        fecha: new Date(fecha).toISOString(),
        numeroBoleta: numeroBoleta || undefined,
        cantidad: cant,
        precioUnitario: precioUnitario ? Number(precioUnitario) : undefined,
        nota: nota || undefined,
        idCliente: cliente.id,
        idUsuario: usuario.id,
        idTipoBien: tipoBien.id,
      })
    },
    onSuccess: (entrega) => {
      queryClient.invalidateQueries({ queryKey: ['entregasBien', 'byCliente', cliente?.id] })
      setAviso(`Entrega #${entrega.id} registrada correctamente.`)
      limpiarFormulario()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Entregas (pago en especie)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Registrá lo que trae el cliente. El precio es opcional acá — se fija al liquidar.
        </Typography>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ maxWidth: 420 }}>
        <EntityAutocomplete
          label="Cliente (nombre o documento)"
          size="small"
          queryKey="clientes-autocomplete-entregas"
          searchFn={buscarClientesTexto}
          getLabel={(c: Cliente) => c.nombre}
          getSecondaryLabel={(c: Cliente) => c.documentoIdentidad}
          getId={(c: Cliente) => c.id}
          value={cliente}
          onChange={setCliente}
        />
      </Box>

      {cliente && (
        <>
          <Divider />

          <Typography variant="subtitle2">Nueva entrega</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' }, gap: 1.5 }}>
            <EntityAutocomplete
              label="Tipo de bien"
              size="small"
              queryKey="tiposBien-autocomplete"
              searchFn={(texto) => tiposBienApi.search({ nombre: texto })}
              getLabel={(t: TipoBien) => `${t.nombre} (${t.unidadMedida})`}
              getId={(t: TipoBien) => t.id}
              value={tipoBien}
              onChange={setTipoBien}
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
              label="N° de referencia"
              size="small"
              fullWidth
              value={numeroBoleta}
              onChange={(e) => setNumeroBoleta(e.target.value)}
            />
            <TextField
              label={`Cantidad${tipoBien ? ` (${tipoBien.unidadMedida})` : ''}`}
              type="number"
              size="small"
              fullWidth
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr auto' }, gap: 1.5, alignItems: 'flex-start' }}>
            <TextField
              label="Precio unitario (opcional)"
              type="number"
              size="small"
              fullWidth
              value={precioUnitario}
              onChange={(e) => setPrecioUnitario(e.target.value)}
              helperText="Dejalo vacío si todavía no se sabe el precio"
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField label="Nota" size="small" fullWidth value={nota} onChange={(e) => setNota(e.target.value)} />
            <Button
              variant="contained"
              disabled={mutation.isPending || !tipoBien || !cantidad}
              onClick={() => mutation.mutate()}
              sx={{ height: 40 }}
            >
              {mutation.isPending ? 'Guardando…' : 'Registrar entrega'}
            </Button>
          </Box>

          <Divider />

          <Typography variant="subtitle2">Entregas pendientes de liquidar</Typography>
          {entregasQuery.isLoading && (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Paper>
          )}
          {!entregasQuery.isLoading && pendientes.length === 0 && (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                Este cliente no tiene entregas pendientes.
              </Typography>
            </Paper>
          )}
          {pendientes.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>N° referencia</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo de bien</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Precio</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendientes.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.numeroBoleta || `#${e.id}`}</TableCell>
                      <TableCell>{new Date(e.fecha).toLocaleDateString()}</TableCell>
                      <TableCell>{tipoBienPorId.get(e.idTipoBien)?.nombre ?? `#${e.idTipoBien}`}</TableCell>
                      <TableCell align="right">
                        {e.cantidad} {tipoBienPorId.get(e.idTipoBien)?.unidadMedida ?? ''}
                      </TableCell>
                      <TableCell align="right">{e.precioUnitario != null ? money(e.precioUnitario) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {liquidadas.length > 0 && (
            <>
              <Typography variant="subtitle2">Entregas ya liquidadas</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>N° referencia</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Tipo de bien</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Precio</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                      <TableCell align="center" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {liquidadas.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.numeroBoleta || `#${e.id}`}</TableCell>
                        <TableCell>{new Date(e.fecha).toLocaleDateString()}</TableCell>
                        <TableCell>{tipoBienPorId.get(e.idTipoBien)?.nombre ?? `#${e.idTipoBien}`}</TableCell>
                        <TableCell align="right">
                          {e.cantidad} {tipoBienPorId.get(e.idTipoBien)?.unidadMedida ?? ''}
                        </TableCell>
                        <TableCell align="right">{e.precioUnitario != null ? money(e.precioUnitario) : '—'}</TableCell>
                        <TableCell align="right">{e.subTotal != null ? money(e.subTotal) : '—'}</TableCell>
                        <TableCell align="center">
                          <Chip size="small" label="Liquidada" color="success" variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </>
      )}

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
