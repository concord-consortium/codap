import { IAttribute } from "./attribute";
import { CaseInfo, IGroupedCase } from "./data-set-types";

export interface ICollection {
  id: string;
  attributes: IAttribute[];
  cases: IGroupedCase[];
  caseGroups: CaseInfo[];
  caseIds: string[];
}
