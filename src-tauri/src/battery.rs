//! Battery status monitoring using standard Windows GetSystemPowerStatus API.

use crate::models::BatteryStats;

#[cfg(target_os = "windows")]
pub fn get_battery_stats() -> Option<BatteryStats> {
    use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

    let mut status = SYSTEM_POWER_STATUS::default();
    if unsafe { GetSystemPowerStatus(&mut status) }.is_ok() {
        // BatteryLifePercent == 255 means unknown or no battery
        // BatteryFlag 128 means no system battery
        if status.BatteryLifePercent <= 100 && status.BatteryFlag != 128 {
            let is_charging = (status.BatteryFlag & 8) != 0;
            let is_plugged_in = status.ACLineStatus == 1;
            let time_remaining = if status.BatteryLifeTime != u32::MAX && status.BatteryLifeTime != 0 {
                Some(status.BatteryLifeTime)
            } else {
                None
            };

            return Some(BatteryStats {
                percent: status.BatteryLifePercent,
                is_charging,
                is_plugged_in,
                time_remaining_secs: time_remaining,
            });
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
pub fn get_battery_stats() -> Option<BatteryStats> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_battery_read() {
        let stats = get_battery_stats();
        println!("Battery status: {:?}", stats);
        if let Some(b) = stats {
            assert!(b.percent <= 100);
        }
    }
}
