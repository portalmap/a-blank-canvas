

# Fix: Status Filter Not Saving and Automation Not Working

## Root Cause

In `src/components/automations/advanced/AdvancedAutomationBuilder.tsx`, line 71, when loading an automation that uses multiple actions:

```typescript
if (config.actions && Array.isArray(config.actions)) {
  setUseMultipleActions(true);
  setActions(config.actions);
  setSelectedAction(null);
  setActionConfig({});  // BUG: clears trigger_config!
}
```

`setActionConfig({})` erases the `trigger_config` object which holds the status filter (`from_status_ids`, `to_status_ids`). This causes two problems:

1. The status selectors show "Qualquer status" instead of the saved values when editing
2. Saving the automation writes an empty config, so the automation either fires for all status changes or stops matching the intended one

## Fix

### `src/components/automations/advanced/AdvancedAutomationBuilder.tsx`

**Line 71** - Instead of clearing `actionConfig`, preserve `trigger_config` (and any other non-action fields):

```typescript
if (config.actions && Array.isArray(config.actions)) {
  setUseMultipleActions(true);
  setActions(config.actions);
  setSelectedAction(null);
  // Preserve trigger_config and other top-level config, only remove actions array
  const { actions: _, ...restConfig } = config;
  setActionConfig(restConfig);
}
```

This extracts the `actions` array but keeps `trigger_config`, `conditions`, and any other top-level properties in `actionConfig`. Since conditions are also loaded separately (lines 80-86), there is no conflict.

No database changes required.

