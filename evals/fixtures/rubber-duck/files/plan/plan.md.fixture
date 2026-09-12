# Storage migration plan

Goal: move all writes to the new store without losing or duplicating accepted customer updates.

Enable dual writes, switch reads after one hour of healthy metrics, then disable the old store. If
the new store fails, switch reads back. The plan does not define which store owns writes during
rollback or how divergent writes are reconciled.
