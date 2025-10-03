/**
 * Shared pinout layout constants (in millimeters unless noted).
 * Keep these values unit-consistent and import wherever needed.
 */
export const LABEL_RECT_HEIGHT_BASE_MM = 1.6 // base height for label pill/rect in mm

// Text sizing ratios
export const FONT_HEIGHT_RATIO = 11 / 21
export const CHAR_WIDTH_FACTOR = 0.6

// Stagger geometry
export const STAGGER_OFFSET_MIN = 0.1 // mm
export const STAGGER_OFFSET_PER_PIN = 0.1 // mm
export const STAGGER_OFFSET_STEP = 3 // mm
export const ALIGNED_OFFSET_MARGIN = 0.1 // mm

// Vertical gap between primary and non-primary label stacks
export const GROUP_SEPARATION_MM = 0.8 // mm
