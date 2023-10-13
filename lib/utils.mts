export function filterBlanksAndNulls(list: string[]): string[] {
    return list.map((item) => item.trim()).filter((s) => s !== 'null' && s !== '');
}
