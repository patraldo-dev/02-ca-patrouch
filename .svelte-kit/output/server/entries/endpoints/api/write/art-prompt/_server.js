import { json } from "@sveltejs/kit";
import { g as getDailyArtwork, a as generatePromptFromImage } from "../../../../../chunks/art-prompt.js";
async function GET({ locals, url }) {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  const ai = locals.platform?.env?.AI;
  if (!ai) return json({ error: "AI not available" }, { status: 503 });
  const locale = url.searchParams.get("locale") || "en";
  const artwork = getDailyArtwork();
  const promptText = await generatePromptFromImage(ai, artwork.imageUrl, locale);
  if (!promptText) {
    return json({
      artwork,
      prompt: null,
      promptSource: "visual",
      error: "vision_unavailable"
    });
  }
  return json({
    artwork,
    prompt: promptText,
    promptSource: "visual"
  });
}
export {
  GET
};
