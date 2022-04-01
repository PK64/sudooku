// group 0
const MODE_NORMAL = "normal"
const MODE_CORNER = "corner"
const MODE_CENTRE = "centre"
const MODE_FIXED = "fixed"
const MODE_COLOUR = "colour"

// group 1
const MODE_PEN = "pen"

// marks placement mode
const MARKS_PLACEMENT_DEFAULT = "default"
const MARKS_PLACEMENT_FIXED = "fixed"

module.exports = {
  // group 0
  MODE_NORMAL,
  MODE_CORNER,
  MODE_CENTRE,
  MODE_FIXED,
  MODE_COLOUR,

  // group 1
  MODE_PEN,

  // marks placement mode
  MARKS_PLACEMENT_DEFAULT,
  MARKS_PLACEMENT_FIXED,

  getModeGroup(mode) {
    switch (mode) {
      case MODE_NORMAL:
      case MODE_CORNER:
      case MODE_CENTRE:
      case MODE_FIXED:
      case MODE_COLOUR:
        return 0

      case MODE_PEN:
        return 1
    }
  }
}
