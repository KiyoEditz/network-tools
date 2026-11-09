// src/renderer/src/utils/code-generator.ts
import { HttpRequestPayload } from '../../../shared/types.js';

export class CodeGenerator {
  public static generate(req: HttpRequestPayload, target: 'curl' | 'node-fetch' | 'node-axios' | 'python-requests' | 'python-httpx'): string {
    const method = req.method === 'CUSTOM' ? req.customMethod || 'GET' : req.method;
    const url = req.url || 'http://localhost';

    const headers: Record<string, string> = {};
    for (const h of req.headers || []) {
      if (h.enabled && h.key) headers[h.key] = h.value;
    }

    let bodyStr = '';
    if (req.bodyType === 'raw' && req.rawBodyContent) {
      bodyStr = req.rawBodyContent;
    }

    switch (target) {
      case 'curl': {
        let cmd = `curl -X ${method} "${url}"`;
        for (const [k, v] of Object.entries(headers)) {
          cmd += ` \\\n  -H "${k}: ${v}"`;
        }
        if (bodyStr && method !== 'GET' && method !== 'HEAD') {
          const escaped = bodyStr.replace(/"/g, '\\"');
          cmd += ` \\\n  -d "${escaped}"`;
        }
        return cmd;
      }

      case 'node-fetch': {
        return `// Node.js 18+ / 24+ Native Fetch
const response = await fetch("${url}", {
  method: "${method}",
  headers: ${JSON.stringify(headers, null, 2)},
${bodyStr && method !== 'GET' ? `  body: JSON.stringify(${bodyStr}),\n` : ''}});

const data = await response.json();
console.log(data);`;
      }

      case 'node-axios': {
        return `import axios from 'axios';

const response = await axios({
  method: '${method.toLowerCase()}',
  url: '${url}',
  headers: ${JSON.stringify(headers, null, 2)},
${bodyStr && method !== 'GET' ? `  data: ${bodyStr},\n` : ''}});

console.log(response.data);`;
      }

      case 'python-requests': {
        const headerLines = Object.entries(headers)
          .map(([k, v]) => `    "${k}": "${v}"`)
          .join(',\n');

        return `import requests

url = "${url}"
headers = {
${headerLines}
}
${bodyStr && method !== 'GET' ? `payload = ${bodyStr}\n` : ''}
response = requests.${method.toLowerCase()}(
    url,
    headers=headers${bodyStr && method !== 'GET' ? ', json=payload' : ''}
)

print(response.status_code)
print(response.json())`;
      }

      case 'python-httpx': {
        return `import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        response = await client.${method.toLowerCase()}(
            "${url}",
            headers=${JSON.stringify(headers, null, 4)}${bodyStr && method !== 'GET' ? `, json=${bodyStr}` : ''}
        )
        print(response.status_code)
        print(response.json())

asyncio.run(main())`;
      }

      default:
        return '';
    }
  }
}
