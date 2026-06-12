import kyOriginal from "ky";
import { Agent } from "undici";
import type { ProxyAgent } from "undici";

type ExtendedRequestInit = RequestInit & {
  dispatcher?: ProxyAgent | Agent;
  duplex?: "half" | "full";
};

const tlsAgent =
  process.env.DISABLE_SSL_VERIFICATION === "true"
    ? new Agent({ connect: { rejectUnauthorized: false } })
    : undefined;

export const rebuildFetchWithoutChunkedEncoding = async (
  input: string | URL | Request,
  init?: ExtendedRequestInit,
): Promise<Response> => {
  if (typeof input === "string" || input instanceof URL) {
    return fetch(input, { ...init, dispatcher: init?.dispatcher ?? tlsAgent } as ExtendedRequestInit);
  }
  const request = input;
  if (request.bodyUsed) {
    throw new Error("Request body already consumed");
  }
  const headers = new Headers(request.headers);
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  const mergedInit: RequestInit & {
    dispatcher?: ProxyAgent | Agent;
    duplex?: "half" | "full";
  } = {
    method: init?.method ?? request.method,
    headers,
    body:
      init?.body ?? (request.body ? await request.arrayBuffer() : undefined),
    cache: init?.cache ?? request.cache,
    credentials: init?.credentials ?? request.credentials,
    integrity: init?.integrity ?? request.integrity,
    mode: init?.mode ?? request.mode,
    redirect: init?.redirect ?? request.redirect,
    referrer: init?.referrer ?? request.referrer,
    referrerPolicy: init?.referrerPolicy ?? request.referrerPolicy,
    signal: init?.signal ?? request.signal,
    keepalive: init?.keepalive ?? request.keepalive,
    dispatcher: init?.dispatcher ?? tlsAgent,
    duplex: init?.duplex ?? (request.body ? "half" : undefined),
  };
  return fetch(request.url, mergedInit);
};

export const ky = kyOriginal.create({
  fetch: rebuildFetchWithoutChunkedEncoding,
});
