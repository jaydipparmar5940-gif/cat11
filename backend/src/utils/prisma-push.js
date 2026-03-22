const cp = require('child_process');
try {
  const out = cp.execSync('npx prisma db push', {encoding: 'utf8'});
  console.log("SUCCESS\n" + out);
} catch (e) {
  require('fs').writeFileSync('tmp/prisma-push-err.txt', e.stderr || e.stdout || e.message);
  console.log('Error written to tmp/prisma-push-err.txt');
}
