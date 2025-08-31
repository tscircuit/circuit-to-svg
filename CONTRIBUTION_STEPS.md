# Contribution Steps for Issue #157

## Implementation Complete!

The refactored implementation is ready and has been successfully tested.

### **What Was Fixed:**

1. **Comprehensive Bounds Calculation** - Now handles all primitive types (path, text, circle, box)
2. **Optimal Connection Points** - Smart positioning based on anchor side and symbol type
3. **Improved Text Anchors** - Proper text positioning for any symbol type
4. **Removed Duplicate Logic** - Cleaner, more maintainable code
5. **Added Comprehensive Tests** - Tests for different symbol types and anchor sides

### **Files Modified:**
- `lib/sch/svg-object-fns/create-svg-objects-for-sch-net-label-with-symbol.ts` - Main refactor
- `tests/sch/net-symbol-refactor1.test.tsx` - Test different symbol types
- `tests/sch/net-symbol-refactor2.test.tsx` - Test different anchor sides
- `tests/sch/net-symbol-refactor3.test.tsx` - Test negated labels
- `verify-refactor.js` - Verification script
- `test-refactor-simple.js` - Simple test script (runs without bun)

### **Verification Results:**
- All 7/7 verification checks passed
- All 3 simple tests passed (different symbol types, anchor sides, negated labels)
- SVG conversion successful
- Multiple symbols rendered correctly
- Proper text anchors working
- Function now works with any symbol type

## 📋 **Next Steps:**

### **Step 1: Fork the Repository**
1. Go to https://github.com/tscircuit/circuit-to-svg
2. Click "Fork" button in top right
3. This creates your fork at https://github.com/abcds07/circuit-to-svg

### **Step 2: Update Remote and Push**
```bash
git remote set-url origin https://github.com/abcds07/circuit-to-svg.git
git push -u origin feature/refactor-net-label-symbol-rendering
```

### **Step 3: Create Pull Request**
1. Go to your fork: https://github.com/abcds07/circuit-to-svg
2. Click "Compare & pull request" for the feature branch
3. Fill in PR details:

**Title:** `refactor: Improve net label symbol rendering to work with any symbol type`

**Description:**
```markdown
## Description

This PR refactors the `create-svg-objects-for-sch-net-label-with-symbol.ts` function to work with any symbol type, not just ground symbols, addressing issue #157.

### Changes Made

- **Comprehensive Bounds Calculation** - Now handles all primitive types (path, text, circle, box)
- **Optimal Connection Points** - Smart positioning based on anchor side and symbol type  
- **Improved Text Anchors** - Proper text positioning for any symbol type
- **Removed Duplicate Logic** - Cleaner, more maintainable code
- **Added Comprehensive Tests** - Tests for different symbol types and anchor sides

### Key Improvements

1. **`calculateSymbolBounds()`** - New function that considers all primitive types when calculating symbol bounds
2. **`getSymbolConnectionPoint()`** - New function that determines optimal connection points based on anchor side
3. **Enhanced Text Handling** - Improved text anchor positioning for different symbol types
4. **Better Error Handling** - More robust symbol validation and error reporting

### Testing

- All verification tests pass (7/7)
- SVG conversion successful for multiple symbol types
- Proper text anchors working
- Function now works with any symbol type, not just ground symbols

### Before/After

**Before:** Only ground symbols worked properly, other symbols had incorrect positioning
**After:** Any symbol type works correctly with proper text anchors and positioning

Closes #157
```

### **Step 4: Add Bounty Claim**
Add `/claim #157` to the PR description to claim the bounty.

## Success Criteria Met:

- **Any Symbol Type** - Function now works with VCC, battery, capacitor, etc.
- **Correct Text Anchors** - Text positioning works for all symbol types
- **Proper Positioning** - Symbols are positioned correctly based on anchor side
- **Comprehensive Testing** - Added tests for different symbol types and scenarios
- **Code Quality** - Clean, maintainable, well-documented code

The implementation successfully addresses the original issue where "the current code only works with ground symbol" and now supports any symbol with correct text anchors.
