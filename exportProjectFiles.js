const fs = require('fs');
const path = require('path');

const PROJECT_DIR = __dirname;
const OUTPUT_FILE = path.join(PROJECT_DIR, 'project_files.txt');
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.vscode'];
const EXCLUDE_FILES = ['package-lock.json'];
const INCLUDE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html', '.md'];

function shouldInclude(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath);
  return INCLUDE_EXTS.includes(ext) && !EXCLUDE_FILES.includes(base);
}

function walk(dir, fileList = []) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        walk(fullPath, fileList);
      }
    } else if (shouldInclude(fullPath)) {
      fileList.push(fullPath);
    }
  });
  return fileList;
}

function exportFiles() {
  const files = walk(PROJECT_DIR);
  let output = '';
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    output += `--- START OF FILE [${file}] ---\n${content}\n--- END OF FILE ---\n`;
  });
  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
  console.log(`Exported ${files.length} files to ${OUTPUT_FILE}`);
}

exportFiles();