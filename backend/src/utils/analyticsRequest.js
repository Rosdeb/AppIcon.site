function extractHostname(value) {
  const input = String(value || "").trim();

  if (!input) {
    return "";
  }

  try {
    const parsed = new URL(input.includes("://") ? input : `http://${input}`);
    return (parsed.hostname || "").toLowerCase();
  } catch {
    return "";
  }
}

function isLocalOrPrivateHost(hostname) {
  if (!hostname) {
    return false;
  }

  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  ) {
    return true;
  }

  if (/^127(?:\.\d{1,3}){3}$/.test(hostname)) {
    return true;
  }

  if (/^10(?:\.\d{1,3}){3}$/.test(hostname)) {
    return true;
  }

  if (/^192\.168(?:\.\d{1,3}){2}$/.test(hostname)) {
    return true;
  }

  const private172Match = hostname.match(/^172\.(\d{1,3})(?:\.\d{1,3}){2}$/);

  if (private172Match) {
    const secondOctet = Number(private172Match[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}

export function shouldSkipAnalyticsForRequest(req) {
  const candidates = [
    req.headers.origin,
    req.headers.referer,
    req.headers["x-forwarded-host"],
    req.headers.host
  ];

  return candidates.some((candidate) => isLocalOrPrivateHost(extractHostname(candidate)));
}
