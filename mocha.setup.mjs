import { use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiSubset from 'chai-subset';
import chaiThings from 'chai-things';
import { reset } from 'testdouble';

use(chaiAsPromised);
use(chaiSubset);
use(chaiThings);

/** @type {import('mocha').RootHookObject} */
export const mochaHooks = {
    /** @returns {void} */
    afterEach() {
        reset();
    },
};
