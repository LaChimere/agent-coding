// Generated from api/openapi.json by scripts/generate-client.js. Do not edit by hand.
export async function getUser(id) {
  return request(`/users/${id}`);
}
