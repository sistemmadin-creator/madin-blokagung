const DEFAULT_ALLOWED_HOSTS = new Set([
  'madinblokagung.com',
  'www.madinblokagung.com',
  'sistem.madinblokagung.com',
]);

function getConfiguredAllowedHosts(): Set<string> {
  const hosts = new Set<string>(DEFAULT_ALLOWED_HOSTS);
  const envOrigins = process.env.ALLOWED_CSRF_ORIGINS || process.env.NEXT_PUBLIC_SITE_URL || '';
  for (const raw of envOrigins.split(',')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      const parsed = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
      hosts.add(parsed.host.toLowerCase());
      hosts.add(parsed.hostname.toLowerCase());
    } catch {
      hosts.add(trimmed.toLowerCase());
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    hosts.add('localhost');
    hosts.add('127.0.0.1');
  }
  return hosts;
}

function isAllowedHost(candidateHost: string, requestHost: string): boolean {
  const cleanCandidate = candidateHost.trim().toLowerCase();
  const cleanCandidateHostname = cleanCandidate.split(':')[0];
  const cleanRequestHost = requestHost.trim().toLowerCase();
  const cleanRequestHostname = cleanRequestHost.split(':')[0];

  if (!cleanCandidate) return false;
  if (cleanRequestHost && (cleanCandidate === cleanRequestHost || cleanCandidateHostname === cleanRequestHostname)) {
    return true;
  }

  const allowedHosts = getConfiguredAllowedHosts();
  if (allowedHosts.has(cleanCandidate) || allowedHosts.has(cleanCandidateHostname)) {
    return true;
  }

  if (cleanCandidateHostname.endsWith('.madinblokagung.com') || cleanCandidateHostname.endsWith('.vercel.app')) {
    return true;
  }

  return false;
}

export interface CsrfCheckOptions {
  requireJsonContentType?: boolean;
}

export interface CsrfCheckResult {
  allowed: boolean;
  status?: number;
  reason?: string;
}

/**
 * Memverifikasi request mutasi (POST/PUT/PATCH/DELETE) berasal dari origin yang sah (Defense-in-Depth CSRF Guard).
 */
export function verifySameOriginRequest(
  request: Request,
  options: CsrfCheckOptions = {}
): CsrfCheckResult {
  const method = (request.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return { allowed: true };
  }

  const requireJson = options.requireJsonContentType ?? true;
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (secFetchSite === 'cross-site') {
    return {
      allowed: false,
      status: 403,
      reason: 'Permintaan lintas situs (cross-site) ditolak oleh proteksi CSRF.',
    };
  }

  let requestHost =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')?.trim() ||
    '';
  if (!requestHost && request.url) {
    try {
      requestHost = new URL(request.url).host;
    } catch {
      requestHost = '';
    }
  }

  const originHeader = request.headers.get('origin')?.trim();
  const refererHeader = request.headers.get('referer')?.trim();
  const sourceUrlRaw = originHeader && originHeader !== 'null' ? originHeader : refererHeader;

  if (sourceUrlRaw) {
    try {
      const parsedSource = new URL(sourceUrlRaw);
      if (parsedSource.protocol !== 'https:' && parsedSource.protocol !== 'http:') {
        return {
          allowed: false,
          status: 403,
          reason: 'Skema Origin tidak valid.',
        };
      }
      if (!isAllowedHost(parsedSource.host, requestHost)) {
        return {
          allowed: false,
          status: 403,
          reason: 'Origin permintaan tidak diizinkan (CSRF Guard).',
        };
      }
    } catch {
      return {
        allowed: false,
        status: 403,
        reason: 'Format header Origin/Referer tidak valid.',
      };
    }
  } else if (process.env.NODE_ENV === 'production') {
    return {
      allowed: false,
      status: 403,
      reason: 'Header Origin atau Referer wajib disertakan pada permintaan mutasi.',
    };
  }

  if (requireJson) {
    const contentLength = request.headers.get('content-length');
    const hasBody = contentLength === null || (contentLength !== '0' && contentLength !== '');
    const contentType = (request.headers.get('content-type') || '').toLowerCase();

    if (hasBody && contentType && !contentType.includes('application/json')) {
      return {
        allowed: false,
        status: 415,
        reason: 'Content-Type wajib application/json.',
      };
    }
  }

  return { allowed: true };
}
