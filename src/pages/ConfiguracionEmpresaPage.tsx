import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SaveIcon from '@mui/icons-material/SaveOutlined'
import { EntityAutocomplete } from '../components/EntityAutocomplete'
import { actualizarConfiguracionEmpresa } from '../api/configuracionEmpresa'
import { buscarClientesTexto } from '../api/clientes'
import { buscarProveedoresTexto } from '../api/proveedores'
import { getErrorMessage } from '../api/errors'
import { CONFIGURACION_EMPRESA_QUERY_KEY, useConfiguracionEmpresa } from '../hooks/useConfiguracionEmpresa'
import type { Cliente } from '../types/cliente'
import type { Proveedor } from '../types/proveedor'

export function ConfiguracionEmpresaPage() {
  const queryClient = useQueryClient()
  const configuracionQuery = useConfiguracionEmpresa()
  const [nombre, setNombre] = useState('')
  const [moneda, setMoneda] = useState('')
  const [permiteVentaACredito, setPermiteVentaACredito] = useState(true)
  const [permiteCompraACredito, setPermiteCompraACredito] = useState(true)
  const [clientePorDefecto, setClientePorDefecto] = useState<Cliente | null>(null)
  const [proveedorPorDefecto, setProveedorPorDefecto] = useState<Proveedor | null>(null)
  const [guardadoOk, setGuardadoOk] = useState(false)

  // Cuando llega la configuración guardada, precarga los campos (solo la primera vez que llega).
  useEffect(() => {
    if (configuracionQuery.data) {
      setNombre(configuracionQuery.data.nombre)
      setMoneda(configuracionQuery.data.moneda)
      setPermiteVentaACredito(configuracionQuery.data.permiteVentaACredito)
      setPermiteCompraACredito(configuracionQuery.data.permiteCompraACredito)
      setClientePorDefecto(configuracionQuery.data.clientePorDefecto ?? null)
      setProveedorPorDefecto(configuracionQuery.data.proveedorPorDefecto ?? null)
    }
  }, [configuracionQuery.data])

  const guardarMutation = useMutation({
    mutationFn: actualizarConfiguracionEmpresa,
    onSuccess: () => {
      // La barra superior, los comprobantes y las pantallas de Ventas/Compras usan la misma
      // query: al invalidar, se actualizan solas en cuanto se guarda, sin recargar la página.
      queryClient.invalidateQueries({ queryKey: CONFIGURACION_EMPRESA_QUERY_KEY })
      setGuardadoOk(true)
    },
  })

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Datos del negocio
        </Typography>
        <Typography variant="body2" color="text.secondary">
          El nombre configurado acá aparece en la barra superior del sistema y en todos los
          comprobantes y reportes que se imprimen. La moneda se usa en todos los precios y
          montos que se muestran o imprimen.
        </Typography>
      </div>

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 560 }}>
        {configuracionQuery.isLoading ? (
          <Stack sx={{ alignItems: 'center', py: 2 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <Stack spacing={2}>
            {configuracionQuery.isError && (
              <Alert severity="error">{getErrorMessage(configuracionQuery.error)}</Alert>
            )}
            {guardarMutation.isError && (
              <Alert severity="error">{getErrorMessage(guardarMutation.error)}</Alert>
            )}
            {guardadoOk && !guardarMutation.isPending && (
              <Alert severity="success" onClose={() => setGuardadoOk(false)}>
                Datos actualizados correctamente.
              </Alert>
            )}

            <TextField
              label="Nombre del negocio"
              fullWidth
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                setGuardadoOk(false)
              }}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' }, gap: 2 }}>
              <TextField
                label="Símbolo de moneda"
                fullWidth
                value={moneda}
                onChange={(e) => {
                  setMoneda(e.target.value)
                  setGuardadoOk(false)
                }}
                placeholder="Bs."
                helperText="Ej: Bs., $, U$S, S/., €"
                slotProps={{ htmlInput: { maxLength: 10 } }}
              />
            </Box>

            <Divider sx={{ my: 1 }} />

            <div>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={permiteVentaACredito}
                    onChange={(e) => {
                      setPermiteVentaACredito(e.target.checked)
                      setGuardadoOk(false)
                    }}
                  />
                }
                label="Este negocio vende a crédito"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -0.5 }}>
                {permiteVentaACredito
                  ? 'Se puede dejar una venta parcial o totalmente pendiente de pago.'
                  : 'Solo se vende al contado: en Ventas, el check "Contado" queda siempre marcado y nadie va a poder desmarcarlo.'}
              </Typography>
            </div>

            <div>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={permiteCompraACredito}
                    onChange={(e) => {
                      setPermiteCompraACredito(e.target.checked)
                      setGuardadoOk(false)
                    }}
                  />
                }
                label="Este negocio compra a crédito"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -0.5 }}>
                {permiteCompraACredito
                  ? 'Se puede dejar una compra parcial o totalmente pendiente de pago al proveedor.'
                  : 'Solo se compra al contado: en Compras, el check "Contado" queda siempre marcado y nadie va a poder desmarcarlo.'}
              </Typography>
            </div>

            <Divider sx={{ my: 1 }} />

            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Cliente y proveedor por defecto
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Se preseleccionan solos al entrar a Ventas y Compras, para no perder tiempo
                cargando un cliente/proveedor ocasional en temporada alta. El cajero siempre
                puede elegir otro antes de confirmar.
              </Typography>
            </div>

            <EntityAutocomplete
              label="Cliente por defecto (nombre o documento, opcional)"
              queryKey="clientes-autocomplete-configuracion"
              searchFn={buscarClientesTexto}
              getLabel={(c: Cliente) => c.nombre}
              getSecondaryLabel={(c: Cliente) => c.documentoIdentidad}
              getId={(c: Cliente) => c.id}
              value={clientePorDefecto}
              onChange={(c) => {
                setClientePorDefecto(c)
                setGuardadoOk(false)
              }}
            />

            <EntityAutocomplete
              label="Proveedor por defecto (nombre o NIT, opcional)"
              queryKey="proveedores-autocomplete-configuracion"
              searchFn={buscarProveedoresTexto}
              getLabel={(p: Proveedor) => p.nombre}
              getSecondaryLabel={(p: Proveedor) => p.nit ?? undefined}
              getId={(p: Proveedor) => p.id}
              value={proveedorPorDefecto}
              onChange={(p) => {
                setProveedorPorDefecto(p)
                setGuardadoOk(false)
              }}
            />

            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={!nombre.trim() || !moneda.trim() || guardarMutation.isPending}
                onClick={() =>
                  guardarMutation.mutate({
                    nombre: nombre.trim(),
                    moneda: moneda.trim(),
                    permiteVentaACredito,
                    permiteCompraACredito,
                    idClientePorDefecto: clientePorDefecto?.id ?? null,
                    idProveedorPorDefecto: proveedorPorDefecto?.id ?? null,
                  })
                }
              >
                {guardarMutation.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}
