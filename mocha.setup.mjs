import { use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { reset } from 'testdouble';

use(chaiAsPromised);

/** @type {import('mocha').RootHookObject} */
export const mochaHooks = {
    /** @returns {void} */
    afterEach() {
        reset();
    },
};
