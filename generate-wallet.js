const crypto = require('crypto');

// Generate a random private key
const privateKey = '0x' + crypto.randomBytes(32).toString('hex');

// Derive address from private key
const { ethers } = require('ethers');
const wallet = new ethers.Wallet(privateKey);

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('               WALLET GENERATED FOR ALBERT PETER HUELLSTROUNK');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');
console.log('📝 PRIVATE KEY (KEEP SECRET):');
console.log(privateKey);
console.log('');
console.log('📍 WALLET ADDRESS:');
console.log(wallet.address);
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('');
console.log('1. NEVER share your private key with anyone');
console.log('2. Store your private key securely (hardware wallet recommended)');
console.log('3. This wallet is for testing purposes only');
console.log('4. For mainnet deployment, use a hardware wallet');
console.log('5. Add this private key to your .env file:');
console.log('');
console.log('   PRIVATE_KEY=' + privateKey.replace('0x', ''));
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');
console.log('✅ Wallet generated successfully!');
console.log('');

// Save to file for reference
const fs = require('fs');
const walletInfo = {
  privateKey: privateKey,
  address: wallet.address,
  generatedAt: new Date().toISOString(),
  note: 'For Albert Peter Huellstrounk - Keep this private key secure!'
};

fs.writeFileSync('wallet-info.json', JSON.stringify(walletInfo, null, 2));
console.log('💾 Wallet information saved to: wallet-info.json');
console.log('');