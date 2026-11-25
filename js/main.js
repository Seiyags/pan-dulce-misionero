import { CONFIG } from './config.js';
import * as api from './api.js';
import * as ui from './ui.js';

let usuarioActual = null;
let productos = [];
let carrito = {};
let ultimoPedido = null;

async function cargarDatos() {
  try {
    productos = await api.fetchProductos();
    ui.renderCatalogo(productos, carrito, handleCambiarCantidad);

    if (usuarioActual) {
      const [pedidos, gastos] = await Promise.all([
        api.fetchPedidos(),
        api.fetchGastosEvento()
      ]);
      ui.renderCocina(productos, pedidos, handleToggleEntregado);
      ui.renderTesoreria(pedidos, gastos, handleTogglePagado, handleEliminarPedido);
    }
  } catch (err) {
    console.error(err);
    ui.mostrarToast('Error al cargar los datos', true);
  }
}

function handleCambiarCantidad(prodId, delta) {
  const nueva = Math.max(0, (carrito[prodId] || 0) + delta);
  if (nueva === 0) delete carrito[prodId];
  else carrito[prodId] = nueva;
  ui.renderCatalogo(productos, carrito, handleCambiarCantidad);
}

async function handleToggleEntregado(pedido) {
  await api.toggleEntregado(pedido);
  await cargarDatos();
  ui.mostrarToast(pedido.entregado ? 'Pedido devuelto a pendientes' : '¡Pedido entregado!');
}

async function handleTogglePagado(pedido) {
  await api.togglePagado(pedido);
  await cargarDatos();
  ui.mostrarToast(pedido.pagado ? 'Pago anulado de la caja' : 'Pago registrado en Caja General');
}

function handleEliminarPedido(pedido) {
  ui.pedirConfirmacion(
    `¿Eliminar pedido de ${pedido.cliente_nombre}?`,
    'Si estaba pagado, también se descontará de la Caja General.',
    async () => {
      await api.eliminarPedido(pedido);
      await cargarDatos();
      ui.mostrarToast('Pedido eliminado');
    }
  );
}

// --- CONFIRMAR PEDIDO DEL CLIENTE ---
document.getElementById('btnConfirmarPedido').addEventListener('click', async () => {
  const nombre = document.getElementById('cliNombre').value.trim();
  const whatsapp = document.getElementById('cliWhatsapp').value.trim();
  const medio_pago = document.getElementById('cliMedioPago').value;
  const notas = document.getElementById('cliNotas').value.trim();

  if (!nombre) return ui.mostrarToast('Escribí tu nombre y apellido', true);

  const items = productos
    .filter(p => (carrito[p.id] || 0) > 0)
    .map(p => ({ id: p.id, nombre: p.nombre, cantidad: carrito[p.id], precio: Number(p.precio) }));

  if (items.length === 0) return ui.mostrarToast('Elegí al menos un pan dulce', true);

  const total = items.reduce((acc, i) => acc + i.cantidad * i.precio, 0);

  try {
    await api.crearPedido({
      cliente_nombre: nombre,
      cliente_whatsapp: whatsapp,
      items,
      total,
      medio_pago,
      notas
    });

    ultimoPedido = { nombre, items, total, medio_pago, notas };

    // Mostrar modal de éxito con Alias (si eligió MP) + botón WhatsApp
    document.getElementById('exitoTotal').textContent = ui.fmt(total);
    document.getElementById('boxAliasExito').classList.toggle('hidden', medio_pago !== 'mercado_pago');
    ui.abrirModal('modalExito');

    // Limpiar formulario y carrito
    carrito = {};
    document.getElementById('cliNombre').value = '';
    document.getElementById('cliWhatsapp').value = '';
    document.getElementById('cliNotas').value = '';
    await cargarDatos();
  } catch (err) {
    console.error(err);
    ui.mostrarToast('No se pudo guardar el pedido', true);
  }
});

// Copiar Alias
document.getElementById('btnCopiarAlias').addEventListener('click', (e) => {
  navigator.clipboard.writeText(CONFIG.ALIAS_MP);
  e.target.textContent = '✅ ¡Alias copiado!';
  setTimeout(() => e.target.textContent = '📋 Copiar Alias', 2000);
});

