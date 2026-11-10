function esMontoPositivo(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
}

// Valor del alquiler con el que arranca el modal de una reserva: el que ya tiene guardado;
// si está en cero, el precio estimado que el calendario tiene para ese día; si no hay, cero.
export function valorAlquilerSugerido(valorGuardado, valorEstimado) {
  if (esMontoPositivo(valorGuardado)) return valorGuardado;
  if (esMontoPositivo(valorEstimado)) return valorEstimado;
  return 0;
}

function aNumero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

// Saldo que se muestra en el modal: el valor del campo (aunque todavía no se haya guardado)
// menos los pagos registrados.
export function saldoRestante(valorAlquiler, pagos = []) {
  const pagado = (pagos ?? []).reduce((total, pago) => total + aNumero(pago.monto), 0);
  return aNumero(valorAlquiler) - pagado;
}
