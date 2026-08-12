const mongoose = require('mongoose');
const fs = require('fs');
const mammoth = require('mammoth');
const xlsx = require('xlsx');

mongoose.connect('mongodb://127.0.0.1:27017/nexus')
  /**
   * Core execution routine for the batch document re-parsing utility script.
   * 
   * This asynchronous block is executed immediately after a successful standalone connection to the MongoDB 'nexus' database.
   * Its purpose is to iterate over previously uploaded document files (specifically `.docx` and `.xlsx`), re-read their binary
   * contents from the local file system, re-extract their text/HTML content using specialized parsing libraries, and update
   * the database records. This is typically used for data migrations, search index rebuilding, or applying new parsing logic.
   * 
   * Detailed Workflow:
   * 1. **Data Fetching**: Queries the `File` collection for all documents where `fileType` is exactly 'docx' or 'xlsx'. Logs the total count found.
   * 2. **Iteration**: Loops through each returned file record sequentially.
   * 3. **File System Validation**: Checks if the physical file exists at `f.localPath` using `fs.existsSync`. If missing, logs a warning and skips to the next file.
   * 4. **DOCX Parsing**: If the file is a Word document, it uses the `mammoth` library to convert the binary path directly into raw HTML. It updates `f.content` with this HTML and saves the Mongoose document.
   * 5. **XLSX Parsing**: If the file is an Excel spreadsheet, it loads the workbook via the `xlsx` library. It then iterates through every sheet in the workbook, generates HTML for each sheet, concatenates them into a single `.xlsx-container` div, updates `f.content`, and saves the document.
   * 6. **Error Isolation**: Each file processing step is wrapped in a try-catch block. If parsing a specific file fails (e.g., corrupted binary), the error is logged, but the loop continues processing the remaining files.
   * 7. **Termination**: Once all files are processed, it logs "Done" and gracefully exits the Node process with code `0`.
   * 
   * Database Interactions:
   * - `File.find({ fileType: ... })` - Read operation to get target files.
   * - `f.save()` - Write operation updating the `content` field per document.
   * 
   * @returns {Promise<void>} Resolves when the entire batch processing loop concludes and the process exits.
   */
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
  })
  /**
   * Terminal error handler for the standalone script lifecycle.
   * 
   * This catch block acts as the final safety net for the entire script. It is primarily triggered if the initial
   * Mongoose database connection (`mongoose.connect`) fails. It ensures the script does not hang indefinitely or crash silently.
   * 
   * Workflow:
   * 1. Receives the unhandled exception (usually a MongoDB network or authentication error).
   * 2. Outputs the complete stack trace to `console.error` for diagnostic purposes.
   * 3. Forcefully terminates the Node.js process with an exit code of `1`, indicating an abnormal or failed execution to the calling shell or orchestrator.
   * 
   * @param {Error} err - The fatal exception object that caused the script execution to fail.
   * @returns {void} Does not return; it terminates the process.
   */
  .catch(err => { console.error(err); process.exit(1); });
