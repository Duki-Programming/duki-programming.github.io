(() => {
  const repository = 'Duki-Programming/Doro-Modbus-releases';
  const english = document.documentElement.lang === 'en';
  const compare = (a, b) => {
    const x = a.tag_name.slice(1).split('.').map(Number), y = b.tag_name.slice(1).split('.').map(Number);
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return y[i] - x[i];
    return 0;
  };
  (async () => {
    const releases = [];
    for (let page = 1; ; page++) {
      const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return;
      const batch = await response.json();
      if (!Array.isArray(batch)) return;
      releases.push(...batch);
      if (batch.length < 100) break;
    }
    const release = releases.filter(r => !r.draft && /^v\d+\.\d+\.\d+$/.test(r.tag_name) &&
      r.assets?.some(a => a.name === `Doro.Modbus.${r.tag_name.slice(1)}.exe`)).sort(compare)[0];
    if (!release) return;
    const root = document.querySelector('[data-release-version]');
    const current = root?.dataset.releaseVersion;
    if (/^v\d+\.\d+\.\d+$/.test(current || '') && compare(release, { tag_name: current }) > 0) return;
    const asset = release.assets.find(a => a.name === `Doro.Modbus.${release.tag_name.slice(1)}.exe`);
    const prefix = `https://github.com/${repository}/releases/download/${release.tag_name}/`;
    if (!asset.browser_download_url?.startsWith(prefix)) return;
    // Keep the generated HTML's working link when GitHub is unavailable.
    const link = document.getElementById('download-link');
    if (!link) return;
    link.href = asset.browser_download_url;
    document.getElementById('windows-release-version').textContent = `${release.tag_name} Beta`;
    const notes = document.getElementById('windows-release-notes');
    notes.href = `https://github.com/${repository}/releases/tag/${release.tag_name}`;
    notes.textContent = `${release.tag_name} Beta ${english ? 'release notes ↗' : '릴리스 정보 ↗'}`;
    const details = document.querySelector('#download-windows .download-file');
    if (details && Number.isSafeInteger(asset.size)) details.textContent = `${(asset.size / 1000000).toFixed(1)} MB · ${english ? 'Portable executable · No Python required' : '설치 없이 실행 · Python 설치 불필요'}`;
    if (root) root.dataset.releaseVersion = release.tag_name;
  })().catch(() => {});
})();
