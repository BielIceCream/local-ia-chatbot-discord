'use strict';

// Utilitario standalone: gera uma chave AES-256 valida (32 bytes em hex) para
// MEMORY_ENCRYPTION_KEY. Rode com: npm run generate-key
const crypto = require('crypto');

const key = crypto.randomBytes(32).toString('hex');
console.log('\nChave gerada (copie para MEMORY_ENCRYPTION_KEY no seu .env):\n');
console.log(key);
console.log('\nATENCAO:');
console.log('- Guarde esta chave em local seguro FORA do Git/codigo (gerenciador de segredos, cofre, etc).');
console.log('- Se voce ja tem dados salvos, gravar essa chave DEPOIS que eles ja existem em texto puro nao');
console.log('  criptografa retroativamente - apenas as proximas gravacoes serao criptografadas.');
console.log('- Se perder esta chave, os dados criptografados com ela ficam irrecuperaveis. Faca backup dela.\n');
