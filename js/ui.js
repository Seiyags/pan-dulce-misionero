export const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR');

export function actualizarUIAuth(user) {
  const btn = document.getElementById('btnAuth');
  const tabs = document.getElementById('tabsNav');

  if (user) {
    btn.textContent = '🔓 Salir';
    tabs.classList.remove('hidden');
  } else {
    btn.textContent = '🔒 Equipo';
    tabs.classList.add('hidden');
    cambiarTab('tienda');
  }
}

export function cambiarTab(tab) {
  const vistas = ['tienda', 'cocina', 'tesoreria'];
  vistas.forEach(v => {
    const vistaEl = document.getElementById(`vista${v.charAt(0).toUpperCase() + v.slice(1)}`);
    const tabEl = document.getElementById(`tab${v.charAt(0).toUpperCase() + v.slice(1)}`);
    const activo = v === tab;

    vistaEl.classList.toggle('hidden', !activo);
    if (tabEl) {
      tabEl.className = activo
        ? 'flex-1 py-2.5 rounded-xl bg-[#163A70] text-amber-300 font-bold text-xs shadow transition'
        : 'flex-1 py-2.5 rounded-xl text-slate-500 font-bold text-xs transition';
    }
  });
}

export function renderCatalogo(productos, carrito, onCambiarCantidad) {
  const cont = document.getElementById('listaProductos');
  cont.innerHTML = '';

  productos.forEach(prod => {
    const cant = carrito[prod.id] || 0;
    const card = document.createElement('div');
    card.className = `bg-white rounded-3xl p-4 shadow-sm border-2 transition ${
      cant > 0 ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200/80'
    }`;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl shrink-0">
            ${prod.icono || '🍞'}
          </div>
          <div>
            <h3 class="font-display text-base text-[#163A70] leading-tight">${prod.nombre}</h3>
            <p class="text-[11px] text-slate-500 font-semibold mt-0.5">${prod.descripcion || ''}</p>
            <p class="font-display text-lg text-amber-600 mt-1">${fmt(prod.precio)}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl shrink-0 self-center">
          <button data-menos="${prod.id}" class="w-8 h-8 rounded-xl bg-white text-[#163A70] font-black text-lg shadow-sm active:scale-90 transition">−</button>
          <span class="w-5 text-center font-display font-bold text-base text-[#163A70]">${cant}</span>
          <button data-mas="${prod.id}" class="w-8 h-8 rounded-xl bg-[#163A70] text-amber-300 font-black text-lg shadow-sm active:scale-90 transition">+</button>
        </div>
      </div>
    `;

    card.querySelector(`[data-menos="${prod.id}"]`).addEventListener('click', () => onCambiarCantidad(prod.id, -1));
    card.querySelector(`[data-mas="${prod.id}"]`).addEventListener('click', () => onCambiarCantidad(prod.id, 1));
    cont.appendChild(card);
  });

  // Actualizar resumen del carrito
  let totalUnidades = 0;
  let totalPrecio = 0;
  productos.forEach(p => {
    const c = carrito[p.id] || 0;
    totalUnidades += c;
    totalPrecio += c * Number(p.precio);
  });

  const boxCheckout = document.getElementById('boxCheckout');
  boxCheckout.classList.toggle('hidden', totalUnidades === 0);
  document.getElementById('resumenUnidades').textContent = `${totalUnidades} ${totalUnidades === 1 ? 'unidad' : 'unidades'}`;
  document.getElementById('resumenTotal').textContent = fmt(totalPrecio);
}

export function renderCocina(productos, pedidos, onToggleEntregado) {
  // 1. Calcular cuántos faltan hornear/entregar por variedad
  const pendientes = pedidos.filter(p => !p.entregado);
  const totalesPorSabor = {};
  productos.forEach(p => { totalesPorSabor[p.nombre] = { icono: p.icono, cant: 0 }; });

  pendientes.forEach(ped => {
    (ped.items || []).forEach(it => {
      if (!totalesPorSabor[it.nombre]) totalesPorSabor[it.nombre] = { icono: '🍞', cant: 0 };
      totalesPorSabor[it.nombre].cant += Number(it.cantidad);
    });
  });

  const gridHorno = document.getElementById('resumenHorneado');
  gridHorno.innerHTML = '';
  Object.entries(totalesPorSabor).forEach(([nombre, info]) => {
    const div = document.createElement('div');
    div.className = 'bg-white p-3 rounded-2xl shadow-sm border border-amber-200 text-center';
    div.innerHTML = `
      <span class="text-xl">${info.icono}</span>
      <p class="font-display text-2xl text-[#163A70] leading-tight">${info.cant}</p>
      <p class="text-[10px] font-extrabold text-slate-500 leading-tight mt-0.5">${nombre.replace('Pan Dulce ', '')}</p>
    `;
    gridHorno.appendChild(div);
  });

  // 2. Lista de pedidos para cocina (primero los pendientes)
  const ordenados = [...pedidos].sort((a, b) => Number(a.entregado) - Number(b.entregado));
  const lista = document.getElementById('listaCocina');
  lista.innerHTML = '';

  if (ordenados.length === 0) {
    lista.innerHTML = `<p class="text-center text-xs text-slate-400 py-8">Todavía no hay pedidos cargados.</p>`;
    return;
  }

  ordenados.forEach(ped => {
    const itemsHtml = (ped.items || []).map(i => `<span class="inline-block bg-amber-100 text-amber-900 text-xs font-extrabold px-2.5 py-1 rounded-lg">${i.cantidad}x ${i.nombre.replace('Pan Dulce ', '')}</span>`).join(' ');
    const card = document.createElement('div');
    card.className = `bg-white p-4 rounded-2xl shadow-sm border-2 space-y-2.5 ${
      ped.entregado ? 'border-slate-200 opacity-65' : 'border-sky-200'
    }`;

    card.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div>
          <p class="font-display text-base text-[#163A70]">${ped.cliente_nombre}</p>
          ${ped.cliente_whatsapp ? `<p class="text-[11px] text-slate-400 font-bold">📱 ${ped.cliente_whatsapp}</p>` : ''}
        </div>
        <span class="text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
          ped.pagado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }">
          ${ped.pagado ? '✅ Pagado' : '⏳ Falta pagar'}
        </span>
      </div>
      <div class="flex flex-wrap gap-1.5">${itemsHtml}</div>
      ${ped.notas ? `<p class="text-xs text-slate-500 bg-slate-50 p-2 rounded-xl italic">📝 "${ped.notas}"</p>` : ''}
      <button data-entregar="${ped.id}" class="w-full py-2.5 rounded-xl font-bold text-xs transition ${
        ped.entregado
          ? 'bg-slate-200 text-slate-600'
          : 'bg-emerald-500 active:scale-95 text-white shadow-sm'
      }">
        ${ped.entregado ? '↩️ Desmarcar entregado' : '📦 Marcar como Entregado'}
      </button>
    `;

    card.querySelector(`[data-entregar="${ped.id}"]`).addEventListener('click', () => onToggleEntregado(ped));
    lista.appendChild(card);
  });
}

