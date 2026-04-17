import { User } from "../models/index.js";
import { Op } from "sequelize";
import { activeUsersTotal } from "../middlewares/metrics.middleware.js";

const UPDATE_INTERVAL_MS = 30_000;
const ACTIVE_THRESHOLD_MINUTES = 5;

let stopped = false;

export function startActiveUsersUpdater() {
  if (startActiveUsersUpdater.started) return;
  startActiveUsersUpdater.started = true;

  (async function update() {
    if (stopped) return;

    try {
      const thresholdDate = new Date(Date.now() - ACTIVE_THRESHOLD_MINUTES * 60 * 1000);
      const count = await User.count({
        where: {
          lastSeen: { [Op.gt]: thresholdDate },
        },
      });
      activeUsersTotal.set(count);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to update active_users_total:", err);
    }

    if (!stopped) setTimeout(update, UPDATE_INTERVAL_MS);
  })();
}

export function stopActiveUsersUpdater() {
  stopped = true;
  startActiveUsersUpdater.started = false;
}
