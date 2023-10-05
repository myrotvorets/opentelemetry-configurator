import { use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import { reset } from 'testdouble';

use(chaiAsPromised);
use(chaiSubset);

/** @type {import('mocha').RootHookObject} */
export const mochaHooks = {
    /** @returns {void} */
    afterEach() {
        reset();
    },
};
