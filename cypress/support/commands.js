// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

// Cypress.Commands.add("uploadFile",(selector, filename, type="")=>{
//     // cy.fixture(filename).as("image");

//     return cy.get(selector).then(subject => {
//         return cy.fixture(filename,'base64')
//             .then(Cypress.Blob.base64StringToBlob)
//         // From Cypress document: https://docs.cypress.io/api/utilities/blob.html#Examples
//         // return Cypress.Blob.base64StringToBlob(cy.fixture(filename), "image/png")
//             .then((blob) => {
//             const el = subject[0]
//             const nameSegments = filename.split('/')
//             const name = nameSegments[nameSegments.length - 1]
//             const testFile = new File([blob], name, { type });
//             const dataTransfer = new DataTransfer();
//             dataTransfer.items.add(testFile);
//             el.files = dataTransfer.files;
//             return subject;
//         })
//     })
// })
import { addMatchImageSnapshotCommand } from 'cypress-image-snapshot/command'
import 'cypress-commands';

// import fs from 'fs-extra'
// import path from 'path'

addMatchImageSnapshotCommand({ //need to fine tune threshholds
  failureThreshold: 0.05, // threshold for entire image
  failureThresholdType: 'percent', // percent of image or number of pixels
  customDiffConfig: { threshold: 0.1 }, // threshold for each pixel
  capture: 'viewport' // capture viewport in screenshot
})

// Cypress.Commands.add('uploadFile', (selector, fileUrl, type = '') => { //fix this to work with CFM
//     return cy
//       .fixture(fileUrl, 'base64')
//       .then(Cypress.Blob.base64StringToBlob)
//       .then(blob => {
//         return cy.window().then(win => {
//           //papaparse was doing an instanceOf window.File check that was failing so we needed 
//           //https://github.com/cypress-io/cypress/issues/170#issuecomment-411289023 
//           const nameSegments = fileUrl.split('/');
//           const name = nameSegments[nameSegments.length - 1];
//           const testFile = new win.File([blob], name, { type });
//           const event = { dataTransfer: { files: [testFile] } };
//           // return subject
//           return cy.get(selector).trigger('drop', event);
//         });
//       });
// });

Cypress.Commands.add('clickMenuItem', text => {
  cy.log('in clickMenuItem. text: '+text)
  cy.get('a.menu-item span').contains(text)
    .trigger('mousemove')
    .trigger('mousedown',{which:1})
    .trigger('mouseup', {which:1});
});

Cypress.Commands.add('dragAttributeToTarget', (source, attribute, target)=>{
  const dt = new DataTransfer;
  const el={  tableHeader: '.slick-header-column .two-line-header-line-1',
              caseCardHeader: '.react-data-card-attribute',
              graphTile: '.dg-graph-view',
              x_axis:'.dg-axis-view.dg-h-axis',
              x_axis_label: '.dg-axis-view.dg-h-axis .dg-axis-label',
              y_axis: '.dg-axis-view.dg-v-axis',
              y_axis_label: '.dg-axis-view.dg-v-axis .dg-axis-label',
              mapTile: '.dg.leaflet-container'
            }

  var source_el='', target_el='';

  switch(source) {
    case ('table') :
        source_el=el.tableHeader;
        break
    case ('card') :
        source_el=el.caseCardHeader;
        break   
    case ('x1') :
        source_el=el.x_axis;
        break 
    case ('x') :
        source_el=el.x_axis_label;
        break
    case ('y1') :
        source_el=el.y_axis;
        break     
    case ('y') :
        source_el=el.y_axis_label;
        break     
  }

  switch(target) {
    case ('table') :
        target_el=el.tableHeader;
        break
    case ('graph_legend1') :
        target_el=el.graphTile;
        break  
    case ('map') :
        target_el=el.mapTile;
        break  
    case ('x1') :
        target_el=el.x_axis;
        break          
    case ('x') :
        target_el=el.x_axis_label;
        break
    case ('y1') :
        target_el=el.y_axis;
        break      
    case ('y') :
        target_el=el.y_axis_label;
        break    
  }
  cy.get(source_el).contains(attribute)
      .trigger('mousedown', {which:1},{dt})
      .trigger('dragstart', {dt});
  cy.get(target_el)
      .trigger('mousemove',{force:true}, {which:1},{dt})
      .trigger('mousemove', {force:true},{which:1},{dt})
      .trigger('mouseup', {force:true}, {which:1}, {dt})
});

Cypress.Commands.add("getPluginIframe", () => {
  return cy.get(".dg-web-view-frame iframe").iframe()
});

Cypress.Commands.add("getWebviewIframe", () => {
  return cy.get(".dg-web-view-frame iframe").iframe()
});

Cypress.Commands.add("iframe", { prevSubject: "element" }, $iframe => {
  Cypress.log({
      name: "iframe",
      consoleProps() {
          return {
              iframe: $iframe,
          };
      },
  });
  return new Cypress.Promise(resolve => {
      onIframeReady(
          $iframe,
          () => {
              resolve($iframe.contents().find("body"));
          },
          () => {
              $iframe.on("load", () => {
                  resolve($iframe.contents().find("body"));
              });
          }
      );
  });
});

function onIframeReady($iframe, successFn, errorFn) {
  try {
      const iCon = $iframe.first()[0].contentWindow,
          bl = "about:blank",
          compl = "complete";
      const callCallback = () => {
          try {
              const $con = $iframe.contents();
              if ($con.length === 0) {
                  // https://git.io/vV8yU
                  throw new Error("iframe inaccessible");
              }
              successFn($con);
          } catch (e) {
              // accessing contents failed
              errorFn();
          }
      };
      const observeOnload = () => {
          $iframe.on("load.jqueryMark", () => {
              try {
                  const src = $iframe.attr("src").trim(),
                      href = iCon.location.href;
                  if (href !== bl || src === bl || src === "") {
                      $iframe.off("load.jqueryMark");
                      callCallback();
                  }
              } catch (e) {
                  errorFn();
              }
          });
      };
      if (iCon.document.readyState === compl) {
          const src = $iframe.attr("src").trim(),
              href = iCon.location.href;
          if (href === bl && src !== bl && src !== "") {
              observeOnload();
          } else {
              callCallback();
          }
      } else {
          observeOnload();
      }
  } catch (e) {
      // accessing contentWindow failed
      errorFn();
  }
}

Cypress.Commands.add("uploadFile",(selector, filename, type="")=>{
    // cy.fixture(filename).as("file");

    return cy.get(selector).then((subject) => {
        return cy.fixture(filename)
            .then((blob) => {
                console.log(blob)
                // console.log(subject[0])
            const el = subject[0]
            // // const nameSegments = filename.split('/')
            // // const name = nameSegments[nameSegments.length - 1]
            const testFile = new File([blob], filename, { type });
            const dataTransfer = new DataTransfer();
            console.log(testFile)
            dataTransfer.items.add(testFile);
            // dataTransfer.items.add(blob);
            console.log(dataTransfer)
            el.files = dataTransfer.files;
            console.log(subject)
            return subject;
        })
    })
})