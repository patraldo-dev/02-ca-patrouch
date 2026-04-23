import "clsx";
import { a as pop, p as push } from "../../../chunks/index2.js";
function _page($$payload, $$props) {
  push();
  $$payload.out.push(`<h1>Test Image Upload</h1> <form><input type="file" id="fileInput" accept="image/*" required/> <button type="submit">Upload</button></form>`);
  pop();
}
export {
  _page as default
};
