import React, {useEffect, useRef, useState} from "react"
import {parse} from 'papaparse'

export const DropHandler = () => {
  const drop = useRef<HTMLDivElement>(null),
    [outputText, setOutputText] = useState('No data')

  useEffect(function installListeners() {
    function dragOverHandler(event: DragEvent) {
      console.log('File(s) in drop zone')

      // Prevent default behavior (Prevent file from being opened)
      event.preventDefault()
    }

    function dropHandler(event: DragEvent) {
      console.log('File(s) dropped')

      function finishUp(results: any, aFile: any) {
        console.log("Parsing complete:", results, aFile)
        const attributes = Object.keys(results.data[0])
        setOutputText(`Parsed ${aFile.name}
        with ${results.data.length} cases and
        the following attributes: 
        
        ${attributes.join(', ')}`)
      }

      // Prevent default behavior (Prevent file from being opened)
      event.preventDefault()
      if (event.dataTransfer?.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < event.dataTransfer.items.length; i++) {
          // If dropped items aren't files, reject them
          if (event.dataTransfer.items[i].kind === 'file') {
            const file = event.dataTransfer.items[i].getAsFile()
            parse(file, {
              header: true,
              complete: finishUp,
            })
          }
        }
      }
      // Pass event to removeDragData for cleanup
      removeDragData(event)
    }

    function removeDragData(event: DragEvent) {
      if (event.dataTransfer) {
        if (event.dataTransfer.items) {
          // Use DataTransferItemList interface to remove the drag data
          event.dataTransfer.items.clear()
        } else {
          // Use DataTransfer interface to remove the drag data
          event.dataTransfer.clearData()
        }
      }
    }

    const currRef = drop.current
    if (drop.current) {
      console.log('Adding listeners')
      drop.current.addEventListener('dragover', dragOverHandler)
      drop.current.addEventListener('drop', dropHandler)
    }

    return () => {
      if (currRef) {
        currRef.removeEventListener('dragover', dragOverHandler)
        currRef.removeEventListener('drop', dropHandler)
      }
    }
  }, [])

  return (
    <div className={'drop-handler'} ref={drop}>
      <div className='output-text'>
        {outputText}
      </div>
    </div>
  )
}
