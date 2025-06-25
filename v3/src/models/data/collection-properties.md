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
