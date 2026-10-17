import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

interface BuildInfo {
  version: string;
  builtAt: string;
  commit: string | null;
}

function getBuildInfo(): BuildInfo {
  const packageJson = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8')
  ) as { version: string };
  let commit = process.env.GITHUB_SHA || process.env.COMMIT_SHA || null;
  if (!commit) {
    try {
      commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
    } catch {
      // A source archive without Git metadata may not have a commit hash.
    }
  }
  return { version: packageJson.version, builtAt: new Date().toISOString(), commit };
}

const buildInfo = getBuildInfo();

export default defineConfig({
  base: './',
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo)
  },
  plugins: [{
    name: 'raincheck-build-version',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify(buildInfo, null, 2)}\n`
      });
    }
  }]
});
