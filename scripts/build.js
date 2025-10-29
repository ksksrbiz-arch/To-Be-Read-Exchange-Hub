#!/usr/bin/env node
/**
 * Production build script
 * Creates a dist/ directory with all production-ready files
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Clean dist directory
console.log('🧹 Cleaning dist/ directory...');
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });

// Copy source files
console.log('📦 Copying source files...');
fs.cpSync(path.join(ROOT, 'src'), path.join(DIST, 'src'), { recursive: true });

// Copy public directory
console.log('📦 Copying public assets...');
fs.cpSync(path.join(ROOT, 'public'), path.join(DIST, 'public'), { recursive: true });

// Copy scripts directory
console.log('📦 Copying scripts...');
fs.cpSync(path.join(ROOT, 'scripts'), path.join(DIST, 'scripts'), { recursive: true });

// Create production package.json (dependencies only, no devDependencies)
console.log('📝 Creating production package.json...');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  main: packageJson.main,
  scripts: {
    start: packageJson.scripts.start,
  },
  keywords: packageJson.keywords,
  author: packageJson.author,
  license: packageJson.license,
  dependencies: packageJson.dependencies,
};
fs.writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(prodPackageJson, null, 2));

// Copy .env.example as a template
console.log('📝 Copying .env.example...');
fs.copyFileSync(path.join(ROOT, '.env.example'), path.join(DIST, '.env.example'));

// Copy README
console.log('📝 Copying README...');
fs.copyFileSync(path.join(ROOT, 'README.md'), path.join(DIST, 'README.md'));

// Copy LICENSE
console.log('📝 Copying LICENSE...');
fs.copyFileSync(path.join(ROOT, 'LICENSE'), path.join(DIST, 'LICENSE'));

console.log('✅ Build complete! Production files are in dist/');
console.log('');
console.log('📊 Build summary:');
console.log('  - Source code: dist/src/');
console.log('  - Public assets: dist/public/');
console.log('  - Scripts: dist/scripts/');
console.log('  - Production package.json (no devDependencies)');
console.log('');
console.log('🚀 To deploy:');
console.log('  1. cd dist/');
console.log('  2. npm install --production');
console.log('  3. Set up .env file with production values');
console.log('  4. npm start');
