import { checkMinRequiredVersion } from "../checkMinRequiredVersion";
import { Command } from "../command";
import * as planner from "../deploy/extensions/planner";
import { displayExportInfo, writeFiles } from "../extensions/export";
import { ensureExtensionsApiEnabled } from "../extensions/extensionsHelper";
import { partition } from "../functional";
import { logger } from "../logger";
import { needProjectId } from "../projectUtils";
import { promptOnce } from "../prompt";
import { requirePermissions } from "../requirePermissions";

module.exports = new Command("ext:export")
  .description(
    "export all Extension instances installed on a project to a local Firebase directory"
  )
  .before(requirePermissions, ["firebaseextensions.instances.list"])
  .before(ensureExtensionsApiEnabled)
  .before(checkMinRequiredVersion, "extMinVersion")
  .action(async (options: any) => {
    const projectId = needProjectId(options);

    // Look up the instances that already exist, and add a ^ to their version.
    const have = (await planner.have(projectId)).map((s) => {
      if (s.ref) {
        s.ref.version = `^${s.ref.version}`;
      }
      return s;
    });
    // If an instance spec is missing a ref, that instance must have been installed from a local source.
    const [withRef, withoutRef] = partition(have, (s) => {
      return !!s.ref;
    });
    displayExportInfo(withRef, withoutRef);

    if (
      !options.nonInteractive &&
      !(await promptOnce({
        message: "Do you wish to add these Extension instances to firebase.json?",
        type: "confirm",
        default: true,
      }))
    ) {
      logger.info("Exiting. No changes made.");
      return;
    }

    await writeFiles(withRef, options);
  });