import { execSync } from 'child_process';
import { test, expect } from '@playwright/test';
import { checkErrors } from '../support';

const PLUGIN_NAME = 'aibom-console-plugin';
const PLUGIN_PULL_SPEC = process.env.PLUGIN_PULL_SPEC;

function exec(command: string, timeoutMs = 360000) {
  try {
    return execSync(command, { timeout: timeoutMs, encoding: 'utf-8' });
  } catch (e) {
    console.error('Command failed:', command, e);
    return '';
  }
}

function installHelmChart() {
  exec(
    `helm upgrade -i ${PLUGIN_NAME} charts/openshift-console-plugin -n ${PLUGIN_NAME} --create-namespace --set plugin.image=${PLUGIN_PULL_SPEC}`,
  );
  exec(`oc rollout status -n ${PLUGIN_NAME} deploy/${PLUGIN_NAME} -w --timeout=300s`);
  exec('oc rollout status -w deploy/console -n openshift-console --timeout=300s');
}

function deleteHelmChart() {
  exec(`helm uninstall ${PLUGIN_NAME} -n ${PLUGIN_NAME} && oc delete namespaces ${PLUGIN_NAME}`);
}

// Requires an image already pushed to PLUGIN_PULL_SPEC and a real OpenShift
// cluster (`oc login`) -- not run as part of `yarn test`. See README's
// Deployment section.
test.describe('AIBOMs page', () => {
  test.beforeAll(() => {
    installHelmChart();
  });

  test.afterEach(async ({ page }) => {
    await checkErrors(page);
  });

  test.afterAll(() => {
    deleteHelmChart();
  });

  test('nav item opens the AIBOMs list page', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-quickstart-id="qs-nav-home"]').click();
    await page.getByTestId('nav').getByText('AIBOMs').click();
    await expect(page).toHaveURL(/\/aiboms/);
    await expect(page).toHaveTitle(/AIBOMs/);
  });
});
