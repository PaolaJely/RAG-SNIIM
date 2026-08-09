const API_PREFIX = "/api";

function normalizeBackendUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function jsonError(status, message) {
  return Response.json({ detail: message }, { status });
}

export async function onRequest(context) {
  const backendBase = normalizeBackendUrl(context.env.BACKEND_API_URL);
  if (!backendBase) {
    return jsonError(500, "BACKEND_API_URL is not configured.");
  }

  const incomingUrl = new URL(context.request.url);
  const path = Array.isArray(context.params.path)
    ? context.params.path.join("/")
    : context.params.path || "";
  const backendUrl = new URL(`${backendBase}${API_PREFIX}/${path}`);
  backendUrl.search = incomingUrl.search;

  const headers = new Headers(context.request.headers);
  headers.delete("host");

  const init = {
    method: context.request.method,
    headers,
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(context.request.method)) {
    init.body = context.request.body;
  }

  const response = await fetch(backendUrl, init);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("cache-control", "no-store");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
