/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import * as odo from '../src/odo';
import { CliExitData, Cli } from '../src/cli';
import * as assert from 'assert';
import * as sinon from 'sinon';

suite("odo integration tests", () => {
    const odoCli: odo.Odo = odo.OdoImpl.getInstance();
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('odo commands', () => {
        test('odo-getVersion() returns version number with expected output', async () => {
            const testData: CliExitData = { stdout: 'odo v0.0.13 (65b5bed8) \n line two', stderr: undefined, error: undefined };
            sandbox.stub(Cli.prototype, 'execute').resolves(testData);

            const result: string = await odoCli.getOdoVersion();
            assert.equal(result, '0.0.13');
        });

        test('odo-getVersion() returns version 0.0.0 for unexpected output', async () => {
            const invalidData: CliExitData = { error: undefined, stderr: '', stdout: 'odounexpected v0.0.13 (65b5bed8) \n line two' };
            sandbox.stub(Cli.prototype, 'execute').resolves(invalidData);

            const result: string = await odoCli.getOdoVersion();
            assert.equal(result, '0.0.0');
        });
    });

    suite("odo catalog integration", () => {
        const http = 'httpd';
        const nodejs = 'nodejs';
        const python = 'python';

        const odoCatalog: string = [
            `NAME            PROJECT                 TAGS`,
            `${nodejs}       openshift               1.0`,
            `${python}       openshift               1.0,2.0`,
            `${http}         openshift               2.2,2.3,latest`
        ].join('\n');
        let result: string[];
        const catalogData: CliExitData = {
            error: null,
            stderr: '',
            stdout: odoCatalog
        };

        setup(async () => {
            sandbox.stub(Cli.prototype, 'execute').resolves(catalogData);
            result = await odoCli.getComponentTypes();
        });

        test("Odo->getComponentTypes() returns correct number of component types", () => {
            assert.equal(result.length, 3);
        });

        test("Odo->getComponentTypes() returns correct component type names", () => {
            const resultArray = result.filter((element: string) => {
                return element === http || element === nodejs || element === python;
            });
            assert.equal(resultArray.length, 3);
        });

        test("Odo->getComponentTypeVersions() returns correct number of tags for component type", () => {
            return Promise.all([
                odoCli.getComponentTypeVersions(nodejs).then((result)=> {
                    assert.equal(result.length, 1);
                }),
                odoCli.getComponentTypeVersions(python).then((result)=> {
                    assert.equal(result.length, 2);
                }),
                odoCli.getComponentTypeVersions(http).then((result)=> {
                    assert.equal(result.length, 3);
                })
            ]);
        });
    });

    suite("odo service integration", () => {
        const svc1 = 'svc1';
        const svc2 = 'svc2';
        const svc3 = 'svc3';

        const odoPlans: string = [
            `NAME      PLANS`,
            `${svc1}   default,free,paid`,
            `${svc2}   default,free`,
            `${svc3}   default`
        ].join('\n');
        const data: CliExitData = { error: undefined, stderr: null, stdout: odoPlans };

        setup(() => {
            sandbox.stub(Cli.prototype, 'execute').resolves(data);
        });

        test("Odo->getServiceTemplates() returns correct number of services", async () => {
            const result: string[] = await odoCli.getServiceTemplates();
            assert.equal(result.length, 3);
            assert.equal(result[0], svc1);
            assert.equal(result[1], svc2);
            assert.equal(result[2], svc3);
        });

        test("Odo->getServiceTemplatePlans(service) returns correct number of plans from service", async () => {
            const result: string[] = await odoCli.getServiceTemplatePlans(svc1);
            assert.equal(result.length, 3);
            assert.equal(result[0], 'default');
            assert.equal(result[1], 'free');
            assert.equal(result[2], 'paid');
        });
    });
});