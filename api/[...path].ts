import { createApiApp } from '../server.ts';

const appPromise = createApiApp();

export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}
