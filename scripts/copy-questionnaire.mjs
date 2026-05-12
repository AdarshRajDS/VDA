import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcJson = path.join(root, 'VDA63_Questionnaire_Master_Full_Filled_from_report_74_UPDATED_V9.json');
const destDir = path.join(root, 'public');
const destJson = path.join(destDir, 'questionnaire.json');

if (!fs.existsSync(srcJson)) {
  console.error('Missing questionnaire source:', srcJson);
  process.exit(1);
}

const raw = fs.readFileSync(srcJson, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('Invalid JSON:', e);
  process.exit(1);
}

const requiredTop = ['schemaVersion', 'questions', 'questionCount'];
for (const k of requiredTop) {
  if (!(k in data)) {
    console.error('Questionnaire missing field:', k);
    process.exit(1);
  }
}

if (!Array.isArray(data.questions) || data.questions.length === 0) {
  console.error('questions must be a non-empty array');
  process.exit(1);
}

if (data.questionCount !== data.questions.length) {
  console.warn(
    `Warning: questionCount (${data.questionCount}) !== questions.length (${data.questions.length}); using actual length.`,
  );
}

for (const [i, q] of data.questions.entries()) {
  const id = q?.questionId ?? `#${i}`;
  for (const field of ['questionId', 'globalQuestionCounter', 'title', 'minimumRequirements']) {
    if (!(field in q)) {
      console.error(`Question ${id} missing field: ${field}`);
      process.exit(1);
    }
  }
}

fs.mkdirSync(destDir, { recursive: true });
fs.writeFileSync(destJson, JSON.stringify(data));
console.log('Wrote', destJson, `(${data.questions.length} questions)`);
