// import PluginAPITester from "../support/plugin_elements/PluginAPITester";

// const apiTester = new PluginAPITester;
// const url = "https://codap.concord.org/releases/staging/?di=https://concord-consortium.github.io/codap-data-interactives//DataInteractiveAPITester/index.html",
// data_filename = "SmokeTestData.csv" 

// function createDataContext(contextName){
//     console.log('In createDataContext');
//     var message = '{"action": "create","resource": "dataContext","values": {"name" : "'+contextName+ '", "title": "'+contextName+'","description": "Test data with different types"}}'

//     apiTester.sendMessage(message);
//     apiTester.getResponseArea()//get the text response somehow to verify data context got created
// }

// function createCollectionWithAttributes(attributes,types,contextName) {
//     var i=0;
//     var attributeToAdd='';
//     var message = '{"action":"create","resource":"dataContext['+contextName+'].collection","values":{"name":"'+contextName+'","attributes":[]}}'

//     for (i,i<attributes.length(),i++){
//         if (i==0){ //check if it is the the first attribute so don't add comma before hash
//             attributeToAdd = '{"name":"'+attributes[i]+'", "type":"'+types[i]+'"}'
//         } else {
//             attributeToAdd = ', {"name":"'+attributes[i]+'", "type":"'+types[i]+'"}'
//         }
//         message = message.insert(-4, attributeToAdd) //adds to the third character in from the end. In this case it will concat it to just prior the last square bracket
//     }

//     apiTester.sendMessage(message);
//     apiTester.getResponseArea()//get the text response somehow to verify collection with attributes got created
// }

// function createGraph(contextName, graphName, xAttr, yAttr,legendAttr, y2Attr) {
//     var message = '{"action":"create","resource":"component","values":{"type":"graph","name":"'+graphName+'","dimensions":{"width":220,"height":220},"position":"top","dataContext":"'+dataContext+'","yAttributeName":"'+yAttr+'","xAttributeName":"'+xAttr+'","legendAttributeName":"'+legendAttr+'","y2AttributeName":"'+y2Attr+'"}}'
//     apiTester.sendMessage(message);
//     apiTester.getResponseArea()//get the text response somehow to verify graph got created
// }

// function addDataByItem(contextName, item){
//     var message='{"action":"create", "resource":"dataContext['+contextName+'].item","values":[{"Sample": "'+item[0]+'", "YesNo":"'+item[1]+'", "WinLose":"'+item[2]+'", "Height":"'+item[3]+'", "Weight":"'+item[4]+'", "Width":"'+item[5]+'", "Eyes":"'+item[6]+'","NumCat":"'+item[7]+'"}]}'

//     apiTester.sendMessage(message);
//     apiTester.getResponseArea()//get the text response somehow to verify data got created
// }

// function addDataByCase(contextName,item) {
//     var message='{"action":"create", "resource":"dataContext['+contextName+'].collection['+contextName+'].case","values":[{"values":{"Sample": "'+item[0]+'", "YesNo":"'+item[1]+'", "WinLose":"'+item[2]+'", "Height":"'+item[3]+'", "Weight":"'+item[4]+'", "Width":"'+item[5]+'", "Eyes":"'+item[6]+'","NumCat":"'+item[7]+'"}}]}'

//     apiTester.sendMessage(message);
//     apiTester.getResponseArea()//get the text response somehow to verify data got created
// }

// describe('it will test graph creation when data is created by item', ()=>{
//     cy.visit(url);
//     cy.getPluginIframe()
// }
// )