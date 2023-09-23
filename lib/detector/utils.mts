import { readFile } from 'node:fs/promises';

async function readAndParse(file: string, re: RegExp): Promise<string> {
    try {
        const raw = await readFile(file, { encoding: 'ascii' });
        const lines = raw.trim().split('\n');
        for (const line of lines) {
            const matches = re.exec(line);
            if (matches) {
                return matches[1];
            }
        }
    } catch {
        // Do nothing
    }

    return '';
}

export const getContainerIDFormCGroup = (re: RegExp): Promise<string> => readAndParse('/proc/self/cgroup', re);
export const getContainerIDFormCGroup2 = (re: RegExp): Promise<string> => readAndParse('/proc/self/mountinfo', re);
