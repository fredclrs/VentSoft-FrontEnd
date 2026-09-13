import { SimpleCrudPage } from '../components/crud/SimpleCrudPage'
import { formasDePagoApi } from '../api/formasDePago'
import type { FormaDePago, FormaDePagoFormValues } from '../types/formaDePago'

export function FormasDePagoPage() {
  return (
    <SimpleCrudPage<FormaDePago, FormaDePagoFormValues>
      title="Formas de pago"
      queryKey="formasDePago"
      api={formasDePagoApi}
      newButtonLabel="Nueva forma de pago"
      searchPlaceholder="Buscar por nombre…"
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'esEfectivo', label: 'Es efectivo', render: (f) => (f.esEfectivo ? 'Sí' : 'No') },
        { key: 'estado', label: 'Estado' },
      ]}
      fields={[
        { key: 'nombre', label: 'Nombre', required: true },
        {
          key: 'esEfectivo',
          label: 'Es efectivo',
          type: 'checkbox',
          helperText:
            'Tildala en la forma de pago que sea plata física en la caja (ej. "Efectivo"). Las demás (tarjeta, QR, transferencia) dejalas destildadas — el reporte "Ventas del día" las separa usando esto.',
        },
      ]}
      emptyForm={{ nombre: '', esEfectivo: 'false' }}
      toFormState={(f) => ({ nombre: f.nombre, esEfectivo: f.esEfectivo ? 'true' : 'false' })}
      serialize={(form) => ({ nombre: form.nombre, esEfectivo: form.esEfectivo === 'true' })}
      matchesSearch={(item, texto) => item.nombre.toLowerCase().includes(texto)}
    />
  )
}
