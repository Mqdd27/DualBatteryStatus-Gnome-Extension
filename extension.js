import St from "gi://St";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

const GLib = imports.gi.GLib;

export default class BatteryStatusExtension extends Extension {
  enable() {
    this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

    this._icon = new St.Icon({
      icon_name: "battery-full-symbolic",
      style_class: "system-status-icon",
    });
    this._indicator.add_child(this._icon);

    this._menu = new PopupMenu.PopupMenu(this._indicator, 0.0, St.Side.TOP, 0);
    this._indicator.setMenu(this._menu);

    Main.panel.addToStatusArea(this.uuid, this._indicator);

    // Track whether low battery warning has been shown
    this._lowBatteryNotified = false;

    this.updateBatteryStatus = this.updateBatteryStatus.bind(this);

    this._batteryUpdateTimer = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      10,
      () => {
        this.updateBatteryStatus();
        return true;
      }
    );

    this.updateBatteryStatus();
  }

  _updateBatteryIcon(percentage) {
    if (percentage >= 50) {
      return "battery-full-symbolic";
    } else if (percentage >= 30) {
      return "battery-medium-symbolic";
    } else {
      return "battery-low-symbolic";
    }
  }

  _showLowBatteryNotification(batteryName, percentage) {
    if (!this._lowBatteryNotified) {
      const message = `${batteryName} is at ${percentage}%. Please Charge!`;
      log(`Low battery notification: ${message}`);
      Main.notify("Low Battery Warning", message);
      this._lowBatteryNotified = true; // Set the flag to avoid duplicate notifications
    }
  }

  updateBatteryStatus() {
    log("Fetching battery status...");

    try {
      // Path to the script using `this.dir`
      const scriptPath = `${this.dir.get_path()}/test.sh`;

      let [success, stdout, stderr, exitCode] =
        GLib.spawn_command_line_sync(scriptPath);

      if (success && exitCode === 0) {
        let batteryData = String.fromCharCode(...stdout)
          .trim()
          .split("\n");
        log("Battery Data: " + batteryData.join(", "));

        // Remove old menu items
        this._indicator.menu.removeAll();

        let highestPercentage = 0;

        batteryData.forEach((line) => {
          if (line) {
            let menuItem = new PopupMenu.PopupMenuItem(line);
            log("Adding menu item: " + line);
            this._indicator.menu.addMenuItem(menuItem);

            // Extract battery percentage and name
            let match = line.match(/(BAT\d+):\s(\d+)%/);
            if (match) {
              let batteryName = match[1];
              let percentage = parseInt(match[2]);

              // Update highest percentage
              if (percentage > highestPercentage) {
                highestPercentage = percentage;
              }

              // Check for low battery
              if (percentage < 20) {
                this._showLowBatteryNotification(batteryName, percentage);
              }
            }
          }
        });

        // Update icon based on the highest battery percentage
        let iconName = this._updateBatteryIcon(highestPercentage);
        this._icon.icon_name = iconName;

        log(`Battery icon updated to: ${iconName}`);
      } else {
        log(
          "Failed to fetch battery status: " + String.fromCharCode(...stderr)
        );
      }
    } catch (error) {
      log("Error while fetching battery status: " + error);
    }
  }

  disable() {
    if (this._batteryUpdateTimer) {
      GLib.source_remove(this._batteryUpdateTimer);
      this._batteryUpdateTimer = null;
    }

    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }

    log("BatteryStatusExtension disabled");
  }
}
