// Carga de datos de prueba para una tienda de ropa: familias, características
// (color/talla), artículos con variantes, clientes y proveedores. No crea
// ventas/compras — esas se registran a mano desde la app para probar el flujo.
//
// Uso: node scripts/seed-demo-data.mjs
// Requiere que el backend esté corriendo (por defecto en http://localhost:5187/api)
// y que exista el usuario admin/admin123 (se crea solo si la tabla Usuario está vacía).

const BASE_URL = process.env.VENTSOFT_API_URL ?? 'http://localhost:5187/api'
const ADMIN_USER = { nombreUsuario: 'admin', contrasena: 'admin123' }

async function api(method, path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.success) {
    throw new Error(`${method} ${path} -> ${res.status}: ${json?.message ?? res.statusText}`)
  }
  return json.data
}

async function getOrCreate(token, path, searchParams, matchFn, createPayload) {
  const query = new URLSearchParams(searchParams).toString()
  const existentes = await api('GET', `${path}/search${query ? `?${query}` : ''}`, undefined, token)
  const encontrado = existentes.find(matchFn)
  if (encontrado) return encontrado
  return api('POST', path, createPayload, token)
}

async function main() {
  console.log(`Conectando a ${BASE_URL}...`)
  const login = await api('POST', '/Auth/login', ADMIN_USER)
  const token = login.token
  console.log('Login OK como admin.\n')

  // --- Características -------------------------------------------------
  console.log('Características...')
  const caracteristicas = {}
  for (const nombre of ['Color', 'Talla']) {
    const c = await getOrCreate(
      token,
      '/Caracteristica',
      { nombreCaracteristica: nombre },
      (x) => x.nombreCaracteristica.toLowerCase() === nombre.toLowerCase(),
      { nombreCaracteristica: nombre, descripcion: null },
    )
    caracteristicas[nombre] = c.id
    console.log(`  ${nombre} -> id ${c.id}`)
  }

  // --- Familias ----------------------------------------------------------
  console.log('\nFamilias...')
  const nombresFamilia = [
    'jean',
    'pantalones',
    'polera',
    'camisas',
    'casacas',
    'vestidos',
    'shorts',
  ]
  const familias = {}
  for (const nombre of nombresFamilia) {
    const f = await getOrCreate(
      token,
      '/Familia',
      { nombreFamilia: nombre },
      (x) => x.nombreFamilia.toLowerCase() === nombre.toLowerCase(),
      { nombreFamilia: nombre, descripcion: null },
    )
    familias[nombre] = f.id
    console.log(`  ${nombre} -> id ${f.id}`)
  }

  // --- Promociones ---------------------------------------------------------
  console.log('\nPromociones...')
  const promo = await getOrCreate(
    token,
    '/Promocion',
    { nombrePromocion: 'Descuento de temporada' },
    (x) => x.nombrePromocion === 'Descuento de temporada',
    {
      nombrePromocion: 'Descuento de temporada',
      descuentoPorcentaje: 10,
      descripcion: '10% de descuento en artículos seleccionados',
    },
  )
  console.log(`  Descuento de temporada -> id ${promo.id}`)

  // --- Proveedores ---------------------------------------------------------
  console.log('\nProveedores...')
  const proveedoresData = [
    { nombre: 'Textiles Bolivia SRL', nit: '1023456011', personaContacto: 'Ana Rojas', direccion: 'Av. Blanco Galindo km 4', zona: 'Cochabamba', telefono: 44123456, correo: 'ventas@textilesbolivia.com', nota: 'Proveedor de jeans y pantalones' },
    { nombre: 'Importadora ModaSur', nit: '1023456022', personaContacto: 'Carlos Vargas', direccion: 'Calle Comercio 250', zona: 'La Paz', telefono: 22114455, correo: 'contacto@modasur.com', nota: 'Poleras y camisas importadas' },
    { nombre: 'Distribuidora AndinaTex', nit: '1023456033', personaContacto: 'Lucía Fernández', direccion: 'Av. Cañoto 890', zona: 'Santa Cruz', telefono: 33556677, correo: 'pedidos@andinatex.com', nota: 'Casacas, vestidos y shorts' },
  ]
  const proveedores = []
  for (const p of proveedoresData) {
    const creado = await getOrCreate(token, '/Proveedor', { nombre: p.nombre }, (x) => x.nombre === p.nombre, p)
    proveedores.push(creado)
    console.log(`  ${creado.nombre} -> id ${creado.id}`)
  }

  // --- Clientes ------------------------------------------------------------
  console.log('\nClientes...')
  const clientesData = [
    { nombre: 'Juan Pérez', documentoIdentidad: '4521178', personaContacto: null, direccion: 'Av. América 123', zona: 'Cochabamba', telefono: '70112233', correo: 'juan.perez@gmail.com', nota: '' },
    { nombre: 'Carla Gutiérrez', documentoIdentidad: '5893441', personaContacto: null, direccion: 'Calle Sucre 456', zona: 'La Paz', telefono: '71223344', correo: 'carla.gutierrez@gmail.com', nota: '' },
    { nombre: 'Roberto Quispe', documentoIdentidad: '6127788', personaContacto: null, direccion: 'Av. Ballivián 789', zona: 'Cochabamba', telefono: '72334455', correo: 'roberto.quispe@gmail.com', nota: '' },
    { nombre: 'Daniela Flores', documentoIdentidad: '7345521', personaContacto: null, direccion: 'Zona Norte, calle 21', zona: 'Santa Cruz', telefono: '73445566', correo: 'daniela.flores@gmail.com', nota: '' },
    { nombre: 'Miguel Ángel Torrez', documentoIdentidad: '8456632', personaContacto: null, direccion: 'Av. 6 de Agosto 321', zona: 'La Paz', telefono: '74556677', correo: 'miguel.torrez@gmail.com', nota: '' },
  ]
  const clientes = []
  for (const c of clientesData) {
    const creado = await getOrCreate(token, '/Cliente', { documentoIdentidad: c.documentoIdentidad }, (x) => x.documentoIdentidad === c.documentoIdentidad, c)
    clientes.push(creado)
    console.log(`  ${creado.nombre} -> id ${creado.id}`)
  }

  // --- Artículos -------------------------------------------------------
  // Cada combinación color/talla es un artículo propio (así está modelado el
  // backend): mismo "producto base" en la descripción, distinto código.
  console.log('\nArtículos...')

  const articulos = [
    // jean
    { fam: 'jean', base: 'Jean Clásico', variantes: [['Azul', '38'], ['Azul', '40'], ['Negro', '38']], precio: 180, costo: 95 },
    { fam: 'jean', base: 'Jean Slim', variantes: [['Negro', '36'], ['Celeste', '38']], precio: 195, costo: 105 },
    // pantalones
    { fam: 'pantalones', base: 'Pantalón Cargo', variantes: [['Verde', '32'], ['Beige', '34']], precio: 150, costo: 80 },
    { fam: 'pantalones', base: 'Pantalón de Vestir', variantes: [['Negro', '32'], ['Gris', '34']], precio: 170, costo: 90 },
    // polera
    { fam: 'polera', base: 'Polera Básica', variantes: [['Blanco', 'S'], ['Blanco', 'M'], ['Negro', 'M'], ['Negro', 'L']], precio: 60, costo: 28 },
    { fam: 'polera', base: 'Polera Estampada', variantes: [['Negro', 'M'], ['Gris', 'L']], precio: 75, costo: 35 },
    // camisas
    { fam: 'camisas', base: 'Camisa Formal', variantes: [['Blanco', 'M'], ['Celeste', 'L']], precio: 140, costo: 70 },
    { fam: 'camisas', base: 'Camisa Casual a Cuadros', variantes: [['Rojo', 'M'], ['Azul', 'L']], precio: 130, costo: 65 },
    // casacas
    { fam: 'casacas', base: 'Casaca de Jean', variantes: [['Azul', 'M'], ['Azul', 'L']], precio: 220, costo: 120 },
    { fam: 'casacas', base: 'Casaca Impermeable', variantes: [['Negro', 'M'], ['Verde', 'L']], precio: 260, costo: 140 },
    // vestidos
    { fam: 'vestidos', base: 'Vestido Casual', variantes: [['Rojo', 'S'], ['Negro', 'M']], precio: 190, costo: 100 },
    // shorts
    { fam: 'shorts', base: 'Short Deportivo', variantes: [['Negro', 'M'], ['Azul', 'L']], precio: 80, costo: 40 },
  ]

  let contador = 0
  for (const grupo of articulos) {
    const idFamilia = familias[grupo.fam]
    const prefijo = grupo.fam.slice(0, 3).toUpperCase()
    for (const [color, talla] of grupo.variantes) {
      contador += 1
      const codigo = `${prefijo}-${String(contador).padStart(3, '0')}`
      const descripcion = `${grupo.base} ${color} Talla ${talla}`
      const payload = {
        codigo,
        descripcion,
        tamano: talla,
        unidadMedida: 'Unidad',
        fraccion: 1,
        precio: grupo.precio,
        costo: grupo.costo,
        stockMinimo: 5,
        stockIdeal: 20,
        imagen: null,
        idFamilia,
        idPromocion: null,
        caracteristicas: [
          { idCaracteristica: caracteristicas.Color, valor: color },
          { idCaracteristica: caracteristicas.Talla, valor: talla },
        ],
      }
      const creado = await api('POST', '/Articulo', payload, token)
      console.log(`  ${codigo} — ${descripcion} -> id ${creado.id}`)
    }
  }

  console.log(`\nListo: ${contador} artículos, ${proveedores.length} proveedores, ${clientes.length} clientes.`)
  console.log('Ahora podés registrar Compras (elegí un proveedor) y Ventas (elegí un cliente) desde la app.')
}

main().catch((err) => {
  console.error('\nERROR:', err.message)
  process.exit(1)
})
