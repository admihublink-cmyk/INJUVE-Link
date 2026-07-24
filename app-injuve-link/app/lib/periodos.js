// Lista de periodos "MES-AÑO" disponibles.
// Usa la función `panel_periodos_meses()` (DISTINCT en la base) en vez de
// traer toda la tabla `sesiones_clase` y deduplicar en JS.

export const MES_ABBR = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

export async function periodosDisponibles(sb, incluir) {
  const set = new Set();
  const [{ data: meses }, { data: gp }] = await Promise.all([
    sb.rpc("panel_periodos_meses"),
    sb.from("groups").select("periodo"),
  ]);
  (meses || []).forEach((r) => { if (r.mes) set.add(MES_ABBR[r.mes - 1] + "-" + r.anio); });
  (gp || []).forEach((r) => { if (r.periodo) set.add(r.periodo); });
  if (incluir) set.add(incluir);
  return Array.from(set).sort((a, b) => {
    const pa = String(a).split("-"), pb = String(b).split("-");
    return (Number(pa[1]) - Number(pb[1])) || (MES_ABBR.indexOf(pa[0]) - MES_ABBR.indexOf(pb[0]));
  });
}
