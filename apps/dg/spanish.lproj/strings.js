// ==========================================================================
//                              DG Strings
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================

// Place strings you want to localize here.  In your app, use the key and
// localize it using "key string".loc().  HINT: For your key names, use the
// english string with an underscore in front.  This way you can still see
// how your UI will look and you'll notice right away when something needs a
// localized string added to this file!
//
SC.stringsFor('es', {

  // CFM/File menu
  'DG.fileMenu.menuItem.newDocument': "Nuevo",
  'DG.fileMenu.menuItem.openDocument': "Abrir...",
  'DG.fileMenu.menuItem.closeDocument': "Cerrar",
  'DG.fileMenu.menuItem.importFile': "Importar...",
  'DG.fileMenu.menuItem.revertTo': "Revertir...",
  'DG.fileMenu.menuItem.revertToOpened': "Versión abierta recientemente",
  'DG.fileMenu.menuItem.revertToShared': "Versión compartida",
  'DG.fileMenu.menuItem.saveDocument': "Guardar...",
  'DG.fileMenu.menuItem.copyDocument': "Crear una copio",
  'DG.fileMenu.menuItem.share': "Compartir...",
  'DG.fileMenu.menuItem.shareGetLink': "Obtener vinculo para compartir",
  'DG.fileMenu.menuItem.shareUpdate': "Actualizar la versión compartida",
  'DG.fileMenu.menuItem.renameDocument': "Cambiar nombre",

  // main.js
  'DG.main.userEntryView.title': "¿Que te gustaría hacer?",
  'DG.main.userEntryView.openDocument': "Abre documento o Examinar ejemplos",
  'DG.main.userEntryView.newDocument': "Crear nuevo documento",

  // mainPage.js
  'DG.mainPage.mainPane.undoButton.title': "Deshacer",
  'DG.mainPage.mainPane.undoButton.toolTip': "Deshacer la última acción",
  'DG.mainPage.mainPane.redoButton.title': "Rehacer",
  'DG.mainPage.mainPane.redoButton.toolTip': "Rehacer la última acción",
  'DG.mainPage.mainPane.versionString': "Versión %@ (%@)", // DG.VERSION, DG.BUILD_NUM
  'DG.mainPage.mainPane.messageView.value': "Desfortunadamente, CODAP no se apoya en su navegador." +
  "CODAP se apoya en Internet Explorer 9+, Firefox 3.6+, Chrome 10+, and Safari 4+. " +
  "CODAP no se apoya activamente en otros versiones o navegadores ahora.",
  'DG.mainPage.titleBar.saved': '¡Documento Guardado!',
  'DG.mainPage.exceptionMessage': '(es)An error has occurred that may affect how this program ' +
  'behaves. You may wish to reload this page after you save your work. (%@)',

  // IS_BUILD variants of strings for InquirySpace
  'DG.mainPage.mainPane.versionString.IS_BUILD': "(es)Version %@ (%@ IS)", // Add suffix to version to identify SRRI's subsequent modifications .srri0, .srri1, .srri2 etc.

  // DG.IS_SRRI_BUILD variants of strings for SRRI build
  'DG.mainPage.mainPane.versionString.SRRI_BUILD': "(es)Version %@ (%@.srri10)", // Add suffix to version to identify SRRI's subsequent modifications .srri0, .srri1, .srri2 etc.

  // DG.AppController
  'DG.AppController.resetData.title' : "Borrar datos...",
  'DG.AppController.resetData.toolTip' : "Eliminar todos los datos del documento actual",
  'DG.AppController.resetData.warnMessage' : "¿Realmente desea eliminar todos los datos de este documento?",
  'DG.AppController.resetData.warnDescription' : "Esta acción no es reversible.",
  'DG.AppController.resetData.okButtonTitle' : "Sí, eliminar los datos",
  'DG.AppController.resetData.cancelButtonTitle' : "No, mantener los datos",
  'DG.AppController.closeDocument.warnMessage' : "¿Cierra el documento actual sin guardarlo?",
  'DG.AppController.closeDocument.warnDescription' : "Esta acción no es reversible.",
  'DG.AppController.closeDocument.okButtonTitle' : "Cerrar",
  'DG.AppController.closeDocument.cancelButtonTitle' : "Cancelar",
  'DG.AppController.beforeUnload.confirmationMessage' : "Este documento contiene cambios no guardados.",
  'DG.AppController.optionMenuItems.reportProblem' : "Enviar comentarios...",
  'DG.AppController.optionMenuItems.viewWebPage' : "Mostrar página web...",
  'DG.AppController.optionMenuItems.configureGuide' : "Configurar la guía...",
  'DG.AppController.optionMenuItems.about' : "Acerca de CODAP...",
  'DG.AppController.optionMenuItems.releaseNotes' : "¿Qué hay de nuevo?",
  'DG.AppController.optionMenuItems.help' : "Ayuda...",
  'DG.AppController.optionMenuItems.toWebSite' : "CODAP pagina web",
  'DG.AppController.exportDocument.prompt' : "Archivo nombres:",
  'DG.AppController.exportCaseData.prompt' : "Exportar los datos de:",
  'DG.AppController.exportDocument.exportTitle' : "Exportar",
  'DG.AppController.exportDocument.exportTooltip' : "Exportar los datos a un archivo",
  'DG.AppController.exportDocument.cancelTitle' : "Cancelar",
  'DG.AppController.exportDocument.cancelTooltip' : "Cancelar la exportación",
  'DG.AppController.feedbackDialog.dialogTitle' : "Dar opinion",
  'DG.AppController.feedbackDialog.subHeaderText' : "¡Tu opinión es importante para nosotros!",
  'DG.AppController.feedbackDialog.messageText' : "Por favor, ayúdenos a continuar mejorando nuestro producto. Preguntas, errores y solicitudes de características son bienvenidas. ¡Gracias!",
  'DG.AppController.feedbackDialog.subjectHint' : "¿Cuál es tu opinión?",
  'DG.AppController.feedbackDialog.feedbackHint' : "Detalles",
  'DG.AppController.feedbackDialog.submitFeedbackButton' : "Enviar",
  'DG.AppController.feedbackDialog.cancelFeedbackButton' : "Cancelar",
  'DG.AppController.showWebSiteTitle' : 'Acerca de CODAP',
  'DG.AppController.showHelpTitle' : 'Ayuda',
  'DG.AppController.showAboutTitle' : 'Acerca de CODAP',
  'DG.AppController.showReleaseNotesTitle' : 'Notas de la versión de CODAP',
  'DG.AppController.dropFile.error' : '(es)Error: %@1', // Error: <error text>
  'DG.AppController.dropFile.unknownFileType' : 'No se puede importar el tipo de archivo',
  'DG.AppController.validateDocument.missingRequiredProperty' : 'No se encontró propiedad requerida: %@1',
  'DG.AppController.validateDocument.unexpectedProperty' : 'Propiedad inesperada de nivel superior: %@1',
  'DG.AppController.validateDocument.unresolvedID' : 'ID no resuelto: %@1',
  'DG.AppController.validateDocument.parseError' : 'Error de análisis en el documento: %@1',
  'DG.AppController.validateDocument.invalidDocument' : 'Documento JSON no válido: %@1',
  'DG.AppController.openDocument.error.general': 'No se puede abrir el documento',
  'DG.AppController.openDocument.error.invalid_format': 'CODAP no puede abrir este tipo de documento',
  'DG.AppController.createDataSet.initialAttribute': 'Variables', /* Attribute */
  'DG.AppController.createDataSet.name': 'Nuevo Conjunto de Datos', /* New Dataset */
  'DG.AppController.createDataSet.collectionName': 'Datos', /* Cases */
  'DG.AppController.caseTableMenu.newDataSet': '-- nuevo --', /* -- new -- */

  'DG.SingleTextDialog.okButton.title': "(es)OK",
  'DG.SingleTextDialog.cancelButton.title': "(es)Cancelar",
  'DG.SingleTextDialog.cancelButton.toolTip': "Descartar el cuadro de diálogo sin realizar ningún cambio",

  // DG.DocumentController
  'DG.DocumentController.calculatorTitle': "Calculadora",
  'DG.DocumentController.caseTableTitle': "Tabla de Datos",
  'DG.DocumentController.graphTitle': "Grafico",
  'DG.DocumentController.sliderTitle': "Deslizador",
  'DG.DocumentController.textTitle': "Texto",
  'DG.DocumentController.mapTitle': "Mapa",
  'DG.DocumentController.enterURLPrompt': "Escriba la URL de una página web para mostrar",
  'DG.DocumentController.enterViewWebPageOKTip': "Muestra la página web dada por la URL",

  // DG.Document
  'DG.Document.defaultDocumentName': "Documento sin título",
  'DG.Document.documentName.toolTip': "Haga clic para cambiar el nombre del documento", // "Click to edit document name"

  // DG.SliderView
  'DG.SliderView.thumbView.toolTip': "(es)Drag to change the slider's value",
  'DG.SliderView.startButton.toolTip': "(es)Iniciar/stop animación",

  // DG.ToolButtonData
  'DG.ToolButtonData.tableButton.title': "Listas",
  'DG.ToolButtonData.tableButton.toolTip': "(es)Abrir una tabla de datos para cada conjunto de datos(ctrl-alt-t)",
  'DG.ToolButtonData.graphButton.title': "Graphico",
  'DG.ToolButtonData.graphButton.toolTip': "(es)Abrir un grafico (ctrl-alt-g)",
  'DG.ToolButtonData.sliderButton.title': "Seslizador",
  'DG.ToolButtonData.sliderButton.toolTip': "(es)Hacer un deslizador (ctrl-alt-s)",
  'DG.ToolButtonData.calcButton.title': "Calc",
  'DG.ToolButtonData.calcButton.toolTip': "Abrir/Cerrar la calculadora (ctrl-alt-c)",
  'DG.ToolButtonData.textButton.title': "Texto",
  'DG.ToolButtonData.textButton.toolTip': "Abrir un componente de texto (ctrl-alt-shift-t)",
  'DG.ToolButtonData.mapButton.title': "Mapa",
  'DG.ToolButtonData.mapButton.toolTip': "Abrir una mapa",
  'DG.ToolButtonData.optionMenu.title': "Opciones",
  'DG.ToolButtonData.optionMenu.toolTip': "Mostrar página web, Configurar la guía...",
  'DG.ToolButtonData.tileListMenu.title': "Inventario",
  'DG.ToolButtonData.tileListMenu.toolTip': "Mostrar la lista de inventario en el documento",
  'DG.ToolButtonData.guideMenu.title': "Guía",
  'DG.ToolButtonData.guideMenu.toolTip': "Muestra la guía para esta actividad y navega dentro de ella",
  'DG.ToolButtonData.guideMenu.showGuide': "Mostrar Guía",
  'DG.ToolButtonData.help.title': "Ayuda",
  'DG.ToolButtonData.help.toolTip': "Ayuda para CODAP, aprende sobre el proyecto CODAP",

  'DG.Slider.multiples': "(es)Restrict to Multiples of:",  // Restrict to Multiples of
  'DG.Slider.maxPerSecond': "(es)Maximum Animation Frames/sec:",  // Maximum Animation Frames/sec:
  'DG.Slider.direction': "Dirección de Animación:", // Direction
  'DG.Slider.backAndForth': "Hacia atrás y adelante", // Back and Forth
  'DG.Slider.lowToHigh': "De menor a mayor", // Low to High
  'DG.Slider.highToLow': "De mayor a menor ", // High to Low
  'DG.Slider.mode': "Repitación la animación:", // Animation Repetition:
  'DG.Slider.nonStop': "Continuo", // Non-Stop
  'DG.Slider.onceOnly': "Solo Una Vez", // Once Only

  // Undo / Redo
  'DG.Undo.exceptionOccurred': "Se ha producido un error al intentar deshacer.",
  'DG.Redo.exceptionOccurred': "Se ha producido un error al intentar rehacer.",
  'DG.Undo.componentMove': "Deshacer el movimiento del componente",
  'DG.Redo.componentMove': "Rehacer el movimiento del componente",
  'DG.Undo.componentResize': "Deshacer el cambio de tamaño del componente",
  'DG.Redo.componentResize': "Rehacer el cambio de tamaño del componente",
  'DG.Undo.axisDilate': "Deshacer reescalar el eje",
  'DG.Redo.axisDilate': "Rehacer reescalar el eje",
  'DG.Undo.axisRescaleFromData': "Deshacer reescalar el eje",
  'DG.Redo.axisRescaleFromData': "Rehacer reescalar el eje",
  'DG.Undo.axisDrag': "Deshacer arrastrando el eje",
  'DG.Redo.axisDrag': "Rehacer arrastrando el eje",
  'DG.Undo.axisAttributeChange': "Deshacer cambio de variable del eje",
  'DG.Redo.axisAttributeChange': "Rehacer cambio de variable del eje",
  'DG.Undo.axisAttributeAdded': "Deshacer agregar variable del eje",
  'DG.Redo.axisAttributeAdded': "Rehacer agregar variable del eje",
  'DG.Undo.toggleComponent.add.calcView': "Deshacer abrir la calculadora",
  'DG.Redo.toggleComponent.add.calcView': "Rehacer abrir la calculadora",
  'DG.Undo.toggleComponent.delete.calcView': "Deshacer cerrar la calculadora",
  'DG.Redo.toggleComponent.delete.calcView': "Rehacer cerrar la calculadora",
  'DG.Undo.caseTable.open': "Deshacer abrir la tabla de datos",
  'DG.Redo.caseTable.open': "Rehacer abrir la tabla de datos",
  'DG.Undo.caseTable.editAttribute': "Deshacer edición de la tabla de datos variable",
  'DG.Redo.caseTable.editAttribute': "Rehacer edición de la tabla de datos variable",
  'DG.Undo.caseTable.createAttribute': "Deshacer creación de tabla de datos variable",
  'DG.Redo.caseTable.createAttribute': "Rehacer creación de tabla de datos variable",
  'DG.Undo.caseTable.editAttributeFormula': "Deshacer editar de fórmula para la variable",
  'DG.Redo.caseTable.editAttributeFormula': "Rehacer editar de fórmula para la variable",
  'DG.Undo.caseTable.editCellValue': "Deshacer edición del valor de celda de la tabla de datos",
  'DG.Redo.caseTable.editCellValue': "Rehacer edición del valor de celda de la tabla de datos",
  'DG.Undo.caseTable.sortCases': "Deshacer ordenar de datos",
  'DG.Redo.caseTable.sortCases': "Rehacer ordenar de datos",
  'DG.Undo.caseTable.deleteAttribute': "Deshacer eliminar del variable de la table de datos",
  'DG.Redo.caseTable.deleteAttribute': "Rehacer eliminar del variable de la table de datos",
  'DG.Undo.caseTable.createCollection': "Deshacer crear nueva colección",
  'DG.Redo.caseTable.createCollection': "Rehacer crear nueva colección",
  'DG.Undo.caseTable.collectionNameChange': 'Deshacer cambiar el nombre de colección',
  'DG.Redo.caseTable.collectionNameChange': 'Rehacer cambiar el nombre de colección',
  'DG.Undo.caseTable.createNewCase': 'Deshacer crear nuevo dato',
  'DG.Redo.caseTable.createNewCase': 'Rehacer crear nuevo dato',
  'DG.Undo.caseTable.insertCases': 'Deshacer insertar datos',
  'DG.Redo.caseTable.insertCases': 'Rehacer insertar datos',
  'DG.Undo.caseTable.groupToggleExpandCollapseAll': 'Deshacer a todos ampliar/reducir',
  'DG.Redo.caseTable.groupToggleExpandCollapseAll': 'Rehacer a todos ampliar/reducir',
  'DG.Undo.caseTable.expandCollapseOneCase': 'Deshacer ampliar o reducir de un grupo',
  'DG.Redo.caseTable.expandCollapseOneCase': 'Rehacer ampliar o reducir de un grupo',
  'DG.Undo.caseTable.resizeColumns': '(es)Deshacer automáticamente cambiar el tamaño de todas las columnas',
  'DG.Redo.caseTable.resizeColumns': '(es)Rehacer automáticamente cambiar el tamaño de todas las columnas',
  'DG.Undo.document.share': "(es)Deshacer compartir el documento",
  'DG.Redo.document.share': "(es)Rehacer compartir el documento",
  'DG.Undo.document.unshare': "(es)Deshacer dejar de compartir el documento",
  'DG.Redo.document.unshare': "(es)Rehacer dejar de compartir el documento",
  'DG.Undo.game.add': "(es)Deshacer la adición de un juego al documento",
  'DG.Redo.game.add': "(es)Rehacer la adición de un juego al documento",
  'DG.Undo.graph.showCount': "(es)Deshacer mostrar recuento",
  'DG.Redo.graph.showCount': "(es)Rehacer mostrar recuento",
  'DG.Undo.graph.hideCount': "(es)Deshacer ocultar recuento",
  'DG.Redo.graph.hideCount': "(es)Rehacer ocultar recuento",
  'DG.Undo.graph.showPercent': "(es)Deshacer mostrar por ciento",
  'DG.Redo.graph.showPercent': "(es)Rehacer mostrar por ciento",
  'DG.Undo.graph.hidePercent': "(es)Deshacer ocultar por ciento",
  'DG.Redo.graph.hidePercent': "(es)Rehacer ocultar por ciento",
  'DG.Undo.graph.showMovableLine': "(es)Deshacer mostrar línea de valor movible",
  'DG.Redo.graph.showMovableLine': "(es)Rehacer mostrar línea de valor movible",
  'DG.Undo.graph.hideMovableLine': "(es)Deshacer ocultar línea de valor movible",
  'DG.Redo.graph.hideMovableLine': "(es)Rehacer ocultar línea de valor movible",
  'DG.Undo.graph.lockIntercept': "(es)Deshacer bloqueo de línea de intercepción",
  'DG.Redo.graph.lockIntercept': "(es)Rehacer bloqueo de línea de intercepción",
  'DG.Undo.graph.unlockIntercept': "(es)Deshacer desbloquear intersección línea",
  'DG.Redo.graph.unlockIntercept': "(es)Rehacer desbloquear intersección línea",
  'DG.Undo.graph.showPlotFunction': "(es)Deshacer mostrar función de trazado",
  'DG.Redo.graph.showPlotFunction': "(es)Rehacer mostrar plotted function",
  'DG.Undo.graph.hidePlotFunction': "(es)Deshacer ocultar plotted function",
  'DG.Redo.graph.hidePlotFunction': "(es)Rehacer ocultar plotted function",
  'DG.Undo.graph.changePlotFunction': "(es)Deshacer cambiar plotted function",
  'DG.Redo.graph.changePlotFunction': "(es)Rehacer cambiar plotted function",
  'DG.Undo.graph.showPlotValue': "(es)Deshacer mostrar plotted value",
  'DG.Redo.graph.showPlotValue': "(es)Rehacer mostrar plotted value",
  'DG.Undo.graph.hidePlotValue': "(es)Deshacer ocultar plotted value",
  'DG.Redo.graph.hidePlotValue': "(es)Rehacer ocultar plotted value",
  'DG.Undo.graph.changePlotValue': "(es)Deshacer cambiar plotted value",
  'DG.Redo.graph.changePlotValue': "(es)Rehacer cambiar plotted value",
  'DG.Undo.graph.showConnectingLine': "(es)Deshacer mostrar connecting line",
  'DG.Redo.graph.showConnectingLine': "(es)Rehacer mostrar connecting line",
  'DG.Undo.graph.hideConnectingLine': "(es)Deshacer ocultar connecting line",
  'DG.Redo.graph.hideConnectingLine': "(es)Rehacer ocultar connecting line",
  'DG.Undo.graph.showLSRL': "(es)Deshacer mostrar least squares line",
  'DG.Redo.graph.showLSRL': "(es)Rehacer mostrar least squares line",
  'DG.Undo.graph.hideLSRL': "(es)Deshacer ocultar least squares line",
  'DG.Redo.graph.hideLSRL': "(es)Rehacer ocultar least squares line",
  'DG.Undo.graph.showSquares': "(es)Deshacer mostrar squares",
  'DG.Redo.graph.showSquares': "(es)Rehacer mostrar squares",
  'DG.Undo.graph.hideSquares': "(es)Deshacer hiding squares",
  'DG.Redo.graph.hideSquares': "(es)Rehacer hiding squares",
  'DG.Undo.graph.showPlottedMean': "(es)Deshacer mostrar mean",
  'DG.Redo.graph.showPlottedMean': "(es)Rehacer mostrar mean",
  'DG.Undo.graph.hidePlottedMean': "(es)Deshacer hiding mean",
  'DG.Redo.graph.hidePlottedMean': "(es)Rehacer hiding mean",
  'DG.Undo.graph.showPlottedMedian': "(es)Deshacer mostrar median",
  'DG.Redo.graph.showPlottedMedian': "(es)Rehacer mostrar median",
  'DG.Undo.graph.hidePlottedMedian': "(es)Deshacer hiding median",
  'DG.Redo.graph.hidePlottedMedian': "(es)Rehacer hiding median",
  'DG.Undo.graph.showPlottedStDev': "(es)Deshacer mostrar standard deviation",
  'DG.Redo.graph.showPlottedStDev': "(es)Rehacer mostrar standard deviation",
  'DG.Undo.graph.hidePlottedStDev': "(es)Deshacer hiding standard deviation",
  'DG.Redo.graph.hidePlottedStDev': "(es)Rehacer hiding standard deviation",
  'DG.Undo.graph.showPlottedIQR': "(es)Deshacer mostrar inter-quartile range",
  'DG.Redo.graph.hidePlottedIQR': "(es)Rehacer hiding inter-quartile range",
  'DG.Undo.graph.hidePlottedIQR': "(es)Deshacer hiding inter-quartile range",
  'DG.Redo.graph.showPlottedIQR': "(es)Rehacer mostrar inter-quartile range",
  'DG.Undo.graph.addMovableValue': "(es)Deshacer adding movable value",
  'DG.Redo.graph.addMovableValue': "(es)Rehacer adding movable value",
  'DG.Undo.graph.removeMovableValue': "(es)Deshacer removing movable value",
  'DG.Redo.graph.removeMovableValue': "(es)Rehacer removing movable value",
  'DG.Undo.graph.moveMovableValue': "(es)Deshacer moving movable value",
  'DG.Redo.graph.moveMovableValue': "(es)Rehacer moving movable value",
  'DG.Undo.graph.changePointColor': "(es)Deshacer changing data color",
  'DG.Redo.graph.changePointColor': "(es)Rehacer changing data color",
  'DG.Undo.graph.changeStrokeColor': "(es)Deshacer changing stroke color",
  'DG.Redo.graph.changeStrokeColor': "(es)Rehacer changing stroke color",
  'DG.Undo.graph.changePointSize': "(es)Deshacer changing point size",
  'DG.Redo.graph.changePointSize': "(es)Rehacer changing point size",
  'DG.Undo.graph.changeAttributeColor': "(es)Deshacer changing attribute color",
  'DG.Redo.graph.changeAttributeColor': "(es)Rehacer changing attribute color",
  'DG.Undo.graph.changeBackgroundColor': "(es)Deshacer changing graph background color",
  'DG.Redo.graph.changeBackgroundColor': "(es)Rehacer changing graph background color",
  'DG.Undo.graph.toggleTransparent': "(es)Deshacer toggling plot transparency",
  'DG.Redo.graph.toggleTransparent': "(es)Rehacer toggling plot transparency",
  'DG.Undo.guide.show': "(es)Deshacer showing the guide",
  'DG.Redo.guide.show': "(es)Rehacer showing the guide",
  'DG.Undo.guide.navigate': "(es)Deshacer changing the guide page",
  'DG.Redo.guide.navigate': "(es)Rehacer changing the guide page",
  'DG.Undo.hideSelectedCases': "(es)Deshacer hiding selected cases",
  'DG.Redo.hideSelectedCases': "(es)Rehacer hiding selected cases",
  'DG.Undo.hideUnselectedCases': "(es)Deshacer hiding unselected cases",
  'DG.Redo.hideUnselectedCases': "(es)Rehacer hiding unselected cases",
  'DG.Undo.enableNumberToggle': "(es)Deshacer Show Parent Visibility Toggles",
  'DG.Redo.enableNumberToggle': "(es)Rehacer Show Parent Visibility Toggles",
  'DG.Undo.disableNumberToggle': "(es)Deshacer Hide Parent Visibility Toggles",
  'DG.Redo.disableNumberToggle': "(es)Rehacer Hide Parent Visibility Toggles",
  'DG.Undo.interactiveUndoableAction': "(es)Deshacer an action in the interactive",
  'DG.Redo.interactiveUndoableAction': "(es)Rehacer an action in the interactive",
  'DG.Undo.showAllCases': "(es)Deshacer showing all cases",
  'DG.Redo.showAllCases': "(es)Rehacer showing all cases",
  'DG.Undo.map.create': "(es)Deshacer adding map",
  'DG.Redo.map.create': "(es)Rehacer adding map",
  'DG.Undo.map.fitBounds': "(es)Deshacer resizing map",
  'DG.Redo.map.fitBounds': "(es)Rehacer resizing map",
  'DG.Undo.map.pan': "(es)Deshacer panning map",
  'DG.Redo.map.pan': "(es)Rehacer panning map",
  'DG.Undo.map.zoom': "(es)Deshacer zooming map",
  'DG.Redo.map.zoom': "(es)Rehacer zooming map",
  'DG.Undo.map.showGrid': "(es)Deshacer showing grid on map",
  'DG.Redo.map.showGrid': "(es)Rehacer showing grid on map",
  'DG.Undo.map.hideGrid': "(es)Deshacer hiding grid on map",
  'DG.Redo.map.hideGrid': "(es)Rehacer hiding grid on map",
  'DG.Undo.map.changeGridSize': "(es)Deshacer changing map grid size",
  'DG.Redo.map.changeGridSize': "(es)Rehacer changing map grid size",
  'DG.Undo.map.showPoints': "(es)Deshacer showing points on map",
  'DG.Redo.map.showPoints': "(es)Rehacer showing points on map",
  'DG.Undo.map.hidePoints': "(es)Deshacer hiding points on map",
  'DG.Redo.map.hidePoints': "(es)Rehacer hiding points on map",
  'DG.Undo.map.showLines': "(es)Deshacer showing lines on map",
  'DG.Redo.map.showLines': "(es)Rehacer showing lines on map",
  'DG.Undo.map.hideLines': "(es)Deshacer hiding lines on map",
  'DG.Redo.map.hideLines': "(es)Rehacer hiding lines on map",
  'DG.Undo.map.changeBaseMap': "(es)Deshacer changing map background",
  'DG.Redo.map.changeBaseMap': "(es)Rehacer changing map background",
  'DG.Undo.textComponent.create': "(es)Deshacer adding text object",
  'DG.Redo.textComponent.create': "(es)Rehacer adding text object",
  'DG.Undo.textComponent.edit': "(es)Deshacer editing text",
  'DG.Redo.textComponent.edit': "(es)Rehacer editing text",
  'DG.Undo.sliderComponent.create': "(es)Deshacer adding a slider",
  'DG.Redo.sliderComponent.create': "(es)Rehacer adding a slider",
  'DG.Undo.slider.change': "(es)Deshacer slider value change",
  'DG.Redo.slider.change': "(es)Rehacer slider value change",
  'DG.Undo.slider.changeMultiples': "(es)Deshacer change to slider multiples restriction",
  'DG.Redo.slider.changeMultiples': "(es)Rehacer change to slider multiples restriction",
  'DG.Undo.slider.changeSpeed': "(es)Deshacer change to slider max frames/sec",
  'DG.Redo.slider.changeSpeed': "(es)Rehacer change to slider max frames/sec",
  'DG.Undo.slider.changeDirection': "(es)Deshacer change to slider animation direction",
  'DG.Redo.slider.changeDirection': "(es)Rehacer change to slider animation direction",
  'DG.Undo.slider.changeRepetition': "(es)Deshacer change to slider animation repetition",
  'DG.Redo.slider.changeRepetition': "(es)Rehacer change to slider animation repetition",
  'DG.Undo.graphComponent.create': "(es)Deshacer adding a graph",
  'DG.Redo.graphComponent.create': "(es)Rehacer adding a graph",
  'DG.Undo.dataContext.create': '(es)Deshacer creating a data set',
  'DG.Redo.dataContext.create': '(es)Rehacer creating a data set',
  'DG.Undo.data.deleteCases': "(es)Deshacer deleting cases",
  'DG.Redo.data.deleteCases': "(es)Rehacer deleting cases",
  'DG.Undo.component.close': "(es)Deshacer closing component",
  'DG.Redo.component.close': "(es)Rehacer closing component",
  'DG.Undo.component.minimize': "(es)Deshacer minimizing component",
  'DG.Redo.component.minimize': "(es)Rehacer minimizing component",
  'DG.Undo.dataContext.moveAttribute': "(es)Deshacer moving case table attribute",
  'DG.Redo.dataContext.moveAttribute': "(es)Rehacer moving case table attribute",


  // DG.DataContext
  'DG.DataContext.singleCaseName': "(es)case",
  'DG.DataContext.pluralCaseName': "(es)cases",
  'DG.DataContext.caseCountString': "(es)%@1 %@2", // %@1: count, %@2: case name string
  'DG.DataContext.setOfCasesLabel': "(es)a collection",
  'DG.DataContext.collapsedRowString': "(es)%@1 of %@2",
  'DG.DataContext.noData': "(es)No Data", // "No Data"
  'DG.DataContext.baseName': '(es)Data_Set_%@1',

  // DG.CollectionClient
  'DG.CollectionClient.cantEditFormulaErrorMsg': "(es)The formula for attribute \"%@\" is not editable.",
  'DG.CollectionClient.cantEditFormulaErrorDesc': "(es)Create a new attribute to be able to specify a formula.",

  // DG.Formula
  'DG.Formula.FuncCategoryArithmetic': "(es)Arithmetic Functions",
  'DG.Formula.FuncCategoryConversion': "(es)Other Functions", // put into "Other" for now
  'DG.Formula.FuncCategoryDateTime': "(es)Date/Time Functions",
  'DG.Formula.FuncCategoryLookup': "(es)Lookup Functions",
  'DG.Formula.FuncCategoryOther': "(es)Other Functions",
  'DG.Formula.FuncCategoryRandom': "(es)Other Functions", // put into "Other" for now
  'DG.Formula.FuncCategoryStatistical': "(es)Statistical Functions",
  'DG.Formula.FuncCategoryString': "(es)String Functions",
  'DG.Formula.FuncCategoryTrigonometric': "(es)Trigonometric Functions",

  'DG.Formula.DateLongMonthJanuary': "enero",
  'DG.Formula.DateLongMonthFebruary': "febrero",
  'DG.Formula.DateLongMonthMarch': "marzo",
  'DG.Formula.DateLongMonthApril': "abril",
  'DG.Formula.DateLongMonthMay': "mayo",
  'DG.Formula.DateLongMonthJune': "junio",
  'DG.Formula.DateLongMonthJuly': "julio",
  'DG.Formula.DateLongMonthAugust': "agosto",
  'DG.Formula.DateLongMonthSeptember': "septiembre",
  'DG.Formula.DateLongMonthOctober': "octubre",
  'DG.Formula.DateLongMonthNovember': "noviembre",
  'DG.Formula.DateLongMonthDecember': "diciembre",

  'DG.Formula.DateShortMonthJanuary': "en",
  'DG.Formula.DateShortMonthFebruary': "feb",
  'DG.Formula.DateShortMonthMarch': "mzo",
  'DG.Formula.DateShortMonthApril': "abr",
  'DG.Formula.DateShortMonthMay': "may",
  'DG.Formula.DateShortMonthJune': "jun",
  'DG.Formula.DateShortMonthJuly': "jul",
  'DG.Formula.DateShortMonthAugust': "ago",
  'DG.Formula.DateShortMonthSeptember': "sep",
  'DG.Formula.DateShortMonthOctober': "oct",
  'DG.Formula.DateShortMonthNovember': "nov",
  'DG.Formula.DateShortMonthDecember': "dic",

  'DG.Formula.DateLongDaySunday': "domingo",
  'DG.Formula.DateLongDayMonday': "lunes",
  'DG.Formula.DateLongDayTuesday': "martes",
  'DG.Formula.DateLongDayWednesday': "miércoles",
  'DG.Formula.DateLongDayThursday': "jueves",
  'DG.Formula.DateLongDayFriday': "viernes",
  'DG.Formula.DateLongDaySaturday': "sabado",

                                        /* "dd-mmm-yyyy", "dd-mmm-yy", "mm/dd/yy", "mm/dd/yyyy" */
  'DG.Utilities.date.localDatePattern': '(?:(?:[0-3]?\\d\-(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\-\\d{2}(?:\\d{2})?)|(?:[01]?\\d\/[0-3]?\\d\/\\d{2}(?:\\d{2})?))',
                                    /* "hh:mm", "hh:mm:ss", "hh:mm:ss.ddd" */
  'DG.Utilities.date.timePattern': '(?:[0-2]?\\d:[0-5]?\\d(?::[0-5]\\d(?:\\.\\d{3})?)? ?(?:[ap]m)?)',
                                    /* "yyyy-mm-dd", "yyyy-mm-ddThh:mm:ss", "yyyy-mm-ddThh:mm:ssZ" "yyyy-mm-ddThh:mm:ss+hh:mm"*/
  // We are assembling the full iso pattern piecemeal below, in hopes of making it
  // easier to read and understand...
  'DG.Utilities.date.iso8601Pattern': [
    '^', // beginning of string
    '\\d{4}-[01]\\d-[0-3]\\d', // iso date part yyyy-mm-dd
    '(?:', // optional clause BEGIN
    '[T ]', // date/time separator
    '(?:[0-2]\\d:[0-5]\\d:[0-5]\\d(?:\\.\\d{3,3})?)',  // iso time part hh:mm:ss or hh:mm:ss.ddd
    '(?:', // optional clause BEGIN
    'Z|(?:[-+]?[01]\\d:[0-5]\\d)|(?: ?[-+][0-2]\\d{3})', // iso timezone part 'Z', +hh:mm, -hh:mm, +hhmm, -hhmm
    ')?', // optional clause END
    ')?', // optional clause END
    '$'
  ].join(''),
                                  /* "rgb(nnn,nnn,nnn)" "rgba(nnn,nnn,nnn,0.n)" "#ffffff" */
  'DG.Utilities.colorPattern': '(?:rgb\\((?:\\d{1,3},){2}\\d{1,3}\\))|(?:rgba\\((?:\\d{1,3},){3}[\\d\\.]*\\))|(?:#[\\da-f]{6})',

  'DG.Formula.SyntaxErrorMiddle': "(es)Syntax error: '(es)%@'",
  'DG.Formula.SyntaxErrorEnd': "(es)Incomplete expression",
  'DG.Formula.SyntaxErrorInvalidOperator': "(es)invalid operator '%@'",
  'DG.Formula.TypeError.name': "(es)\u274c",
  'DG.Formula.TypeError.message': "(es)invalid type(s) for '%@'",
  'DG.Formula.TypeError.description': "(es)invalid type(s) for '%@'",
  'DG.Formula.VarReferenceError.name': "(es)\u274c",
  'DG.Formula.VarReferenceError.message': "(es)'%@': unknown variable",
  'DG.Formula.VarReferenceError.description': "(es)Variable '%@' is unrecognized",
  'DG.Formula.HierReferenceError.name': "(es)\u274c",
  'DG.Formula.HierReferenceError.message': "(es)invalid reference to child attribute '%@'",
  'DG.Formula.HierReferenceError.description': "(es)'%@' is a child attribute that can only be referenced in an aggregate function",
  'DG.Formula.FuncReferenceError.name': "(es)\u274c",
  'DG.Formula.FuncReferenceError.message': "(es)'%@': unknown function",
  'DG.Formula.FuncReferenceError.description': "(es)Function '%@' is unrecognized",
  'DG.Formula.FuncArgsError.name': "(es)\u274c",
  'DG.Formula.FuncArgsErrorSingle.message': "(es)'%@' expects 1 argument",
  'DG.Formula.FuncArgsErrorSingle.description': "(es)The '%@' function expects 1 argument",
  'DG.Formula.FuncArgsErrorPlural.message': "(es)'%@' expects %@ arguments",
  'DG.Formula.FuncArgsErrorPlural.description': "(es)The '%@' function expects %@ arguments",
  'DG.Formula.FuncArgsErrorRange.message': "(es)'%@' expects %@-%@ arguments",
  'DG.Formula.FuncArgsErrorRange.description': "(es)The '%@' function expects %@-%@ arguments",
  'DG.Formula.PendingRequest.name': "(es)\u231b",
  'DG.Formula.PendingRequest.message': "(es)request pending...",
  'DG.Formula.PendingRequest.description': "(es)request pending...",
  'DG.Formula.FailedRequest.name': "(es)\u274c",
  'DG.Formula.FailedRequest.message': "(es)request failed (%@)",
  'DG.Formula.FailedRequest.description': "(es)request failed (%@)",
  'DG.Formula.PendingBoundaries.name': "(es)\u231b",
  'DG.Formula.PendingBoundaries.message': "(es)boundaries pending...",
  'DG.Formula.PendingBoundaries.description': "(es)boundaries pending...",
  'DG.Formula.FailedBoundaries.name': "(es)\u274c",
  'DG.Formula.FailedBoundaries.message': "(es)boundaries failed (%@)",
  'DG.Formula.FailedBoundaries.description': "(es)boundaries failed (%@)",
  'DG.Formula.LookupDataSetError.message': "(es)'%@': unrecognized data set",
  'DG.Formula.LookupDataSetError.description': "(es)Data set '%@' is unrecognized",
  'DG.Formula.LookupAttrError.message': "(es)'%@' not found in data set '%@'",
  'DG.Formula.LookupAttrError.description': "(es)Attribute '%@' not found in data set '%@'",

  // DG.TableController
  'DG.TableController.headerMenuItems.editAttribute': "(es)Edit Attribute Properties...",
  'DG.TableController.headerMenuItems.editFormula': "(es)Edit Formula...",
  'DG.TableController.headerMenuItems.randomizeAttribute': "(es)Rerandomize",
  'DG.TableController.headerMenuItems.sortAscending': "(es)Sort Ascending (A\u2192Z, 0\u21929)",
  'DG.TableController.headerMenuItems.sortDescending': "(es)Sort Descending (9\u21920, Z\u2192A)",
  'DG.TableController.headerMenuItems.deleteAttribute': "(es)Delete Attribute",
  'DG.TableController.newAttrDlg.defaultAttrName': "(es)new_attr",
  'DG.TableController.newAttrDlg.attrNameHint': "(es)Enter a name for the new attribute",
  'DG.TableController.newAttrDlg.formulaHint': "(es)If desired, type a formula for computing values of this attribute",
  'DG.TableController.newAttrDlg.applyTooltip': "(es)Define the new attribute using the name and (optional) formula",
  'DG.TableController.newAttrDlg.mustEnterAttrNameMsg': "(es)Please enter a name for the new attribute",
  'DG.TableController.newAttrDialog.AttributesCategory': "(es)Attributes",
  'DG.TableController.newAttrDialog.SpecialCategory': "(es)Special",
  'DG.TableController.newAttrDialog.GlobalsCategory': "(es)Globals",
  'DG.TableController.newAttrDialog.ConstantsCategory': "(es)Constants",  // Set to "Special" to combine with 'caseIndex'
  'DG.TableController.newAttrDialog.FunctionsCategory': "(es)Functions",
  'DG.TableController.renameAttributeInvalidMsg': "(es)Attribute names may not be empty",
  'DG.TableController.renameAttributeInvalidDesc': "(es)Please enter a valid attribute name",
  'DG.TableController.renameAttributeDuplicateMsg': "(es)An attribute with that name already exists",
  'DG.TableController.renameAttributeDuplicateDesc': "(es)Please enter a unique attribute name",
  'DG.TableController.deleteAttribute.confirmMessage': "(es)Delete the attribute '%@'?",
  'DG.TableController.deleteAttribute.confirmDescription': "(es)This action cannot be undone.",
  'DG.TableController.deleteAttribute.okButtonTitle': "(es)Delete Attribute",
  'DG.TableController.deleteAttribute.cancelButtonTitle': "(es)Cancel",
  'DG.TableController.deleteDataSet.confirmMessage': "(es)Delete and destroy this data set: '(es)%@'?",
  'DG.TableController.deleteDataSet.confirmDescription': "(es)This action cannot be undone.",
  'DG.TableController.deleteDataSet.okButtonTitle': "(es)Delete Data Set",
  'DG.TableController.deleteDataSet.cancelButtonTitle': "(es)Cancel",
  'DG.TableController.attrEditor.precisionHint': "(es)Number of digits after decimal point",
  'DG.TableController.attrEditor.unitHint': "(es)Unit of measure, if applicable",
  'DG.TableController.attrEditor.descriptionHint': "(es)Describe the attribute",
  'DG.TableController.scoreAttrName': "(es)score",
  'DG.TableController.setScoreDlg.applyTooltip': "(es)Set the formula for the '%@' attribute",
  'DG.TableController.setScoreDlg.formulaHint': "(es)Type a formula for computing values of this attribute",
  'DG.TableController.newAttributeTooltip': '(es)Add a new attribute to this table',

  'DG.TableController.attributeEditor.title': '(es)Attribute Properties',
  // DG.CaseTableDropTarget
  'DG.CaseTableDropTarget.dropMessage': "(es)drop attribute to create new collection",
  'DG.CaseTable.defaultAttrName': '(es)newAttr',
  'DG.CaseTable.indexColumnName': '(es)index',
  'DG.CaseTable.indexColumnTooltip': '(es)The row number (caseIndex) within the collection',
  'DG.CaseTable.indexMenu.insertCase': "(es)Insert Case",
  'DG.CaseTable.indexMenu.insertCases': "(es)Insert Cases...",
  'DG.CaseTable.indexMenu.deleteCase': "(es)Delete Case",
  'DG.CaseTable.indexMenu.deleteCases': "(es)Delete Cases",
  'DG.CaseTable.attribute.type.none': '(es)',
  'DG.CaseTable.attribute.type.nominal': '(es)categorical',
  'DG.CaseTable.attribute.type.categorical': '(es)categorical',
  'DG.CaseTable.attribute.type.numeric': '(es)numeric',
  'DG.CaseTable.attribute.type.date': '(es)date',
  'DG.CaseTable.attribute.type.qualitative': '(es)qualitative',
  'DG.CaseTable.attribute.type.boundary':'(es)boundary', //boundary Translate
  'DG.CaseTable.attributeEditor.name': '(es)name', // name
  'DG.CaseTable.attributeEditor.description': '(es)description', // description
  'DG.CaseTable.attributeEditor.type': '(es)type', // type
  'DG.CaseTable.attributeEditor.unit': '(es)unit', // unit
  'DG.CaseTable.attributeEditor.precision': '(es)precision', // precision
  'DG.CaseTable.attributeEditor.editable': '(es)editable', // editable
  'DG.CaseTable.insertCasesDialog.title': '(es)Insert Cases',
  'DG.CaseTable.insertCasesDialog.numCasesPrompt': '(es)# cases to insert:',
  'DG.CaseTable.insertCasesDialog.beforeAfter.prompt': '(es)location:',
  'DG.CaseTable.insertCasesDialog.beforeAfter.before': '(es)before',
  'DG.CaseTable.insertCasesDialog.beforeAfter.after': '(es)after',
  'DG.CaseTable.insertCasesDialog.applyBtnTitle': '(es)Insert Cases',
  'DG.CaseTable.insertCasesDialog.applyBtnTooltip': '(es)Insert the specified number of cases',

  // DG.CaseTableController
  'DG.CaseTableController.allTables': '(es)All tables',

  // DG.AttributeFormulaView
  'DG.AttrFormView.attrNamePrompt': "(es)Attribute Name:",
  'DG.AttrFormView.formulaPrompt': "(es)Formula:",
  'DG.AttrFormView.operandMenuTitle': "(es)--- Insert Value ---",
  'DG.AttrFormView.functionMenuTitle': "(es)--- Insert Function ---",
  'DG.AttrFormView.applyBtnTitle': "(es)Apply",
  'DG.AttrFormView.cancelBtnTitle': "(es)Cancel",
  'DG.AttrFormView.cancelBtnTooltip': "(es)Dismiss the dialog without making any changes",

  // DG.GuideConfigurationView
  'DG.GuideConfigView.titlePrompt': "(es)Guide Title",
  'DG.GuideConfigView.titleHint': "(es)Activity Name",
  'DG.GuideConfigView.itemTitleHint': "(es)Section Name",
  'DG.GuideConfigView.itemURLHint': "(es)URL of section",
  'DG.GuideConfigView.okBtnTitle': "(es)OK",
  'DG.GuideConfigView.okBtnToolTip': "(es)Accept the Guide menu items",
  'DG.GuideConfigView.cancelBtnTitle': "(es)Cancel",
  'DG.GuideConfigView.cancelBtnTooltip': "(es)Dismiss the dialog without making any changes",
  'DG.GuideConfigView.httpWarning': "(es)The URL must start with either http:// or https://",

  'DG.DataDisplayModel.rescaleToData': "(es)Rescale to Data",
  'DG.DataDisplayModel.ShowConnectingLine': "(es)Show Connecting Lines",
  'DG.DataDisplayModel.HideConnectingLine': "(es)Hide Connecting Lines",

  // DG.AxisView
  'DG.AxisView.emptyGraphCue': 'Haga clic aquí, o arrastrar un atributo aquí.',

  // DG.CellLinearAxisView
  'DG.CellLinearAxisView.midPanelTooltip': "(es)Drag to translate axis scale",
  'DG.CellLinearAxisView.lowerPanelTooltip': "(es)Drag to change axis lower bound",
  'DG.CellLinearAxisView.upperPanelTooltip': "(es)Drag to change axis upper bound",

  // DG.PlotModel
  'DG.PlotModel.mixup': "(es)Mix Up the Plot", // "Mix Up the Plot"
  'DG.PlotModel.showCount': "(es)Show Count",
  'DG.PlotModel.hideCount': "(es)Hide Count",

  // DG.ScatterPlotModel
  'DG.ScatterPlotModel.sumSquares': "(es),\nSum of squares = %@", // sumOfResidualsSquared
  'DG.ScatterPlotModel.rSquared': "(es),\nr^2 = %@", // r-squared
  'DG.ScatterPlotModel.slopeIntercept': "(es)%@ = %@ %@ %@ %@",// y,slope,x,signInt,Int
  'DG.ScatterPlotModel.infiniteSlope': "(es)%@ = %@",// x,constant
  'DG.ScatterPlotModel.slopeOnly': "(es)slope = %@ %@",// numeric slope
  'DG.ScatterPlotModel.yearsLabel': "(es)per year",// per year - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.daysLabel': "(es)per day",// per day - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.hoursLabel': "(es)per hour",// per hour - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.minutesLabel': "(es)per minute",// per minute - used in equation for line when x is a datetime axis
  'DG.ScatterPlotModel.secondsLabel': "(es)per seconds",// per second - used in equation for line when x is a datetime axis

  // DG.LegendView
  'DG.LegendView.attributeTooltip': "(es)Click to change legend attribute", // "Click to change legend attribute"

  // DG.NumberToggleView
  'DG.NumberToggleView.showAll': "(es)Show All -", // "Show All"
  'DG.NumberToggleView.hideAll': "(es)Hide All -", // "Hide All"
  'DG.NumberToggleView.lastDash': "(es)\u2013",         // "-"
  'DG.NumberToggleView.lastUnchecked': "(es)\u2610",    // "[ ]"
  'DG.NumberToggleView.lastChecked': "(es)\u2612",      // "[x]"
  'DG.NumberToggleView.lastLabel': "(es)Last",    // "Last"
  'DG.NumberToggleView.showAllTooltip': "(es)Click numbers to toggle visibility. Click label to show all.", // "Click numbers to toggle visibility. Click label to show all."
  'DG.NumberToggleView.hideAllTooltip': "(es)Click numbers to toggle visibility. Click label to hide all.", // "Click numbers to toggle visibility. Click label to hide all."
  'DG.NumberToggleView.enableLastModeTooltip': "(es)Click to show last parent case only",
  'DG.NumberToggleView.disableLastModeTooltip': "(es)Click to exit last parent case mode",
  'DG.NumberToggleView.indexTooltip': "(es)Click to toggle visibility.", // "Click to toggle visibility."

  // DG.PlottedAverageAdornment
  'DG.PlottedAverageAdornment.meanValueTitle': "(es)mean=%@", // "mean=123.456"
  'DG.PlottedAverageAdornment.medianValueTitle': "(es)median=%@", // "median=123.456"
  'DG.PlottedAverageAdornment.stDevValueTitle': "(es)\xB11 SD, %@", // "st.dev=123.456"
  'DG.PlottedAverageAdornment.iqrValueTitle': "(es)IQR=%@", // "iqr=123.456"
  'DG.PlottedAverageAdornment.boxPlotTitle': "(es)lower=%@\nQ1=%@\nmedian=%@\nQ3=%@\nupper=%@\nIQR=%@", // "lower=%@\nQ1=%@\nmedian=%@\nQ3=\nIQ=%@\nupper=%@"
  'DG.PlottedCountAdornment.title': "(es)%@ %@, %@%", // "12 cases, 50%"

  // DG.GraphModel
  'DG.DataDisplayMenu.attribute_x': "(es)X: %@", // %@ = attribute name
  'DG.DataDisplayMenu.attribute_y': "(es)Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.attribute_y2': "(es)Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.attribute_legend': "(es)Legend: %@", // %@ = attribute name
  'DG.DataDisplayMenu.remove': "(es)Remove Attribute",
  'DG.DataDisplayMenu.removeAttribute_x': "(es)Remove X: %@", // %@ = attribute name
  'DG.DataDisplayMenu.removeAttribute_y': "(es)Remove Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.removeAttribute_y2': "(es)Remove Y: %@", // %@ = attribute name
  'DG.DataDisplayMenu.removeAttribute_legend': "(es)Remove Legend: %@", // %@ = attribute name
  'DG.DataDisplayMenu.treatAsCategorical': "(es)Treat as Categorical",
  'DG.DataDisplayMenu.treatAsNumeric': "(es)Treat as Numeric",
  'DG.DataDisplayMenu.hide': "(es)Hide and Show",
  'DG.DataDisplayMenu.hideSelectedPlural': "(es)Hide Selected Cases",
  'DG.DataDisplayMenu.hideUnselectedPlural': "(es)Hide Unselected Cases",
  'DG.DataDisplayMenu.hideSelectedSing': "(es)Hide Selected Case",
  'DG.DataDisplayMenu.hideUnselectedSing': "(es)Hide Unselected Case",
  'DG.DataDisplayMenu.enableNumberToggle': "(es)Show Parent Visibility Toggles",
  'DG.DataDisplayMenu.disableNumberToggle': "(es)Hide Parent Visibility Toggles",
  'DG.DataDisplayMenu.showAll': "(es)Show All Cases",
  'DG.DataDisplayMenu.snapshot': "(es)Make Snapshot",

  // DG.GraphView
  'DG.GraphView.replaceAttribute': "(es)Replace %@ with %@", // both %@ are attribute names
  'DG.GraphView.addAttribute': "(es)Add attribute %@", // %@ is attribute name
  'DG.GraphView.addToEmptyPlace': "(es)Create axis with %@", // %@ is attribute name
  'DG.GraphView.addToEmptyX': "(es)Create x-axis with %@", // %@ is attribute name
  'DG.GraphView.dropInPlot': "(es)Color points by values of %@", // %@ is attribute name
  'DG.GraphView.zoomTip': "(es)Double-click to zoom in.\nShift-double-click to zoom out", // %@ is attribute name
  'DG.GraphView.rescale': "(es)Rescale to data", // Rescale to data

  // DG.AxisView
  'DG.AxisView.labelTooltip': "(es)—Click to change %@ axis attribute", // %@ is either horizontal or vertical
  'DG.AxisView.vertical': '(es)vertical',
  'DG.AxisView.horizontal': '(es)horizontal',

  // DG.DataTip
  'DG.DataTip.connectingLine': "(es)%@: %@\nwith %@ %@",

  // DG.MovableValueAdornment
  'DG.MovableMonthYear': "(es)%@, %@", // <monthname>, <year>
  'DG.MovableMonthDayHour': "(es)%@ %@ %@:00", // <monthname> <day> <hour>:00

  // DG.PlottedValueAdornment/DG.PlottedFunctionAdornment
  'DG.PlottedFormula.defaultNamePrompt': "(es)Formula",
  'DG.PlottedValue.namePrompt': "(es)Plotted Value",
  'DG.PlottedValue.formulaPrompt': "(es)value =",
  'DG.PlottedValue.formulaHint': "(es)",
  'DG.PlottedFunction.namePrompt': "(es)Plotted Function",
  'DG.PlottedFunction.formulaPrompt': "(es)f() =",
  'DG.PlottedFunction.formulaHint': "(es)Type an expression e.g. x*x/30 - 50",

  // DG.MapView
  'DG.MapView.showGrid': "(es)Show Grid", // "Show Grid"
  'DG.MapView.hideGrid': "(es)Hide Grid", // "Hide Grid"
  'DG.MapView.showPoints': "(es)Show Points", // "Show Points"
  'DG.MapView.hidePoints': "(es)Hide Points", // "Hide Points"
  'DG.MapView.marqueeHint': "(es)Marquee tool—drag select points in map", // "Marquee tool—drag select points in map"
  'DG.MapView.gridControlHint': "(es)Change size of grid rectangles", // "Change size of grid rectangles"

  // Inspector
  'DG.Inspector.values': "(es)Values", // "Values"
  'DG.Inspector.styles': "(es)Styles", // "Styles"
  'DG.Inspector.pointSize': "(es)Point size:", // "Point size:"
  'DG.Inspector.transparency': "(es)Transparency:", // "Transparency:"
  'DG.Inspector.color': "(es)Color:", // "Color:"
  'DG.Inspector.legendColor': "(es)Legend color:",  // "Legend color:"
  'DG.Inspector.backgroundColor': "(es)Background\ncolor:",  // "Background color:"
  'DG.Inspector.stroke': "(es)Stroke:", // "Stroke:"
  'DG.Inspector.rescale.toolTip': "(es)Rescale display to show all the data", // "Rescale display to show all the data"
  'DG.Inspector.mixUp.toolTip': "(es)Mixup all the points", // "Mixup all the points"
  'DG.Inspector.hideShow.toolTip': "(es)Show all cases or hide selected/unselected cases", // "Show all cases or hide selected/unselected cases"
  'DG.Inspector.delete.toolTip': "(es)Delete selected or unselected cases", // "Delete selected or unselected cases"
  'DG.Inspector.sliderValues.toolTip': "(es)Set slider animation direction, speed, …", // "Set slider animation direction, speed, …"
  'DG.Inspector.webViewEditURL.toolTip': "(es)Edit the URL of the displayed web page",  // "Edit the URL of the displayed web page"

  'DG.Inspector.selection.selectAll': "(es)Select All Cases", // "Select All Cases"
  'DG.Inspector.selection.deleteSelectedCases': "(es)Delete Selected Cases", // "Delete Selected Cases"
  'DG.Inspector.selection.deleteUnselectedCases': "(es)Delete Unselected Cases",    // "Delete Unselected Cases"
  'DG.Inspector.deleteAll': "(es)Delete All Cases",           // "Delete All Cases"
  'DG.Inspector.deleteDataSet': "(es)Delete and Destroy Data Set",        // "Delete Data Set"

  // Display Inspector
  'DG.Inspector.displayValues.toolTip': "(es)Change what is shown along with the points", // "Change what is shown along with the points"
  'DG.Inspector.displayStyles.toolTip': "(es)Change the appearance of the display", // "Change the appearance of the display"
  'DG.Inspector.makeImage.toolTip': "(es)Save the image as a PNG file", // "Save the image as a PNG file"
  'DG.Inspector.displayShow': "(es)Show …", // "Show …"

  // Color Picker
  'DG.Inspector.colorPicker.more': '(es)more', // more
  'DG.Inspector.colorPicker.less': '(es)less', // less

  // Graph Inspector
  'DG.Inspector.graphTransparency': "(es)Transparent", // "Transparent"
  'DG.Inspector.graphCount': "(es)Count", // "Count"
  'DG.Inspector.graphPercent': "(es)Percent",  // "Percent"
  'DG.Inspector.graphRow': "(es)Row",  // "Row"
  'DG.Inspector.graphColumn': "(es)Column",  // "Column"
  'DG.Inspector.graphCell': "(es)Cell",  // "Cell"
  'DG.Inspector.graphConnectingLine': "(es)Connecting Lines", // "Connecting Lines"
  'DG.Inspector.graphMovableLine': "(es)Movable Line", // "Movable Line"
  'DG.Inspector.graphInterceptLocked': "(es)Intercept Locked", // "Intercept Locked"
  'DG.Inspector.graphPlottedFunction': "(es)Plotted Function", // "Plotted Function"
  'DG.Inspector.graphSquares': "(es)Squares of Residuals", // "Squares of Residuals"
  'DG.Inspector.graphLSRL': "(es)Least Squares Line",  // "Least Squares Line"
  'DG.Inspector.graphMovableValue': "(es)Movable Value", // "Movable Value"
  'DG.Inspector.graphAdd': "(es)Add",  // "Add"
  'DG.Inspector.graphRemove': "(es)Remove",  // "Remove"
  'DG.Inspector.graphPlottedMean': "(es)Mean", // "Mean"
  'DG.Inspector.graphPlottedMedian': "(es)Median", // "Median"
  'DG.Inspector.graphPlottedStDev': "(es)Standard Deviation", // "Standard Deviation"
  'DG.Inspector.graphPlottedIQR': "(es)Interquartile Range", // "Interquartile Range"
  'DG.Inspector.graphPlottedBoxPlot': "(es)Box Plot",  // "Box Plot"
  'DG.Inspector.graphPlottedValue': "(es)Plotted Value", // "Plotted Value"

  // Table Inspector
  'DG.Inspector.attributes.toolTip': "(es)Make new attributes. Export case data.", // "Make new attributes. Export case data."
  'DG.Inspector.resize.toolTip': "(es)Resize all columns to fit data", // "Resize all columns to fit data"
  'DG.Inspector.newAttribute': "Nueva variable en %@...", // "New Attribute in %@..."
  'DG.Inspector.randomizeAllAttributes': "Aleatorizar todo de nuevo", // "Randomize Attributes"
  'DG.Inspector.exportCaseData': "Exportación de datos...", // "Export Case Data..."

  // Map Inspector
  'DG.Inspector.mapGrid': "Cuadrícula", // "Grid"
  'DG.Inspector.mapPoints': "Puntos", // "Points"
  'DG.Inspector.mapLines': "Las líneas que conectan", // "Connecting Lines"

  // Game Controller
  'DG.GameController.continuityError': 'En este momento, después de las columnas en la tabla de casos se han reordenado, los nuevos datos pueden no ser aceptadas.',

  // Game View
  'DG.GameView.loading': 'Cargando',
  'DG.GameView.loadError': 'Si puede ver este texto, la carga de la URL anterior puede haber fallado. Puede comprobar el enlace en otra pestaña del navegador o informar del error ahttp://codap.concord.org/help.',

  // Controllers
  'DG.Component.closeComponent.confirmCloseMessage': '¿Seguro?',
  'DG.Component.closeComponent.confirmCloseDescription': '',
  'DG.Component.closeComponent.okButtonTitle': 'Sí, cerrarla',
  'DG.Component.closeComponent.cancelButtonTitle': 'Cancelar',
  'DG.GameController.confirmCloseDescription': 'Si cierra esto, no puede ser capaz de añadir más datos',

  // Web View
  'DG.WebView.defaultTitle': '(es)Web Page'
  });
