
class Document{

    canvas(){
        return('.canvas')
    }
    // Left Workspace elements
    aboutImagePaletteTab(){
        return ('.top-node-palette-tab')
    }
    aboutImageTitle(){
        return('.palette-about-image-title')
    }
    deleteImage(){
        return ('.palette-delete')
    }

    addNewImageButton() {
        return ('.palette-add-image')
    }
    paletteNode(){
        return('div[data-droptype="paletteItem"]')
    }
    // imageNode(){
    //     return('.container .ui-droppable .ui-droppable-active .ui-droppable-hover .ui-state-highlight')
    // }



    // Simulate panel elements
    simulateToggleExpand(){
        return ('.simulation-run-panel > .flow > .icon-codap-inspectorArrow-expand')
    }
    simulateToggleCollapse(){
        return ('.simulation-run-panel > .flow > .icon-codap-inspectorArrow-collapse')
    }
    experimentCounter(){
        return ('.experiment-counter > .count')
    }
    experimentIncrementButton(){
        return ('.experiment-counter > .increment')
    }
    recordDataPointButton(){
        return ('.simulation-run-panel .buttons .vertical .horizontal > .button > .horizontal > .vertical > .horizontal > span')
    }
    recordDataStreamButton(){
        return ('.simulation-run-panel .buttons .vertical .horizontal > .button > .horizontal > .vertical > .horizontal > span')
    }
    recordDataButton(){
        return ('.simulation-run-panel .buttons .vertical .horizontal > .button > .horizontal > .vertical > .horizontal > span')
    }

    undoButton(){
        return ('.misc-actions > .icon-codap-arrow-undo')
    }
    redoButton(){
        return ('.misc-actions > .icon-codap-arrow-redo')
    }
    infoButton(){
        return('.icon-codap-help')
    }

    // Tool palette elements
    toolButtons(){
        return ('.inspector-panel .tool-panel .tool-button')
    }
    styleToolButton(){
        return ('.inspector-panel .tool-panel .icon-codap-styles')
    }
    valuesToolButton(){
        return ('.inspector-panel .tool-panel .icon-codap-values')
    }
    qualitativeRelationshipToolButton(){
        return ('.inspector-panel .tool-panel .icon-codap-qualRel')
    }
    simSettingsToolButton(){
        return ('.inspector-panel .tool-panel .icon-codap-options');
    }

}

export default Document;
