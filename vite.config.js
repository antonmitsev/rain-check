import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

function buildVersionPlugin() {
  return {
    name: 'raincheck-build-version',
    generateBundle() {
      const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
      let commit = process.env.GITHUB_SHA || process.env.COMMIT_SHA || null;
      if (!commit) {
        try {
          commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
            cwd: process.cwd(),
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
          }).trim();
        } catch {
          // Builds without Git metadata still get a timestamp and version.
        }
      }
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({
          version,
          builtAt: new Date().toISOString(),
          commit,
        }, null, 2) + '\n',
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [buildVersionPlugin()],
});
