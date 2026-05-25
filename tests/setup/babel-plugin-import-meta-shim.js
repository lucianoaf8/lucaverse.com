/**
 * Babel plugin: replace import.meta.env with a test-safe object.
 * Used in jest.config.js transform to allow src files that use import.meta.env
 * (api.js, logger.js) to be executed under Jest/jsdom without errors.
 *
 * Replaces: import.meta.env  →  { DEV: true, MODE: 'test', VITE_*: undefined }
 * Replaces: import.meta.env.DEV  →  true  (via the parent MemberExpression handler)
 */
module.exports = function importMetaShimPlugin({ types: t }) {
  return {
    visitor: {
      MemberExpression(nodePath) {
        const { node } = nodePath;

        // Match: import.meta
        const isImportMeta =
          t.isMetaProperty(node.object) &&
          node.object.meta.name === 'import' &&
          node.object.property.name === 'meta';

        if (!isImportMeta) return;

        // Match: import.meta.env
        if (t.isIdentifier(node.property) && node.property.name === 'env') {
          // Replace with safe env object
          nodePath.replaceWith(
            t.objectExpression([
              t.objectProperty(t.identifier('DEV'), t.booleanLiteral(true)),
              t.objectProperty(t.identifier('MODE'), t.stringLiteral('test')),
              t.objectProperty(t.stringLiteral('VITE_AUTH_API_URL'), t.identifier('undefined')),
              t.objectProperty(t.stringLiteral('VITE_FORMS_API_URL'), t.identifier('undefined')),
              t.objectProperty(t.stringLiteral('VITE_NEWSLETTER_URL'), t.identifier('undefined')),
              t.objectProperty(t.stringLiteral('VITE_APP_URL'), t.identifier('undefined')),
            ])
          );
        }
      }
    }
  };
};
