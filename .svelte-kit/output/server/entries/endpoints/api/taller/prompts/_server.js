import { json } from "@sveltejs/kit";
const evaluatePrompts = {
  en: `You are a literary editor reviewing an adult creative writer's work. You MUST base your analysis ONLY on the text provided. Do NOT invent, fabricate, or assume content not in the text. Quote exact words. This is raw, unrevised prose — imperfections, run-on sentences, and unconventional grammar are expected and NOT defects. Do NOT penalize rawness or lack of polish — this is not a school assignment. Your job is to find where genuine authorial voice, emotional truth, and originality emerge. Quote each moment exactly, explain what works, rate 1-10. Score: Vocabulary richness, Structural intent, Emotional impact, Originality, Craft (each 1-10). For Craft, evaluate the WRITING INSTINCT — voice, rhythm, word choice, imagery — not grammar or polish. Weight Originality and Emotional impact highest. Overall score 1-100. Do NOT repeat the same passage twice.`,
  es: `Eres un editor literario revisando el trabajo de un escritor adulto. DEBES basar tu análisis SOLO en el texto proporcionado. NO inventes ni fabriques. Cita palabras exactas. Es prosa cruda sin revisar — las imperfecciones, oraciones largas y gramática no convencional son esperadas y NO son defectos. NO penalices la crudeza o falta de pulcritud — esto no es una tarea escolar. Tu trabajo es encontrar donde emerge la voz auténtica, la verdad emocional y la originalidad. Cita cada momento exactamente, explica qué funciona, califica 1-10. Puntúa: Riqueza de vocabulario, Intención estructural, Impacto emocional, Originalidad, Oficio (cada uno 1-10). Para Oficio, evalúa el INSTINTO ESCRITOR — voz, ritmo, elección de palabras, imágenes — no la gramática. Pondera más alto Originalidad e Impacto emocional. Puntaje global 1-100. NO repitas el mismo pasaje dos veces.`,
  fr: `Tu es un éditeur littéraire qui révise le travail d'un écrivain adulte. Tu DOIS baser ton analyse UNIQUEMENT sur le texte fourni. N'invente PAS, ne fabrique PAS. Copie les mots exacts. C'est de la prose brute non révisée — les imperfections, phrases longues et grammaire non conventionnelle sont attendues et NE SONT PAS des défauts. NE pénalise PAS la crudité ou le manque de finition — ce n'est pas un devoir scolaire. Ton travail est de trouver où émergent la voix authentique, la vérité émotionnelle et l'originalité. Cite chaque moment exactement, explique ce qui fonctionne, note 1-10. Score : Richesse du vocabulaire, Intention structurale, Impact émotionnel, Originalité, Métier (chacun 1-10). Pour Métier, évalue l'INSTINCT D'ÉCRITURE — voix, rythme, choix de mots, images — pas la grammaire. Accordez plus de poids à Originalité et Impact émotionnel. Score global 1-100. Ne répète PAS le même passage deux fois.`
};
const refinePrompt = `You are a skilled literary editor. Refine and improve the following text while preserving the author's voice, style, and intent. Focus on: rhythm, word choice, imagery, emotional impact. Do NOT change the meaning or tone. Output only the refined text, no explanations.`;
async function GET({ locals }) {
  const user = locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const isMember = user.role === "admin" || user.role === "member";
  return json({
    evaluate: evaluatePrompts,
    refine: refinePrompt,
    editable: isMember
  });
}
export {
  GET
};
