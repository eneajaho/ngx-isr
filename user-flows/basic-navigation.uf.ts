// Your custom interactions with the page
import {
  UserFlowContext,
  UserFlowInteractionsFn,
  UserFlowProvider,
} from "@push-based/user-flow";

const interactions: UserFlowInteractionsFn = async (
  ctx: UserFlowContext
): Promise<any> => {
  const { flow, collectOptions, page } = ctx;
  const { url } = collectOptions;

  let count = 10;

  await page.setCacheEnabled(false);

  while (count > 0) {

    // await waitForTimeout(1000);

    await flow.navigate(url, {
      stepName: `${count} - Navigate to ${url}`,
    });

    count--;
  }

  // ℹ Tip:
  // Read more about the other measurement modes here:
  // https://github.com/push-based/user-flow/blob/main/packages/cli/docs/writing-basic-user-flows.md
};

const userFlowProvider: UserFlowProvider = {
  flowOptions: { name: "Basic Navigation Example" },
  interactions,
};

const waitForTimeout = (milliseconds: number): Promise<void> => {
  return new Promise(r => setTimeout(r, milliseconds));
}

module.exports = userFlowProvider;