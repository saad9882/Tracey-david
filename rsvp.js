const API_VERSION = process.env.SANITY_API_VERSION || "2023-10-01";

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function normalizeBool(value) {
  return String(value || "").toLowerCase() === "yes";
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  if (typeof req.body !== "string") return {};

  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const params = new URLSearchParams(req.body);
  const out = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return send(res, 405, { ok: false, error: "Method not allowed." });
  }

  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET;
  const token = process.env.SANITY_API_TOKEN;

  if (!projectId || !dataset || !token) {
    return send(res, 500, {
      ok: false,
      error: "Server is not configured. Missing Sanity environment variables."
    });
  }

  const body = parseBody(req);
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const address = String(body.address || "").trim();
  const dietary = String(body.dietary || "").trim();

  if (!firstName || !lastName || !email || !address || !dietary) {
    return send(res, 400, { ok: false, error: "Missing required fields." });
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return send(res, 400, { ok: false, error: "Please provide a valid email address." });
  }

  try {
    // Prevent duplicate RSVP per email.
    const query = encodeURIComponent(`*[_type == "rsvpSubmission" && email == $email][0]{_id}`);
    const emailParam = encodeURIComponent(JSON.stringify(email));
    const queryUrl = `https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}?query=${query}&$email=${emailParam}`;
    const existingRes = await fetch(queryUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    const existingJson = await existingRes.json();
    if (existingJson?.result?._id) {
      return send(res, 409, { ok: false, error: "An RSVP with this email already exists." });
    }

    const doc = {
      _type: "rsvpSubmission",
      submittedAt: body.timestamp || new Date().toISOString(),
      guestTier: String(body.guestTier || "both"),
      firstName,
      lastName,
      email,
      address,
      attendingUK: String(body.attendingUK || ""),
      attendingItaly: String(body.attendingItaly || ""),
      transportNeeded: normalizeBool(body.transportNeeded),
      asoEbi: String(body.asoEbi || "n/a"),
      plusOne: String(body.plusOne || ""),
      hotel: String(body.hotel || ""),
      dietary,
      song: String(body.song || ""),
      message: String(body.message || "")
    };

    const mutationUrl = `https://${projectId}.api.sanity.io/v${API_VERSION}/data/mutate/${dataset}`;
    const createRes = await fetch(mutationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ mutations: [{ create: doc }] })
    });
    const createJson = await createRes.json();

    if (!createRes.ok) {
      return send(res, 500, {
        ok: false,
        error: createJson?.error?.description || "Failed to save RSVP."
      });
    }

    return send(res, 200, {
      ok: true,
      id: createJson?.results?.[0]?.id || null,
      message: "RSVP saved successfully."
    });
  } catch (err) {
    return send(res, 500, {
      ok: false,
      error: err?.message || "Unexpected server error."
    });
  }
};