// Enviar pedido por WhatsApp
document.getElementById('btnEnviarWA').addEventListener('click', () => {
  if (!ultimoPedido) return;
  const detalle = ultimoPedido.items.map(i => `• ${i.cantidad}x ${i.nombre}`).join('\n');
  const pagoTxt = ultimoPedido.medio_pago === 'mercado_pago'
    ? `Mercado Pago (Alias: ${CONFIG.ALIAS_MP})`
    : 'Efectivo al retirar';

  const msg = encodeURIComponent(
    `¡Hola! Hice un pedido de Pan Dulce Solidario 🎄\n\n` +
    `👤 *Nombre:* ${ultimoPedido.nombre}\n` +
    `🍞 *Pedido:*\n${detalle}\n` +
    `💰 *Total:* ${ui.fmt(ultimoPedido.total)}\n` +
    `💳 *Pago:* ${pagoTxt}` +
    (ultimoPedido.notas ? `\n📝 *Nota:* ${ultimoPedido.notas}` : '')
  );
  window.open(`https://wa.me/${CONFIG.WHATSAPP_PEDIDOS}?text=${msg}`, '_blank');
  ui.cerrarModal('modalExito');
});

// --- AUTH EQUIPO ---
document.getElementById('btnAuth').addEventListener('click', () => {
  if (usuarioActual) {
    ui.pedirConfirmacion('¿Cerrar sesión?', 'Vas a volver a la vista pública de la tienda.', async () => {
      await api.logout();
      usuarioActual = null;
      ui.actualizarUIAuth(null);
      await cargarDatos();
      ui.mostrarToast('Sesión cerrada');
    });
    return;
  }
  document.getElementById('loginError').classList.add('hidden');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value = '';
  ui.abrirModal('modalAuth');
});

document.getElementById('btnConfirmLogin').addEventListener('click', async () => {
  const userInput = document.getElementById('loginEmail').value.trim().toLowerCase();
  const passInput = document.getElementById('loginPass').value.trim();

  const email = userInput.includes('@') ? userInput : `${userInput}@inmaculado.com`;
  const password = passInput.length < 6 ? `${passInput}00` : passInput;

  const { data, error } = await api.login(email, password);
  if (error) {
    const errEl = document.getElementById('loginError');
    errEl.textContent = 'Usuario o contraseña incorrectos';
    errEl.classList.remove('hidden');
    return;
  }
  ui.cerrarModal('modalAuth');
  usuarioActual = data.user;
  ui.actualizarUIAuth(usuarioActual);
  await cargarDatos();
  ui.mostrarToast('¡Acceso de equipo activado!');
});

// --- TABS ---
document.getElementById('tabTienda').addEventListener('click', () => ui.cambiarTab('tienda'));
document.getElementById('tabCocina').addEventListener('click', () => ui.cambiarTab('cocina'));
document.getElementById('tabTesoreria').addEventListener('click', () => ui.cambiarTab('tesoreria'));

// --- GASTO DE INSUMOS ---
document.getElementById('btnNuevoGasto').addEventListener('click', () => {
  document.getElementById('gastoDesc').value = '';
  document.getElementById('gastoMonto').value = '';
  ui.abrirModal('modalGasto');
});

document.getElementById('btnGuardarGasto').addEventListener('click', async () => {
  const descripcion = document.getElementById('gastoDesc').value.trim();
  const monto = Number(document.getElementById('gastoMonto').value);
  const medio_pago = document.getElementById('gastoMedio').value;

  if (!descripcion || monto <= 0) return ui.mostrarToast('Completá descripción y monto', true);

  await api.registrarGastoInsumo({ descripcion, monto, medio_pago });
  ui.cerrarModal('modalGasto');
  await cargarDatos();
  ui.mostrarToast('Gasto registrado en Caja');
});

// Cerrar modales
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => ui.cerrarModal(btn.dataset.close));
});

// Iniciar
(async function init() {
  usuarioActual = await api.getSession();
  ui.actualizarUIAuth(usuarioActual);
  await cargarDatos();
})();