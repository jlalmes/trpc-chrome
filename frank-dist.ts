import fs from 'fs';

const files = ['package.json', 'package-lock.json', 'LICENSE'];

for (const file of files) {
  fs.copyFileSync(file, `dist/${file}`);
}
