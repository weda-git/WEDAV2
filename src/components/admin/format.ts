// ADM-01: textos y fechas compartidos por las pantallas de administración.
import { formatARS } from '@/lib/demo-wedding';
import { planById } from '@/lib/weda/plans';

export const shortDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const dateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const money = (n: number) => formatARS(n);

export function planName(id: string | null | undefined): string {
  if (!id) return 'Sin plan';
  return planById(id as never)?.name ?? id;
}

/** Estado visible de una cuenta en la lista y la ficha. */
export function accountState(a: { suspendedAt: string | null; publication: string | null }): { label: string; cls: string } {
  if (a.suspendedAt) return { label: 'Suspendida', cls: ' is-suspended' };
  if (a.publication === 'live') return { label: 'Publicada', cls: ' is-live' };
  if (a.publication === 'taken_down') return { label: 'Despublicada', cls: '' };
  return { label: 'Borrador', cls: '' };
}

export const ACTION_LABEL: Record<string, string> = {
  view: 'Abrió la ficha',
  suspend: 'Suspendió la cuenta',
  reactivate: 'Reactivó la cuenta',
  unpublish: 'Despublicó el sitio',
  republish: 'Volvió a publicar el sitio',
  change_email: 'Cambió el correo',
  send_reset: 'Mandó el enlace de clave',
  impersonate_start: 'Entró como la pareja',
  impersonate_end: 'Salió de la cuenta',
  impersonated_save: 'Guardó cambios como la pareja',
  view_receipt: 'Abrió un comprobante',
};
