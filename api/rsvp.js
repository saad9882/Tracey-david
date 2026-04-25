const missing = [];
if (!projectId) missing.push("SANITY_PROJECT_ID");
if (!dataset) missing.push("SANITY_DATASET");
if (!token) missing.push("SANITY_API_TOKEN");

if (missing.length) {
  return sendJson(res, 500, {
    ok: false,
    error: `Missing env vars: ${missing.join(", ")}`
  });
}