export function renderTesoreria(pedidos, gastos, onTogglePagado, onEliminarPedido) {
  let cobrado = 0, pendiente = 0, totalGastos = 0;

  pedidos.forEach(p => {
    if (p.pagado) cobrado += Number(p.total);
    else pendiente += Number(p.total);
  });
  gastos.forEach(g => { totalGastos += Number(g.monto); });

  document.getElementById('tesoCobrado').textContent = fmt(cobrado);
  document.getElementById('tesoGastos').textContent = fmt(totalGastos);
  document.getElementById('tesoNeto').textContent = fmt(cobrado - totalGastos);
  document.getElementById('tesoPendiente').textContent = `Falta cobrar: ${fmt(pendiente)}`;

  // Lista de cobros
  const lista = document.getElementById('listaTesoreria');
  lista.innerHTML = '';

  if (pedidos.length === 0) {
    lista.innerHTML = `<p class="text-center text-xs text-slate-400 py-6">Todavía no hay pedidos.</p>`;
  }

  pedidos.forEach(ped => {
    const detalle = (ped.items || []).map(i => `${i.cantidad}x ${i.nombre.replace('Pan Dulce ', '')}`).join(', ');
    const card = document.createElement('div');
    card.className = 'bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200 space-y-2.5';
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <p class="font-bold text-sm text-[#163A70]">${ped.cliente_nombre}</p>
          <p class="text-[11px] text-slate-500 font-semibold">${detalle}</p>
          <p class="text-[10px] text-slate-400 font-bold mt-0.5">${ped.medio_pago === 'efectivo' ? '💵 Efectivo' : '📱 Mercado Pago'}</p>
        </div>
        <p class="font-display text-lg text-[#163A70]">${fmt(ped.total)}</p>
      </div>
      <div class="flex gap-2">
        <button data-pagar="${ped.id}" class="flex-1 py-2 rounded-xl font-bold text-xs transition ${
          ped.pagado
            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
            : 'bg-[#163A70] text-amber-300 shadow-sm'
        }">
          ${ped.pagado ? '✅ Pagado (en Caja)' : '💵 Confirmar Pago'}
        </button>
        <button data-borrar="${ped.id}" class="px-3 py-2 rounded-xl bg-rose-50 text-rose-500 font-bold text-xs">
          🗑️
        </button>
      </div>
    `;

    card.querySelector(`[data-pagar="${ped.id}"]`).addEventListener('click', () => onTogglePagado(ped));
    card.querySelector(`[data-borrar="${ped.id}"]`).addEventListener('click', () => onEliminarPedido(ped));
    lista.appendChild(card);
  });

  // Lista de gastos de insumos
  const listaGastos = document.getElementById('listaGastosInsumos');
  listaGastos.innerHTML = '';
  if (gastos.length === 0) {
    listaGastos.innerHTML = `<p class="text-center text-xs text-slate-400 py-3">Sin gastos de insumos registrados.</p>`;
  } else {
    gastos.forEach(g => {
      const div = document.createElement('div');
      div.className = 'bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs';
      div.innerHTML = `
        <span class="font-bold text-slate-700">${g.descripcion.replace('Insumos Pan Dulce - ', '')}</span>
        <span class="font-display text-sm text-rose-500">-${fmt(g.monto)}</span>
      `;
      listaGastos.appendChild(div);
    });
  }
}

export const abrirModal = (id) => document.getElementById(id).classList.remove('hidden');
export const cerrarModal = (id) => document.getElementById(id).classList.add('hidden');

let toastTimer = null;
export function mostrarToast(mensaje, esError = false) {
  const el = document.getElementById('toast');
  el.textContent = mensaje;
  el.className = `fixed bottom-5 left-1/2 -translate-x-1/2 z-50 text-white text-xs font-bold px-5 py-3 rounded-full shadow-xl transition-all whitespace-nowrap ${
    esError ? 'bg-rose-600' : 'bg-[#163A70]'
  }`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}

export function pedirConfirmacion(titulo, texto, onConfirm) {
  document.getElementById('confirmTitulo').textContent = titulo;
  document.getElementById('confirmTexto').textContent = texto;
  abrirModal('modalConfirm');

  const btnOk = document.getElementById('btnConfirmOk');
  const btnCancel = document.getElementById('btnConfirmCancel');
  const limpiar = () => { cerrarModal('modalConfirm'); btnOk.onclick = null; btnCancel.onclick = null; };

  btnCancel.onclick = limpiar;
  btnOk.onclick = async () => { limpiar(); await onConfirm(); };
}