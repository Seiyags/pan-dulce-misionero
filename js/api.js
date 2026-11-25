import { CONFIG } from './config.js';

const db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

export async function getSession() {
  const { data: { session } } = await db.auth.getSession();
  return session?.user || null;
}

export async function login(email, password) {
  return await db.auth.signInWithPassword({ email, password });
}

export async function logout() {
  return await db.auth.signOut();
}

export async function fetchProductos() {
  const { data, error } = await db
    .from('productos')
    .select('*')
    .eq('evento_id', CONFIG.EVENTO_ID)
    .eq('activo', true)
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Importante: sin .select() porque el cliente público solo tiene permiso INSERT
export async function crearPedido(pedido) {
  const { error } = await db.from('pedidos').insert({
    evento_id: CONFIG.EVENTO_ID,
    ...pedido
  });
  if (error) throw error;
}

export async function fetchPedidos() {
  const { data, error } = await db
    .from('pedidos')
    .select('*')
    .eq('evento_id', CONFIG.EVENTO_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchGastosEvento() {
  const { data, error } = await db
    .from('movimientos')
    .select('*')
    .eq('evento_id', CONFIG.EVENTO_ID)
    .eq('tipo', 'gasto')
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function toggleEntregado(pedido) {
  const { error } = await db
    .from('pedidos')
    .update({ entregado: !pedido.entregado })
    .eq('id', pedido.id);
  if (error) throw error;
}

export async function togglePagado(pedido) {
  if (!pedido.pagado) {
    // 1. Marcar como pagado -> crea el ingreso automático en Caja General
    const resumen = pedido.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ');
    const { data: mov, error: errMov } = await db
      .from('movimientos')
      .insert({
        evento_id: CONFIG.EVENTO_ID,
        tipo: 'ingreso',
        monto: pedido.total,
        medio_pago: pedido.medio_pago,
        descripcion: `Pan Dulce - ${pedido.cliente_nombre} (${resumen})`
      })
      .select()
      .single();

    if (errMov) throw errMov;

    const { error: errPed } = await db
      .from('pedidos')
      .update({ pagado: true, movimiento_id: mov.id })
      .eq('id', pedido.id);

    if (errPed) throw errPed;
  } else {
    // 2. Desmarcar pago -> borra ese ingreso de Caja General
    const movId = pedido.movimiento_id;
    await db
      .from('pedidos')
      .update({ pagado: false, movimiento_id: null })
      .eq('id', pedido.id);

    if (movId) {
      await db.from('movimientos').delete().eq('id', movId);
    }
  }
}

export async function eliminarPedido(pedido) {
  if (pedido.movimiento_id) {
    await db.from('movimientos').delete().eq('id', pedido.movimiento_id);
  }
  const { error } = await db.from('pedidos').delete().eq('id', pedido.id);
  if (error) throw error;
}

export async function registrarGastoInsumo({ descripcion, monto, medio_pago }) {
  const { error } = await db.from('movimientos').insert({
    evento_id: CONFIG.EVENTO_ID,
    tipo: 'gasto',
    monto,
    medio_pago,
    descripcion: `Insumos Pan Dulce - ${descripcion}`
  });
  if (error) throw error;
}