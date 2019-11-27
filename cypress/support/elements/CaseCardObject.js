class CaseCardObject{
    getCaseCardTile(){
        return cy.get('.react-data-card-view')
    }
    getCaseCardCellSummaryValue(){
        return cy.get('.react-data-card-attribute-summary')
    }
}
export default CaseCardObject