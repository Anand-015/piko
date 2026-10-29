const fs = require('node:fs');
const path = require('node:path');
const ts = require('../../apps/extension/node_modules/typescript');
const { webcrypto } = require('node:crypto');
module.exports = function createLoader(globals = {}) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} };
    cache.set(filename, loaded);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename,
    }).outputText;
    function localRequire(specifier) {
      if (specifier.endsWith('?script&iife')) return { default: 'src/content/form-scanner.js' };
      if (!specifier.startsWith('.')) throw new Error(`Unexpected dependency: ${specifier}`);
      let resolved = path.resolve(path.dirname(filename), specifier);
      if (!fs.existsSync(resolved)) resolved += '.ts';
      return load(resolved);
    }
    const runtime = { crypto: webcrypto, ...globals };
    new Function('exports', 'require', 'module', ...Object.keys(runtime), output)(loaded.exports, localRequire, loaded, ...Object.values(runtime));
    return loaded.exports;
  }
  return load;
};
