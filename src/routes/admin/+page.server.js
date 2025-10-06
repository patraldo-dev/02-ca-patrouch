// src/routes/admin/+page.server.js
export async function load({ data }) {
  // Preserve layout data (including user)
  return { ...data };
}
