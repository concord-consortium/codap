 // The data stored with each plot element (e.g. 'circle')
export type CaseData = { plotNum: number, caseID: string }

// The data stored with each plot element (e.g. 'circle') when subplots are used
export type CaseDataWithSubPlot = { plotNum: number; caseID: string; subPlotNum?: number }
