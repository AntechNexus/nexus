const mongoose = require('mongoose');
const fs = require('fs');
const mammoth = require('mammoth');
const xlsx = require('xlsx');

mongoose.connect('mongodb://127.0.0.1:27017/nexus')
  .then(async () => {
    const File = require('./src/models/File');
    const files = await File.find({ fileType: { $in: ['docx', 'xlsx'] } });
    console.log('Found', files.length, 'files to re-parse');
    
    for (const f of files) {
      if (!fs.existsSync(f.localPath)) {
        console.log('File not found:', f.localPath);
        continue;
      }
      try {
        if (f.fileType === 'docx') {
          const result = await mammoth.convertToHtml({ path: f.localPath });
          f.content = result.value;
          await f.save();
          console.log('Updated DOCX:', f.fileName);
        } else if (f.fileType === 'xlsx') {
          const workbook = xlsx.readFile(f.localPath);
          let html = '<div class="xlsx-container">';
          for (const sheetName of workbook.SheetNames) {
            html += `<h3>${sheetName}</h3>`;
            const sheet = workbook.Sheets[sheetName];
            html += xlsx.utils.sheet_to_html(sheet);
          }
          html += '</div>';
          f.content = html;
          await f.save();
          console.log('Updated XLSX:', f.fileName);
        }
      } catch (err) {
        console.error('Error updating', f.fileName, err);
      }
    }
    console.log('Done');
    process.exit(0);
  }).catch(err => { console.error(err); process.exit(1); });
