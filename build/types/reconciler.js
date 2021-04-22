"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isToStringAble = exports.isAccountDataField = void 0;
function isAccountDataField(thing) {
    return (typeof thing === 'string' &&
        ['free', 'reserved', 'miscFrozen', 'feeFrozen'].includes(thing));
}
exports.isAccountDataField = isAccountDataField;
/**
 * @param thing some to check if toString`
 * @returns Whether or not an object can have `.toString` called on it.
 */
function isToStringAble(thing) {
    return typeof thing.toString === 'function';
}
exports.isToStringAble = isToStringAble;
//# sourceMappingURL=reconciler.js.map