// src/main/services/http-client.ts
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { HttpRequestPayload, HttpResponsePayload, NetworkTiming } from '../../shared/types.js';
import { VariableEngine } from './variable-engine.js';
import { globalCookieJar } from './cookie-jar.js';
import { ProxyManager } from './proxy-manager.js';
import { ScriptSandbox } from './script-sandbox.js';

export class HttpClient {
  public static async execute(
    rawReq: HttpRequestPayload,
    envVars?: any[]
  ): Promise<HttpResponsePayload> {
    const localVars: Record<string, string> = {};

    // 1. Run Pre-request Script (if any)
    if (rawReq.preRequestScript) {
      const urlObj = new URL(rawReq.url.startsWith('http') ? rawReq.url : `http://${rawReq.url}`);
      const preResult = ScriptSandbox.run(rawReq.preRequestScript, {
        origin: urlObj.origin,
        environment: envVars,
        localVars,
      });
      Object.assign(localVars, preResult.modifiedLocalVars);
    }

    // 2. Interpolate Variables (URL, Headers, Query Params, Body)
    const varContext = { environment: envVars, localVars };
    let targetUrl = VariableEngine.resolve(rawReq.url, varContext);
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `http://${targetUrl}`;
    }

    const parsedUrl = new URL(targetUrl);

    // Append Query Parameters
    if (rawReq.queryParams && rawReq.queryParams.length > 0) {
      for (const q of rawReq.queryParams) {
        if (q.enabled && q.key) {
          const k = VariableEngine.resolve(q.key, varContext);
          const v = VariableEngine.resolve(q.value, varContext);
          parsedUrl.searchParams.append(k, v);
        }
      }
    }

    // 3. Assemble Headers
    const headers: Record<string, string> = {};
    if (rawReq.headers) {
      for (const h of rawReq.headers) {
        if (h.enabled && h.key) {
          const k = VariableEngine.resolve(h.key, varContext);
          const v = VariableEngine.resolve(h.value, varContext);
          headers[k] = v;
        }
      }
    }

    // Inject Geo-Spoofing & Client IP Headers (if enabled)
    if (rawReq.geoSpoof && rawReq.geoSpoof.enabled) {
      const spoofIp = rawReq.geoSpoof.customIp
        ? VariableEngine.resolve(rawReq.geoSpoof.customIp, varContext)
        : VariableEngine.rand(1, 220) + '.' + VariableEngine.rand(1, 250) + '.' + VariableEngine.rand(1, 250) + '.' + VariableEngine.rand(1, 250);

      headers['X-Forwarded-For'] = spoofIp;
      headers['X-Real-IP'] = spoofIp;
      headers['CF-Connecting-IP'] = spoofIp;
      headers['True-Client-IP'] = spoofIp;
      if (rawReq.geoSpoof.countryCode) {
        headers['CF-IPCountry'] = rawReq.geoSpoof.countryCode;
        headers['X-Geo-Country'] = rawReq.geoSpoof.countryCode;
      }
    }

    // Inject Auth Headers
    if (rawReq.auth) {
      if (rawReq.auth.type === 'bearer' && rawReq.auth.bearerToken) {
        const token = VariableEngine.resolve(rawReq.auth.bearerToken, varContext);
        headers['Authorization'] = `Bearer ${token}`;
      } else if (rawReq.auth.type === 'basic') {
        const u = VariableEngine.resolve(rawReq.auth.basicUsername || '', varContext);
        const p = VariableEngine.resolve(rawReq.auth.basicPassword || '', varContext);
        const b64 = Buffer.from(`${u}:${p}`).toString('base64');
        headers['Authorization'] = `Basic ${b64}`;
      } else if (rawReq.auth.type === 'apiKey' && rawReq.auth.apiKeyName && rawReq.auth.apiKeyValue) {
        const k = VariableEngine.resolve(rawReq.auth.apiKeyName, varContext);
        const v = VariableEngine.resolve(rawReq.auth.apiKeyValue, varContext);
        if (rawReq.auth.apiKeyAddTo === 'query') {
          parsedUrl.searchParams.append(k, v);
        } else {
          headers[k] = v;
        }
      }
    }

    // Inject Cookies from Cookie Jar
    const cookieHeader = await globalCookieJar.getCookieHeader(parsedUrl.toString());
    if (cookieHeader) {
      headers['Cookie'] = headers['Cookie'] ? `${headers['Cookie']}; ${cookieHeader}` : cookieHeader;
    }

    // 4. Prepare Body Payload
    let bodyBuffer: Buffer | null = null;
    const method = rawReq.method === 'CUSTOM' && rawReq.customMethod ? rawReq.customMethod : rawReq.method;

