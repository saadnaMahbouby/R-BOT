import { URL } from "node:url";
import { env } from "@typebot.io/env";

const BLOCKED_HEADERS = [
  "x-aws-ec2-metadata-token",
  "x-aws-ec2-metadata-token-ttl-seconds",
  "metadata",
  "metadata-flavor",
];

export const validateHttpReqUrl = (urlString: string) => {
  // Allow private IPs if SSRF protection is disabled
  if (process.env.DISABLE_SSRF_PROTECTION === "true") return;

  if (!urlString?.trim()) {
    throw new Error("URL is required");
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Only allow HTTP/HTTPS protocols
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(
      `Protocol "${url.protocol}" is not allowed. Only HTTP and HTTPS are permitted.`,
    );
  }

  let hostname = url.hostname.toLowerCase();

  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }

  const blockedHostnames = [
    "metadata.google.internal",
    "metadata.goog",
    "metadata",
  ];

  if (blockedHostnames.includes(hostname)) {
    throw new Error(
      "Access to cloud metadata services is not allowed for security reasons.",
    );
  }

  if (hostname === "localhost" && env.NODE_ENV !== "development") {
    throw new Error("Access to localhost is not allowed for security reasons.");
  }

  const suspiciousPatterns = [
    /^\d{8,10}$/,
    /^0x[0-9a-f]+$/i,
    /^0[0-7]{3}\./i,
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(hostname))) {
    throw new Error(
      "IP address encoding (decimal, hex, octal) is not allowed for security reasons.",
    );
  }

  const ip = parseIPAddress(hostname);
  if (ip) {
    validateIPAddress(ip);
  }
};

export const validateHttpReqHeaders = (
  headers?:
    | Record<string, string | string[] | undefined>
    | Array<{ key?: string; value?: string }>,
) => {
  if (!headers) return;

  const headersList = Array.isArray(headers)
    ? headers
    : Object.entries(headers).map(([key, value]) => ({
        key,
        value: String(value),
      }));

  for (const header of headersList) {
    if (!header.key) continue;

    const key = header.key.toLowerCase().trim();

    if (BLOCKED_HEADERS.some((blocked) => key.includes(blocked))) {
      throw new Error(
        `Header "${header.key}" is not allowed as it could be used to bypass cloud metadata service protections.`,
      );
    }
  }
};

const parseIPAddress = (hostname: string): ParsedIP | null => {
  const ipv4Match = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
  );
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    if (octets.every((octet) => octet >= 0 && octet <= 255)) {
      return { version: 4, octets };
    }
  }

  if (hostname.includes(":")) {
    return { version: 6, address: hostname };
  }

  return null;
};

type ParsedIP =
  | { version: 4; octets: number[] }
  | { version: 6; address: string };

const validateIPAddress = (ip: ParsedIP) => {
  if (ip.version === 4) {
    const [first, second] = ip.octets;

    if (first === 127) {
      throw new Error(
        "Access to loopback addresses (127.0.0.0/8) is not allowed for security reasons.",
      );
    }

    if (first === 169 && second === 254) {
      throw new Error(
        "Access to link-local addresses (169.254.0.0/16) is not allowed for security reasons. This range includes cloud metadata services.",
      );
    }

    if (first === 10) {
      throw new Error(
        "Access to private network range (10.0.0.0/8) is not allowed for security reasons.",
      );
    }

    if (first === 172 && second >= 16 && second <= 31) {
      throw new Error(
        "Access to private network range (172.16.0.0/12) is not allowed for security reasons.",
      );
    }

    if (first === 192 && second === 168) {
      throw new Error(
        "Access to private network range (192.168.0.0/16) is not allowed for security reasons.",
      );
    }

    if (first === 0) {
      throw new Error(
        "Access to 0.0.0.0/8 range is not allowed for security reasons.",
      );
    }
  }

  if (ip.version === 6) {
    const addr = ip.address.toLowerCase();

    if (addr.startsWith("::ffff:") || addr.startsWith("0:0:0:0:0:ffff:")) {
      const parts = addr.split("ffff:");
      const ipv4Part = parts[parts.length - 1];

      if (ipv4Part.includes(".")) {
        const octets = ipv4Part.split(".").map(Number);
        if (
          octets.length === 4 &&
          octets.every((o) => !isNaN(o) && o >= 0 && o <= 255)
        ) {
          validateIPAddress({ version: 4, octets });
          return;
        }
      }

      const hexGroups = ipv4Part.split(":");
      if (hexGroups.length === 2) {
        const group1 = parseInt(hexGroups[0], 16);
        const group2 = parseInt(hexGroups[1], 16);

        if (!isNaN(group1) && !isNaN(group2)) {
          const octets = [
            (group1 >> 8) & 0xff,
            group1 & 0xff,
            (group2 >> 8) & 0xff,
            group2 & 0xff,
          ];
          validateIPAddress({ version: 4, octets });
          return;
        }
      }
    }

    if (
      addr === "::1" ||
      addr === "0:0:0:0:0:0:0:1" ||
      addr === "0000:0000:0000:0000:0000:0000:0000:0001"
    ) {
      throw new Error(
        "Access to IPv6 loopback (::1) is not allowed for security reasons.",
      );
    }

    if (
      addr.startsWith("fe8") ||
      addr.startsWith("fe9") ||
      addr.startsWith("fea") ||
      addr.startsWith("feb")
    ) {
      throw new Error(
        "Access to IPv6 link-local addresses (fe80::/10) is not allowed for security reasons.",
      );
    }

    if (addr.startsWith("fc") || addr.startsWith("fd")) {
      throw new Error(
        "Access to IPv6 unique local addresses (fc00::/7) is not allowed for security reasons.",
      );
    }
  }
};
