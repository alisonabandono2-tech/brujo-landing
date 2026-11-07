import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const file of ['index.html','_redirects'])await copyFile(file,'dist/'+file);
await cp('assets','dist/assets',{recursive:true});
console.log('Landing publicada em dist; funções e segredos ficam fora do diretório público.');
