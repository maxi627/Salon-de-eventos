// Convierte un teléfono argentino, como lo cargan los clientes ("02604119865", "260 15 411-9865",
// "+54 9 260 ...") al formato que pide WhatsApp para un celular: 54 + 9 + código de área + número,
// sin 0 ni 15 (10 dígitos después del 549). Devuelve null si no se puede interpretar.
export function numeroWhatsapp(telefono) {
  let digitos = String(telefono ?? '').replace(/\D/g, '');
  if (digitos.startsWith('00')) digitos = digitos.slice(2);
  if (digitos.startsWith('54')) {
    digitos = digitos.slice(2);
    if (digitos.startsWith('9')) digitos = digitos.slice(1);
  }
  if (digitos.startsWith('0')) digitos = digitos.slice(1);

  // El 15 de los celulares va después del código de área (de 2, 3 o 4 dígitos).
  if (digitos.length === 12) {
    const largoArea = [2, 3, 4].find((n) => digitos.slice(n, n + 2) === '15');
    if (largoArea) digitos = digitos.slice(0, largoArea) + digitos.slice(largoArea + 2);
  }
  return digitos.length === 10 ? `549${digitos}` : null;
}
