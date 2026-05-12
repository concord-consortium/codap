|Property|Description|Appended Items|Inserted Items|
|--------|-----------|--------------|--------------|
|`groupKeyCaseIds: new Map<string, string>()`|map from group key (stringified attribute values) => case id|Simple insert|Simple insert|
|`caseIds: [] as string[]`|case ids in case table/render order|Append cases|Clear and recreate|
|`caseIdToIndexMap: new Map<string, number>()`|map from case id to case index|Append cases|Clear and recreate|
|`caseIdToGroupKeyMap: new Map<string, string>()`|map from case id to group key (stringified attribute values)|Simple insert|Simple insert|
|`caseGroupMap: new Map<string, CaseInfo>()`|map from group key (stringified attribute values) to CaseInfo|Simple insert|Simple insert|
|`prevCaseIds: undefined as Maybe<string[]>`|previous case ids in case table/render order; used to track case ids no longer in use|Not needed|Not needed|
|`prevCaseIdToGroupKeyMap: undefined as Maybe<Map<string, string>>`|previous map from case id to group key (stringified attribute values); used for remapping case ids when values change|Not needed|Not needed|
|`prevCaseGroupMap: undefined as Maybe<Map<string, CaseInfo>>`|previous map from group key (stringified attribute values) to CaseInfo; used for remapping case ids when values change|Not needed|Not needed|

## What `clearCases()` preserves vs. wipes

`clearCases()` (the first step of a full rebuild) is asymmetric across the maps above, and this asymmetry is load-bearing:

- **Preserved:** `groupKeyCaseIds`. Surviving across rebuilds is how the same set of grouping values always maps to the same case id, so case ids persist across `delete allCases` + `addCases`, attribute reorderings, etc. See [hierarchical-data.md](../../../doc/hierarchical-data.md) for the rationale.
- **Wiped (with a `prev*` snapshot kept for the remapping pass):** `caseIds`, `caseIdToIndexMap`, `caseIdToGroupKeyMap`, `caseGroupMap`. The snapshots feed `getRemappedCaseIds` so cases representing the same set of items can inherit their prior id rather than being treated as new.

A practical consequence: after a full delete-all-cases + re-add, a "previously-seen" group key has `groupKeyCaseIds.get(key)` populated but `caseGroupMap.get(key) === undefined`. The next `updateCaseGroups()` pass must recreate the `caseGroupMap` entry and propagate it to `completeCaseGroups`'s APPEND consumer. Filtering by `!hadCaseIdForGroupKey` (i.e., "brand-new key only") in the additive path drops these preserved-id groups; only the full-rebuild path needs that filter, because its consumer (`getRemappedCaseIds`) treats `newCaseIds` differently — see the comment at the push site in `Collection.updateCaseGroups`.
