// src/shared/types.ts

export type ProtocolType = 'HTTP' | 'WEBSOCKET' | 'SSE' | 'GRPC' | 'MQTT' | 'TCP' | 'UDP' | 'WEBRTC';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CUSTOM';

export type BodyType = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql';

export type RawBodyFormat = 'json' | 'xml' | 'html' | 'text' | 'javascript';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
  type?: 'text' | 'file';
  filePath?: string;
}

export interface AuthConfig {
  type: 'none' | 'inherit' | 'bearer' | 'basic' | 'apiKey' | 'oauth2' | 'aws4';
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyAddTo?: 'header' | 'query';
  oauth2AccessToken?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsRegion?: string;
  awsService?: string;
}

export interface ProxyConfig {
  enabled: boolean;
  type: 'http' | 'https' | 'socks4' | 'socks5' | 'socks5h';
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
  name?: string;
  countryCode?: string;
}

export interface GeoSpoofConfig {
  enabled: boolean;
  customIp?: string;
  countryCode?: string; // e.g. 'US', 'SG', 'JP', 'ID'
}

export interface NetworkInterfaceConfig {
  localAddress?: string; // Bind specific local interface/IP
}

export interface TlsFingerprintConfig {
  enabled: boolean;
  preset: 'chrome' | 'firefox' | 'safari' | 'custom' | 'default';
  ciphers?: string;
  sigalgs?: string;
  ecdhCurve?: string;
  minVersion?: 'TLSv1.2' | 'TLSv1.3';
  maxVersion?: 'TLSv1.2' | 'TLSv1.3';
  rejectUnauthorized?: boolean;
}

export interface NetworkTiming {
  dnsLookupMs: number;
  tcpHandshakeMs: number;
  tlsHandshakeMs: number;
  ttfbMs: number; // Time to First Byte
  downloadMs: number;
  totalDurationMs: number;
}

export interface HttpRequestPayload {
  id: string;
  method: HttpMethod;
  customMethod?: string;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  bodyType: BodyType;
  rawBodyFormat?: RawBodyFormat;
  rawBodyContent?: string;
  formData?: KeyValuePair[];
  urlEncoded?: KeyValuePair[];
  binaryFilePath?: string;
  graphqlQuery?: string;
  graphqlVariables?: string;
  auth: AuthConfig;
  proxy?: ProxyConfig;
  geoSpoof?: GeoSpoofConfig;
  networkInterface?: NetworkInterfaceConfig;
  preRequestScript?: string;
  testScript?: string;
  rejectUnauthorized?: boolean;
  tlsFingerprint?: TlsFingerprintConfig;
}

export interface HttpResponsePayload {
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string | string[]>;
  cookies: string[];
  body: string; // text or base64
  isBase64: boolean;
  contentType: string;
  sizeBytes: number;
  timing: NetworkTiming;
  testResults?: Array<{ name: string; passed: boolean; error?: string }>;
  error?: string;
}

export interface StreamEvent {
  sessionId: string;
  protocol: ProtocolType;
  direction: 'IN' | 'OUT' | 'SYSTEM';
  timestamp: number;
  type: string; // 'message', 'event', 'packet', 'status', 'error', 'stats'
  payload: any;
  sizeBytes?: number;
  rawHex?: string;
  metadata?: Record<string, any>;
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValuePair[];
}

export interface CookieRecord {
  key: string;
  value: string;
  domain: string;
  path: string;
  expires?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
}

export interface VirtualStorageRecord {
  origin: string;
  type: 'localStorage' | 'sessionStorage';
  key: string;
  value: string;
  updatedAt: number;
}

export interface RequestCollectionItem {
  id: string;
  name: string;
  type: 'request' | 'folder';
  protocol: ProtocolType;
  request?: HttpRequestPayload;
  children?: RequestCollectionItem[];
}
