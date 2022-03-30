
const GRID_WIDTH = 3
const GRID_HEIGHT = 3

function splitRowStrings(digitsString) {
  const gridLength = GRID_WIDTH * GRID_HEIGHT
  let rowStrings = new Array(gridLength)
  for (let row=0, start=0; row < gridLength; row++, start+=gridLength) {
    rowStrings[row] = digitsString.substr(start, gridLength)
  }
  return rowStrings
}

function makeDefaultRegions() {
  let width = GRID_WIDTH
  let height = GRID_HEIGHT
  let regions = []
  for (let rx = 0; rx < width; ++rx) {
    for (let ry = 0; ry < height; ++ry) {
      let regionIndex = ry + rx * height
      regions[regionIndex] ||= []
      for (let row = 0; row < height; ++row) {
        for (let col = 0; col < width; ++col) {
          regions[regionIndex][col + row * width] ||= [ry * height + row, rx * width + col]
        }
      }
    }
  }
  return regions
}

export function convertGivenDigits(digitsString) {
  let digitsLen = digitsString.length
  let expectedLen = GRID_WIDTH * GRID_HEIGHT * GRID_WIDTH * GRID_HEIGHT
  if (digitsLen < expectedLen) {
    digitsString = digitsString.concat("0".repeat(expectedLen-digitsLen))
  }

  let rowStrings = splitRowStrings(digitsString)
  let cells = rowStrings.map(s => {
    return s.split("").map(c => {
      if (c >= "1" && c <= "9") {
        return {
          value: c
        }
      } else {
        return {}
      }
    })
  })

  let regions = makeDefaultRegions()

  let result = {
    cellSize: 50,
    cells,
    regions
  }

  return result
}
