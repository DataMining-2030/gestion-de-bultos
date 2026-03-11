const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const envPath = path.join(__dirname, '../backend/.env');
const encPath = path.join(__dirname, '../backend/.env.enc');

if (!fs.existsSync(envPath)) {
  console.log('No .env found, skipping encryption.');
  process.exit(0);
}

// Clave simétrica para ofuscar (AES-256-CBC)
const key = crypto.scryptSync('ccd_secure_key_2026_xyz', 'ccd_salt', 32);
const iv = Buffer.alloc(16, 0); // IV fijo para mayor compatibilidad interna

try {
  const data = fs.readFileSync(envPath, 'utf8');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  fs.writeFileSync(encPath, encrypted);
  console.log('Successfully encrypted backend/.env to backend/.env.enc');
} catch (error) {
  console.error('Error encrypting .env file:', error);
  process.exit(1);
}
