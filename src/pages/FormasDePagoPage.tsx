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
        { key: 'porcentajeRecargo', label: '% recargo', render: (f) => (f.porcentajeRecargo ? `${f.porcentajeRecargo}%` : '—') },
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
        {
          key: 'porcentajeRecargo',
          label: '% de recargo (opcional)',
          type: 'number',
          helperText:
            'Si cobrar con esta forma de pago le genera un costo al negocio (ej. Transferencia), cargá acá el % — en Ventas se sugiere sumarlo al total, y se puede ajustar en el momento. Dejalo vacío si no aplica.',
        },
      ]}
      emptyForm={{ nombre: '', esEfectivo: 'false', porcentajeRecargo: '' }}
      toFormState={(f) => ({
        nombre: f.nombre,
        esEfectivo: f.esEfectivo ? 'true' : 'false',
        porcentajeRecargo: f.porcentajeRecargo != null ? String(f.porcentajeRecargo) : '',
      })}
      serialize={(form) => ({
        nombre: form.nombre,
        esEfectivo: form.esEfectivo === 'true',
        porcentajeRecargo: form.porcentajeRecargo.trim() === '' ? undefined : Number(form.porcentajeRecargo),
      })}
      matchesSearch={(item, texto) => item.nombre.toLowerCase().includes(texto)}
    />
  )
}
