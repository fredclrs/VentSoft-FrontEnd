import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Autocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import type { SxProps, Theme } from '@mui/material/styles'

interface EntityAutocompleteProps<T> {
  label: string
  queryKey: string
  searchFn: (texto: string) => Promise<T[]>
  getLabel: (item: T) => string
  getSecondaryLabel?: (item: T) => string | undefined
  value: T | null
  onChange: (item: T | null) => void
  getId: (item: T) => number
  disabled?: boolean
  size?: 'small' | 'medium'
  /** Para ensanchar el combo cuando las opciones tienen nombres largos (por defecto lo angosto
   * que le quede al contenedor, que casi siempre es muy poco). */
  sx?: SxProps<Theme>
}

/** Autocomplete genérico con búsqueda contra la API, para elegir Cliente/Proveedor/Artículo, etc. */
export function EntityAutocomplete<T>({
  label,
  queryKey,
  searchFn,
  getLabel,
  getSecondaryLabel,
  value,
  onChange,
  getId,
  disabled,
  size = 'medium',
  sx,
}: EntityAutocompleteProps<T>) {
  const [inputValue, setInputValue] = useState('')

  const query = useQuery({
    queryKey: [queryKey, inputValue],
    queryFn: () => searchFn(inputValue),
  })

  const opciones = useMemo(() => query.data ?? [], [query.data])

  return (
    <Autocomplete
      size={size}
      sx={sx}
      disabled={disabled}
      options={opciones}
      loading={query.isFetching}
      value={value}
      onChange={(_, nuevo) => onChange(nuevo)}
      inputValue={inputValue}
      onInputChange={(_, nuevoTexto) => setInputValue(nuevoTexto)}
      isOptionEqualToValue={(a, b) => getId(a) === getId(b)}
      getOptionLabel={(item) => getLabel(item)}
      // El filtrado ya lo hace el servidor (searchFn). Sin esto, Autocomplete filtra de nuevo
      // por su cuenta comparando el texto tipeado contra getOptionLabel — y como el label de
      // Cliente/Proveedor es solo el nombre (el documento/NIT aparece nomás como secundario),
      // una búsqueda por documento traía el resultado correcto del servidor pero MUI lo
      // descartaba después. Con las opciones ya vienen filtradas, no hay que filtrar de nuevo.
      filterOptions={(opciones) => opciones}
      noOptionsText="Sin resultados"
      renderOption={(props, item) => {
        const secundario = getSecondaryLabel?.(item)
        return (
          <li {...props} key={getId(item)}>
            <div>
              <div>{getLabel(item)}</div>
              {secundario && (
                <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>{secundario}</div>
              )}
            </div>
          </li>
        )
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {query.isFetching && <CircularProgress color="inherit" size={16} />}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  )
}
