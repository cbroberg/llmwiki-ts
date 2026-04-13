import { spawn } from 'node:child_process';

const CLAUDE_BIN = process.env.CLAUDE_BIN ?? 'claude';
const PROJECT_ROOT = process.env.LLMWIKI_PROJECT_ROOT ?? process.cwd();

export function spawnClaude(args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_BIN, args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdin.end();

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`claude timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`claude exited ${code}: ${stderr.slice(0, 500) || stdout.slice(0, 500)}`));
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });
  });
}

export function extractAssistantText(raw: string): string {
  try {
    const body = JSON.parse(raw);
    if (typeof body.result === 'string') return body.result;
    if (body.content && Array.isArray(body.content)) {
      return body.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
    }
    if (Array.isArray(body)) {
      const last = body.filter((m: any) => m.role === 'assistant').pop();
      if (last?.content) {
        if (typeof last.content === 'string') return last.content;
        if (Array.isArray(last.content)) {
          return last.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join('\n');
        }
      }
    }
    return raw;
  } catch {
    return raw;
  }
}
