// Quick test to verify GDPR utils are working with the new environment variable
import { encryptSensitiveData, decryptSensitiveData } from './src/utils/gdprUtils.js';

const testData = "Test Customer Name";
console.log('Original data:', testData);

const encrypted = encryptSensitiveData(testData);
console.log('Encrypted:', encrypted);

const decrypted = decryptSensitiveData(encrypted);
console.log('Decrypted:', decrypted);

console.log('Encryption/Decryption working:', testData === decrypted);
