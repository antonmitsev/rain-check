export function showBuildVersion(element: HTMLSpanElement): void {
  // This metadata is bundled with the exact JavaScript currently running, even offline.
  const build = __BUILD_INFO__;
  const hash = typeof build.commit === 'string' && /^[a-f0-9]{7,40}$/i.test(build.commit)
    ? build.commit.slice(0, 7)
    : null;
  element.textContent = `v${build.version}${hash ? ` · ${hash}` : ''}`;
  element.title = [
    `Version: ${build.version}`,
    hash ? `Commit: ${build.commit}` : null,
    `Built: ${build.builtAt}`
  ].filter((value): value is string => Boolean(value)).join(' | ');
}
