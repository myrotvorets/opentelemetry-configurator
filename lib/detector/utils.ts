import { promises } from 'fs';

export async function getContainerIDFormCGroup(re: RegExp): Promise<string> {
    try {
        const raw = await promises.readFile('/proc/self/cgroup', { encoding: 'ascii' });
        const lines = raw.trim().split('\n');
        for (const line of lines) {
            const matches = re.exec(line);
            if (matches) {
                return matches[1];
            }
        }
    } catch (e) {
        // Do nothing
    }

    return '';
}
