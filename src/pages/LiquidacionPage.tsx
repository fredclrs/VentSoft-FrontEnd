import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
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
import { getEntregasPendientesByCliente } from '../api/entregasBien'
import { getDeudaCliente } from '../api/cobros'
import { registrarLiquidacion } from '../api/liquidaciones'
import { getErrorMessage } from '../api/errors'
import { imprimirNotaLiquidacion } from '../utils/notaLiquidacion'
import { useAuth } from '../auth/AuthContext'
import { useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import type { Cliente } from '../types/cliente'
import type { RegistrarDetalleLiquidacion } from '../types/liquidacion'

/** Liquidación de entregas pendientes de un cliente: se les fija el precio definitivo y se
 * aplican contra su deuda general (como un Cobro, pero en especie en vez de efectivo). */
export function LiquidacionPage() {
  const { usuario } = useAuth()
  const { nombreNegocio, simboloMoneda, money } = useConfiguracionEmpresa()
  const queryClient = useQueryClient()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [incluidas, setIncluidas] = useState<Record<number, boolean>>({})
  const [precios, setPrecios] = useState<Record<number, string>>({})
  const [devolverEnEfectivo, setDevolverEnEfectivo] = useState(true)
  const [nota, setNota] = useState('')
  const [imprimirComprobante, setImprimirComprobante] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const tiposBienQuery = useQuery({ queryKey: ['tiposBien'], queryFn: () => tiposBienApi.search() })
  const tipoBienPorId = useMemo(
    () => new Map((tiposBienQuery.data ?? []).map((t) => [t.id, t])),
    [tiposBienQuery.data],
  )

  const pendientesQuery = useQuery({
    queryKey: ['entregasBien', 'pendientesByCliente', cliente?.id],
    queryFn: () => getEntregasPendientesByCliente(cliente!.id),
    enabled: !!cliente,
  })
  const pendientes = useMemo(() => pendientesQuery.data ?? [], [pendientesQuery.data])

  const deudaQuery = useQuery({
    queryKey: ['reportes', 'deudaCliente', cliente?.id],
    queryFn: () => getDeudaCliente(cliente!.id),
    enabled: !!cliente,
  })
  const deuda = deudaQuery.data?.deudaActual ?? 0

  const totalEntregado = useMemo(
    () =>
      pendientes.reduce((acc, e) => {
        if (!incluidas[e.id]) return acc
        const precio = Number(precios[e.id]) || 0
        return acc + e.cantidad * precio
      }, 0),
    [pendientes, incluidas, precios],
  )

  const hayIncluidas = pendientes.some((e) => incluidas[e.id])

  // Nunca genera deuda nueva: solo reduce lo que ya se debe, o deja sobrante a favor del cliente.
  const preview = useMemo(() => {
    const deudaActual = Math.max(0, deuda - totalEntregado)
    const sobrante = Math.max(0, totalEntregado - deuda)
    return { deudaActual, sobrante }
  }, [deuda, totalEntregado])

  // Cada entrega incluida necesita su precio cargado para poder confirmar.
  const faltaPrecio = pendientes.some((e) => incluidas[e.id] && !(Number(precios[e.id]) > 0))

  // Cantidad total de lo incluido, agrupada por tipo de bien — no se suman kg con toneladas,
  // cada tipo mantiene su propia unidad de medida.
  const totalesPorTipo = useMemo(() => {
    const mapa = new Map<number, number>()
    pendientes.forEach((e) => {
      if (!incluidas[e.id]) return
      mapa.set(e.idTipoBien, (mapa.get(e.idTipoBien) ?? 0) + e.cantidad)
    })
    return Array.from(mapa.entries()).map(([idTipoBien, cantidad]) => ({
      idTipoBien,
      cantidad,
      tipo: tipoBienPorId.get(idTipoBien),
    }))
  }, [pendientes, incluidas, tipoBienPorId])

  function limpiar() {
    setIncluidas({})
    setPrecios({})
    setDevolverEnEfectivo(true)
    setNota('')
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!cliente || !usuario) throw new Error('Faltan datos.')

      const entregas: RegistrarDetalleLiquidacion[] = pendientes
        .filter((e) => incluidas[e.id])
        .map((e) => ({ idEntrega: e.id, precioUnitario: Number(precios[e.id]) }))

      if (entregas.length === 0) throw new Error('Incluí al menos una entrega.')

      return registrarLiquidacion({
        idCliente: cliente.id,
        idUsuario: usuario.id,
        nota: nota || undefined,
        entregas,
        devolverEnEfectivo,
      })
    },
    onSuccess: (liquidacion) => {
      queryClient.invalidateQueries({ queryKey: ['entregasBien'] })
      queryClient.invalidateQueries({ queryKey: ['reportes', 'deudaCliente', cliente?.id] })

      if (imprimirComprobante) {
        imprimirNotaLiquidacion({
          nombreNegocio,
          simboloMoneda,
          id: liquidacion.id,
          fecha: liquidacion.fecha,
          cliente: cliente!.nombre,
          documentoCliente: cliente!.documentoIdentidad,
          atendidoPor: usuario!.nombre,
          nota: nota || undefined,
          items: liquidacion.entregas.map((e) => ({
            numeroBoleta: e.numeroBoleta || `#${e.id}`,
            tipoBien: tipoBienPorId.get(e.idTipoBien)?.nombre ?? `#${e.idTipoBien}`,
            cantidad: e.cantidad,
            unidadMedida: tipoBienPorId.get(e.idTipoBien)?.unidadMedida ?? '',
            precioUnitario: e.precioUnitario ?? 0,
            subtotal: e.subTotal ?? 0,
          })),
          deudaAntes: liquidacion.deudaAntes,
          totalEntregado: liquidacion.totalEntregado,
          deudaActual: liquidacion.deudaActual,
          montoDevueltoEfectivo: liquidacion.montoDevueltoEfectivo,
          saldoAFavorGenerado: liquidacion.saldoAFavorGenerado,
        })
      }

      setAviso(`Liquidación #${liquidacion.id} registrada correctamente.`)
      limpiar()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Liquidación
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Elegí las entregas pendientes a incluir, fijales el precio y aplicalas contra la deuda del cliente.
        </Typography>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ maxWidth: 420 }}>
        <EntityAutocomplete
          label="Cliente (nombre o documento)"
          size="small"
          queryKey="clientes-autocomplete-liquidacion"
          searchFn={buscarClientesTexto}
          getLabel={(c: Cliente) => c.nombre}
          getSecondaryLabel={(c: Cliente) => c.documentoIdentidad}
          getId={(c: Cliente) => c.id}
          value={cliente}
          onChange={(c) => {
            setCliente(c)
            limpiar()
          }}
        />
      </Box>

      {cliente && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Deuda actual del cliente
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }} color={deuda > 0 ? 'warning.main' : 'success.main'}>
                {deudaQuery.isLoading ? '…' : money(deuda)}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, textAlign: { sm: 'right' } }}>
              <Typography variant="body2" color="text.secondary">
                Saldo a favor
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }} color={preview.sobrante > 0 ? 'info.main' : 'warning.main'}>
                {preview.sobrante > 0 ? `Saldo a favor: ${money(preview.sobrante)}` : 'Sin saldo a favor'}
              </Typography>
            </Paper>
          </Box>

          {pendientesQuery.isLoading && (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Paper>
          )}

          {!pendientesQuery.isLoading && pendientes.length === 0 && (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                Este cliente no tiene entregas pendientes de liquidar.
              </Typography>
            </Paper>
          )}

          {pendientes.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center">Incluir</TableCell>
                    <TableCell>N° referencia</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo de bien</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Precio unit.</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendientes.map((e) => {
                    const tipo = tipoBienPorId.get(e.idTipoBien)
                    const marcada = incluidas[e.id] ?? false
                    const precio = precios[e.id] ?? (e.precioUnitario != null ? String(e.precioUnitario) : '')
                    return (
                      <TableRow key={e.id}>
                        <TableCell align="center">
                          <Checkbox
                            size="small"
                            checked={marcada}
                            onChange={(ev) => setIncluidas((prev) => ({ ...prev, [e.id]: ev.target.checked }))}
                          />
                        </TableCell>
                        <TableCell>{e.numeroBoleta || `#${e.id}`}</TableCell>
                        <TableCell>{new Date(e.fecha).toLocaleDateString()}</TableCell>
                        <TableCell>{tipo?.nombre ?? `#${e.idTipoBien}`}</TableCell>
                        <TableCell align="right">
                          {e.cantidad} {tipo?.unidadMedida ?? ''}
                        </TableCell>
                        <TableCell align="right" sx={{ width: 130 }}>
                          <TextField
                            size="small"
                            type="number"
                            disabled={!marcada}
                            value={precio}
                            onChange={(ev) => setPrecios((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                            slotProps={{ htmlInput: { min: 0, style: { textAlign: 'right' } } }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {marcada ? money(e.cantidad * (Number(precio) || 0)) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {hayIncluidas && (
            <>
              <Divider />

              <Stack spacing={0.5}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Cantidad total por tipo de bien
                </Typography>
                {totalesPorTipo.map((t) => (
                  <Stack key={t.idTipoBien} direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t.tipo?.nombre ?? `#${t.idTipoBien}`}
                    </Typography>
                    <Typography variant="body2">
                      {t.cantidad} {t.tipo?.unidadMedida ?? ''}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Divider />

              <Stack spacing={1}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>Total entregado</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{money(totalEntregado)}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>Deuda actual</Typography>
                  <Typography color={deuda > 0 ? 'warning.main' : 'success.main'}>{money(deuda)}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography>Deuda después de liquidar</Typography>
                  <Typography color={preview.deudaActual > 0 ? 'warning.main' : 'success.main'} sx={{ fontWeight: 700 }}>
                    {money(preview.deudaActual)}
                  </Typography>
                </Stack>

                {preview.sobrante > 0 && (
                  <RadioGroup
                    value={devolverEnEfectivo ? 'efectivo' : 'credito'}
                    onChange={(e) => setDevolverEnEfectivo(e.target.value === 'efectivo')}
                  >
                    <FormControlLabel value="efectivo" control={<Radio size="small" />} label="Devolver en efectivo ahora" />
                    <FormControlLabel
                      value="credito"
                      control={<Radio size="small" />}
                      label="Dejar como saldo a favor para su próxima compra"
                    />
                  </RadioGroup>
                )}
              </Stack>
            </>
          )}

          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <TextField label="Nota (opcional)" size="small" fullWidth value={nota} onChange={(e) => setNota(e.target.value)} />
            <FormControlLabel
              control={<Checkbox checked={imprimirComprobante} onChange={(e) => setImprimirComprobante(e.target.checked)} />}
              label="Imprimir comprobante"
              sx={{ whiteSpace: 'nowrap' }}
            />
          </Stack>

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              disabled={mutation.isPending || !hayIncluidas || faltaPrecio}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Guardando…' : 'Confirmar liquidación'}
            </Button>
          </Stack>
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
