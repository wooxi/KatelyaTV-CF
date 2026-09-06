/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';

export const runtime = 'edge';

const PROBE_KEYWORD = encodeURIComponent('庆余年');
const MAX_BATCH = 50;
const PROBE_TIMEOUT_MS = 8000;

interface ProbeItem {
  key: string;
  api: string;
}

interface ProbeResult {
  key: string;
  ok: boolean;
  latencyMs: number;
  hits: number;
  error?: string;
}

async function probeOne(item: ProbeItem): Promise<ProbeResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const target = item.api + (item.api.includes('?') ? '&' : '?') + 'wd=' + PROBE_KEYWORD;
    const resp = await fetch(target, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const latencyMs = Date.now() - started;
    if (!resp.ok) {
      return { key: item.key, ok: false, latencyMs, hits: 0, error: 'HTTP ' + resp.status };
    }
    const body = (await resp.json()) as { code?: number; list?: unknown[] };
    if (body.code !== 1 || !Array.isArray(body.list)) {
      return { key: item.key, ok: false, latencyMs, hits: 0, error: 'bad payload' };
    }
    return { key: item.key, ok: true, latencyMs, hits: body.list.length };
  } catch (err) {
    return {
      key: item.key,
      ok: false,
      latencyMs: Date.now() - started,
      hits: 0,
      error: err instanceof Error ? err.message : 'probe failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  if (storageType === 'localstorage') {
    return NextResponse.json({ error: '不支持本地存储进行管理员配置' }, { status: 400 });
  }

  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = authInfo.username;

    const config = await getConfig();
    if (username !== process.env.USERNAME) {
      const user = config.UserConfig.Users.find((u) => u.username === username);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: '权限不足' }, { status: 401 });
      }
    }

    const body = (await request.json()) as { sources?: ProbeItem[] };
    const sources = (body.sources || []).filter(
      (s) => s && typeof s.api === 'string' && /^https?:\/\//.test(s.api)
    );
    if (sources.length === 0) {
      return NextResponse.json({ error: '参数格式错误' }, { status: 400 });
    }
    const batch = sources.slice(0, MAX_BATCH);

    const results = await Promise.all(batch.map((s) => probeOne({ key: s.key, api: s.api })));
    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('source probe error:', error);
    return NextResponse.json({ error: '探测失败' }, { status: 500 });
  }
}
