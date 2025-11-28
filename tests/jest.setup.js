// Polyfill Object.hasOwn for environments that lack it (Node <18)
if (typeof Object.hasOwn !== 'function') {
  Object.hasOwn = function hasOwn(obj, prop) {
    // eslint-disable-next-line no-prototype-builtins
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}
