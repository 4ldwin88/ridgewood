export type ScopeClass = ''|'inclusion'|'exclusion'|'allowance'|'interface'|'owner_supplied';
export interface ScopeItem {id:string;description:string;classification:ScopeClass;partyId:string;sourceRevisionId:string;criterionRevisionId:string;acceptanceCriteria:string;programRevisionId:string}
export const blankScopeItem=(id:string):ScopeItem=>({id,description:'',classification:'',partyId:'',sourceRevisionId:'',criterionRevisionId:'',acceptanceCriteria:'',programRevisionId:''});
