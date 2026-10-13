import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Tests create scratch directories with mkdtemp(resolve('.cache/<prefix>')),
// which needs the parent to exist; a fresh checkout has no .cache/.
await mkdir(resolve('.cache'), { recursive: true });
