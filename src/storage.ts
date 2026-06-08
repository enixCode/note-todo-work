import * as Minio from 'minio';

const endpoint = new URL(process.env.MINIO_ENDPOINT ?? 'http://localhost:9000');
export const BUCKET = process.env.MINIO_BUCKET ?? '';
if (!BUCKET) throw new Error('MINIO_BUCKET environment variable is required');

export const minio = new Minio.Client({
  endPoint: endpoint.hostname,
  port: Number(endpoint.port) || (endpoint.protocol === 'https:' ? 443 : 80),
  useSSL: endpoint.protocol === 'https:',
  accessKey: process.env.MINIO_ACCESS_KEY ?? '',
  secretKey: process.env.MINIO_SECRET_KEY ?? '',
});

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf-8');
}

export async function getObject(key: string): Promise<string | null> {
  try {
    return await streamToString(await minio.getObject(BUCKET, key));
  } catch (e: any) {
    if (e?.code === 'NoSuchKey' || e?.code === 'NotFound') return null;
    throw e;
  }
}

export async function putObject(key: string, body: string): Promise<void> {
  await minio.putObject(BUCKET, key, body, Buffer.byteLength(body), { 'Content-Type': 'text/plain; charset=utf-8' });
}

export async function deleteObject(key: string): Promise<void> {
  await minio.removeObject(BUCKET, key);
}

export async function listKeys(prefix: string, delimiter?: string): Promise<{ keys: string[]; prefixes: string[] }> {
  const keys: string[] = [];
  const prefixes: string[] = [];
  for await (const obj of minio.listObjectsV2(BUCKET, prefix, !delimiter)) {
    if (obj.prefix) prefixes.push(obj.prefix);
    else if (obj.name) keys.push(obj.name);
  }
  return { keys, prefixes };
}
