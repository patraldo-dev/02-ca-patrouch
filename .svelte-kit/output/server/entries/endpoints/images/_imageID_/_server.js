import { redirect } from "@sveltejs/kit";
async function GET({ params }) {
  const { imageId } = params;
  throw redirect(302, `https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/${imageId}/cover`);
}
export {
  GET
};
