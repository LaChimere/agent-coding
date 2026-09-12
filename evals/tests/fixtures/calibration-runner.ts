import { calibrateGraders } from '../../src/grading/calibration.ts';

const project = process.argv[2];
if (project === undefined) {
  throw new Error('Missing calibration project.');
}

const controller = new AbortController();
const interrupt = () => controller.abort(new Error('Fixture interrupted.'));
process.on('SIGINT', interrupt);

try {
  console.log(await calibrateGraders(project, controller.signal));
} finally {
  process.off('SIGINT', interrupt);
}
