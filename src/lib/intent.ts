// Decide que quiere el vecino cuando le habla a Vigia: reportar, pedir una ruta o preguntar.
export type Intent = "report" | "route" | "question";

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const ROUTE = /\b(ruta|como llego|llegar (a|al|hasta)|ir (a|al|hasta|para)|camino (a|al|hasta)|voy (a|al|para|hasta)|me lleva)\b/;
const REPORT =
  /\b(robaron|roban|robando|robo|atraco|atracaron|asaltaron|asalto|raparon|rapon|raponazo|hurto|balacera|disparo|disparos|dispararon|pelea|rina|agredieron|golpearon|vandal|grafiti|sospechos|droga|vendiendo|se metieron|forzaron|quiero reportar|reportar|denunciar|hay un|hay una|hay unos|acaban de)\b/;

export function detectIntent(text: string): Intent {
  const t = strip(text);
  if (ROUTE.test(t)) return "route";
  // una pregunta ("me robaron, ¿que hago?") la responde el asistente; un relato se vuelve reporte
  if (REPORT.test(t) && !t.includes("?") && !/\b(que hago|que debo|como|donde|cual|cuando)\b/.test(t)) return "report";
  return "question";
}
