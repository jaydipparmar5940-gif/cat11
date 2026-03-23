const fs = require('fs');
const path = require('path');

const files = [
  'workers/match-lifecycle.worker.js',
  'services/scraper.service.js',
  'repositories/player.repository.js',
  'repositories/match.repository.js'
];

files.forEach(f => {
  const fullPath = path.join(__dirname, 'backend', 'src', f);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let orig = content;

  // 1. Remove Pool require
  content = content.replace(/const\s+\{\s*Pool\s*\}\s*=\s*require\(['"]pg['"]\);?\r?\n?/g, '');
  
  // 2. Replace Pool initialization with prisma import
  const relPath = f.startsWith('workers/') || f.startsWith('services/') || f.startsWith('repositories/') ? '../utils/prisma' : './prisma';
  content = content.replace(/const\s+pool\s*=\s*new\s+Pool\([^)]+\);?\r?\n?/g, `const prisma = require('${relPath}');\n`);

  // 3. Replace `const { rows } = await pool.query(query, [params])` with `const rows = await prisma.$queryRawUnsafe(query, ...params)`
  // This is a bit tricky with regex, so we'll do literal replacements or a targeted approach.
  // Actually, we can just replace pool.query with prisma.$queryRawUnsafe
  
  // Replace `const { rows } = await pool.query(...)`
  // We'll replace `const { rows } =` with `const rows =` and `pool.query` with `prisma.$queryRawUnsafe`
  
  // Example: const { rows } = await pool.query(`SELECT...`, [matchId])
  // Becomes: const rows = await prisma.$queryRawUnsafe(`SELECT...`, matchId) // Wait, $queryRawUnsafe expects variadic args, not an array.
  
  // Let's just do targeted string replacements for the repositories since they are simple.
  if (f === 'repositories/match.repository.js') {
    content = content.replace(/const\s+\{\s*rows\s*\}\s*=\s*await\s+pool\.query\(/g, 'const rows = await prisma.$queryRawUnsafe(');
    // Remove the array brackets for params
    content = content.replace(/\, \[\$1\]/g, ', matchId');
    content = content.replace(/\, \[matchId\]/g, ', matchId');
    content = content.replace(/\, params\)/g, ', ...params)');
  }
  
  if (f === 'repositories/player.repository.js') {
    content = content.replace(/const\s+\{\s*rows\s*\}\s*=\s*await\s+pool\.query\(/g, 'const rows = await prisma.$queryRawUnsafe(');
    content = content.replace(/\, \[matchId\]/g, ', matchId');
  }

  if (content !== orig) {
    fs.writeFileSync(fullPath, content);
    console.log('Fixed:', f);
  }
});
