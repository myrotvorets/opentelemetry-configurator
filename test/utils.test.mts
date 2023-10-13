import { expect } from 'chai';
import { filterBlanksAndNulls } from '../lib/utils.mjs';

describe('utils', function () {
    describe('filterBlanksAndNulls', function () {
        it('should return expected results', function () {
            const input = ['', ' ', 'null', 'foo', 'bar', 'null', 'baz', ''];
            const expected = ['foo', 'bar', 'baz'];
            const actual = filterBlanksAndNulls(input);

            expect(actual).to.deep.equal(expected);
        });
    });
});
