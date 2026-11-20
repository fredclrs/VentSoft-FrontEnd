import { SimpleCrudPage } from '../components/crud/SimpleCrudPage'
import { promocionesApi } from '../api/promociones'
import type { Promocion, PromocionFormValues } from '../types/promocion'

function numeroOUndefined(valor: string): number | undefined {
  if (!valor.trim()) return undefined
  const n = Number(valor)
  return Number.isNaN(n) ? undefined : n
}

export function PromocionesPage() {
  return (
    <SimpleCrudPage<Promocion, PromocionFormValues>
      title="Promociones"
      queryKey="promociones"
      api={promocionesApi}
      newButtonLabel="Nueva promoción"
      searchPlaceholder="Buscar por nombre…"
      columns={[
        { key: 'nombrePromocion', label: 'Nombre' },
        {
          key: 'cantidadPromo',
          label: 'Por cantidad',
          render: (p) => {
            if (!p.cantidadPromo || !p.precioPromo) return '—'
            return p.esPrecioPorMayor
              ? `Desde ${p.cantidadPromo}: ${p.precioPromo.toFixed(2)} c/u`
              : `${p.cantidadPromo} x ${p.precioPromo.toFixed(2)}`
          },
        },
        {
          key: 'descuentoPorcentaje',
          label: 'Descuento %',
          render: (p) => (p.descuentoPorcentaje ? `${p.descuentoPorcentaje}%` : '—'),
        },
        {
          key: 'descuentoMonetario',
          label: 'Descuento $',
          render: (p) => (p.descuentoMonetario ? p.descuentoMonetario.toFixed(2) : '—'),
        },
        { key: 'estado', label: 'Estado' },
      ]}
      fields={[
        { key: 'nombrePromocion', label: 'Nombre', required: true },
        {
          key: 'tipoCantidad',
          label: 'Tipo de promo por cantidad',
          type: 'select',
          options: [
            { value: 'grupo', label: 'Lleva N y paga un total (ej. 2 x 500)' },
            { value: 'mayor', label: 'Precio por mayor (ej. desde 3, cada una a 450)' },
          ],
          helperText:
            '2 x 500: si llevan 3, se cobran 2 a 500 y 1 a precio normal. ' +
            'Por mayor: si llegan a la cantidad, TODAS van al precio rebajado.',
        },
        {
          key: 'cantidadPromo',
          label: 'Cantidad',
          type: 'number',
          helperText: '"2 x 500" → 2.  "Desde 3 a 450" → 3.',
        },
        {
          key: 'precioPromo',
          label: 'Precio',
          type: 'number',
          helperText: '"2 x 500" → 500 (por las 2 juntas).  "Desde 3 a 450" → 450 (cada una).',
        },
        { key: 'descuentoPorcentaje', label: 'Descuento (%)', type: 'number' },
        { key: 'descuentoMonetario', label: 'Descuento (monto fijo por unidad)', type: 'number' },
        { key: 'descripcion', label: 'Descripción', multiline: true },
      ]}
      emptyForm={{
        nombrePromocion: '',
        tipoCantidad: 'grupo',
        cantidadPromo: '',
        precioPromo: '',
        descuentoPorcentaje: '',
        descuentoMonetario: '',
        descripcion: '',
      }}
      toFormState={(p) => ({
        nombrePromocion: p.nombrePromocion,
        tipoCantidad: p.esPrecioPorMayor ? 'mayor' : 'grupo',
        cantidadPromo: p.cantidadPromo?.toString() ?? '',
        precioPromo: p.precioPromo?.toString() ?? '',
        descuentoPorcentaje: p.descuentoPorcentaje?.toString() ?? '',
        descuentoMonetario: p.descuentoMonetario?.toString() ?? '',
        descripcion: p.descripcion ?? '',
      })}
      serialize={(form) => ({
        nombrePromocion: form.nombrePromocion,
        cantidadPromo: numeroOUndefined(form.cantidadPromo),
        precioPromo: numeroOUndefined(form.precioPromo),
        esPrecioPorMayor: form.tipoCantidad === 'mayor',
        descuentoPorcentaje: numeroOUndefined(form.descuentoPorcentaje),
        descuentoMonetario: numeroOUndefined(form.descuentoMonetario),
        descripcion: form.descripcion || undefined,
      })}
      matchesSearch={(item, texto) => item.nombrePromocion.toLowerCase().includes(texto)}
    />
  )
}