    if (method !== 'GET' && method !== 'HEAD') {
      if (rawReq.bodyType === 'raw' && rawReq.rawBodyContent) {
        const resolvedBody = VariableEngine.resolve(rawReq.rawBodyContent, varContext);
        bodyBuffer = Buffer.from(resolvedBody, 'utf-8');
        if (!headers['Content-Type']) {
          if (rawReq.rawBodyFormat === 'json') headers['Content-Type'] = 'application/json';
          else if (rawReq.rawBodyFormat === 'xml') headers['Content-Type'] = 'application/xml';
          else if (rawReq.rawBodyFormat === 'html') headers['Content-Type'] = 'text/html';
          else headers['Content-Type'] = 'text/plain';
        }
      } else if (rawReq.bodyType === 'x-www-form-urlencoded' && rawReq.urlEncoded) {
        const params = new URLSearchParams();
        for (const item of rawReq.urlEncoded) {
          if (item.enabled && item.key) {
            params.append(
              VariableEngine.resolve(item.key, varContext),
              VariableEngine.resolve(item.value, varContext)
            );
          }
        }
        bodyBuffer = Buffer.from(params.toString(), 'utf-8');
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (rawReq.bodyType === 'graphql' && rawReq.graphqlQuery) {
        const query = VariableEngine.resolve(rawReq.graphqlQuery, varContext);
        let variables = {};
        if (rawReq.graphqlVariables) {
          try {
            variables = JSON.parse(VariableEngine.resolve(rawReq.graphqlVariables, varContext));
          } catch {}
        }
        bodyBuffer = Buffer.from(JSON.stringify({ query, variables }), 'utf-8');
        headers['Content-Type'] = 'application/json';
      }

      if (bodyBuffer) {
        headers['Content-Length'] = bodyBuffer.length.toString();
      }
    }

    // 5. Setup Network Timing & Dispatch
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const timing: NetworkTiming = {
      dnsLookupMs: 0,
      tcpHandshakeMs: 0,
      tlsHandshakeMs: 0,
      ttfbMs: 0,
      downloadMs: 0,
      totalDurationMs: 0,
    };

    const startTime = Date.now();
    let dnsStart = 0;
    let tcpStart = 0;
    let tlsStart = 0;
    let reqFinishTime = 0;
    let firstByteTime = 0;

    const agent = ProxyManager.getAgentForProxy(rawReq.proxy);

    return new Promise<HttpResponsePayload>((resolve) => {
      const options: any = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
        agent,
        rejectUnauthorized: rawReq.rejectUnauthorized ?? false,
      };

      if (rawReq.networkInterface?.localAddress) {
        options.localAddress = rawReq.networkInterface.localAddress;
      }

      const req = transport.request(options, (res) => {
        firstByteTime = Date.now();
        timing.ttfbMs = reqFinishTime > 0 ? firstByteTime - reqFinishTime : 0;

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });

        res.on('end', async () => {
          const endTime = Date.now();
          timing.downloadMs = endTime - firstByteTime;
          timing.totalDurationMs = endTime - startTime;

          const fullBuffer = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || 'text/plain';

          // Capture Cookies
          const setCookies = res.headers['set-cookie'];
          if (setCookies) {
            await globalCookieJar.captureSetCookies(setCookies, parsedUrl.toString());
          }

          // Format Body
          let bodyStr = '';
          const isBinary = /image|video|audio|pdf|octet-stream/i.test(contentType);
          if (isBinary) {
            bodyStr = fullBuffer.toString('base64');
          } else {
            bodyStr = fullBuffer.toString('utf-8');
          }

          // Run Post-response Test Script (if any)
          let testResults: any[] = [];
          if (rawReq.testScript) {
            const scriptRes = ScriptSandbox.run(rawReq.testScript, {
              origin: parsedUrl.origin,
              environment: envVars,
              localVars,
              response: {
                status: res.statusCode || 0,
                statusText: res.statusMessage || '',
                headers: res.headers as any,
                body: bodyStr,
              },
            });
            testResults = scriptRes.testResults;
          }

          resolve({
            requestId: rawReq.id,
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            headers: res.headers as any,
            cookies: Array.isArray(setCookies) ? setCookies : setCookies ? [setCookies] : [],
            body: bodyStr,
            isBase64: isBinary,
            contentType,
            sizeBytes: fullBuffer.length,
            timing,
            testResults,
          });
        });
      });

      // Socket lifecycle timing listeners
      req.on('socket', (socket) => {
        dnsStart = Date.now();
        socket.on('lookup', () => {
          timing.dnsLookupMs = Date.now() - dnsStart;
          tcpStart = Date.now();
        });
        socket.on('connect', () => {
          timing.tcpHandshakeMs = tcpStart > 0 ? Date.now() - tcpStart : 0;
          tlsStart = Date.now();
        });
        socket.on('secureConnect', () => {
          timing.tlsHandshakeMs = tlsStart > 0 ? Date.now() - tlsStart : 0;
        });
      });

      req.on('finish', () => {
        reqFinishTime = Date.now();
      });

      req.on('error', (err: any) => {
        const endTime = Date.now();
        timing.totalDurationMs = endTime - startTime;
        resolve({
          requestId: rawReq.id,
          status: 0,
          statusText: 'Error',
          headers: {},
          cookies: [],
          body: '',
          isBase64: false,
          contentType: 'text/plain',
          sizeBytes: 0,
          timing,
          error: err.message || 'Network request failed',
        });
      });

      if (bodyBuffer) {
        req.write(bodyBuffer);
      }
      req.end();
    });
  }
}
