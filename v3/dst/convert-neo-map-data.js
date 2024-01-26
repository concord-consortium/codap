#!/usr/bin/env node

/*
  This script converts the NEO map data to a CSV that can be imported to CODAP

  Currently it restricts the data to be within the contiguous United States so that we create CSVs of the size that CODAP can handle.

  This *should* handle any type of data as long as it uses the NEO format.
*/

const fs = require("fs")
const path = require("path")
const Papa = require("papaparse")

const args = process.argv.slice(2)

if (args.length !== 2) {
  console.error("Usage: ./convert-neo-map-data.js <path-to-input-csv-folder> <path-to-output-csv-folder>\n\nThe csv folder should contain files named <month>_<year>.csv and contain NEO precipitation data.")
  process.exit(1)
}
const inputDirPath = args[0]
const outputDirPath = args[1]

if (!fs.statSync(inputDirPath).isDirectory()) {
  console.error(`Error: ${inputDirPath} is not a directory`)
  process.exit(2)
}
if (!fs.statSync(outputDirPath).isDirectory()) {
  console.error(`Error: ${outputDirPath} is not a directory`)
  process.exit(3)
}

console.log(`Reading csv files in ${inputDirPath} and writing single csv file to ${outputDirPath}`)

// contiguous US
const northernMost = 50;
const westernMost = -125;
const southernMost = 24.5;
const easternMost = -65;

const output = []
const dates = []
fs.readdirSync(inputDirPath).forEach(filePath => {
  const fullPath = path.join(inputDirPath, filePath)
  const [filename, extension] = filePath.toLowerCase().split(".")
  if (extension === "csv") {
    const [monthname, year] = filename.split("_")
    const date = (new Date(`${monthname} 1, ${year}`)).toLocaleDateString("en-CA")
    dates.push(date)
    const contents = fs.readFileSync(fullPath, "utf8")
    const input = Papa.parse(contents, {
      header: true,
      dynamicTyping: true,
    })
    input.data.forEach(row => {
      const lat = row['lat/lon']
      if ((lat > northernMost) || (lat < southernMost)) {
        return
      }
      delete row['lat/lon']
      Object.keys(row).forEach(long => {
        if ((long < westernMost) || (long > easternMost)) {
          return
        }
        output.push({lat, long, date, observation: row[long]})
      })
    })
  }
})
output.sort((a, b) => {
  let result = a.lat - b.lat
  if (result === 0) {
    result = a.long - b.long
    if (result === 0) {
      result = a.date.localeCompare(b.date)
    }
  }
  return result
})

dates.sort()
const startDate = dates.shift()
const endDate = dates.pop()
const outputPath = path.join(outputDirPath, `${startDate}-to-${endDate}.csv`)

fs.writeFileSync(outputPath, Papa.unparse(output))
console.log(`Wrote ${output.length} rows to ${outputPath}`)
