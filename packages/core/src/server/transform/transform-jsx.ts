import MagicString from 'magic-string';
import { PathName, EscapeTags, isEscapeTags } from '../../shared';
import vueJsxPlugin from '@vue/babel-plugin-jsx';
// @ts-ignore
import { parse, traverse } from '@babel/core';
// @ts-ignore
import tsPlugin from '@babel/plugin-transform-typescript';
// @ts-ignore
import importMetaPlugin from '@babel/plugin-syntax-import-meta';
// @ts-ignore
import proposalDecorators from '@babel/plugin-proposal-decorators';

export function transformJsx(content: string, filePath: string, escapeTags: EscapeTags) {
  const s = new MagicString(content);

  const ast = parse(content, {
    babelrc: false,
    comments: true,
    configFile: false,
    plugins: [
      importMetaPlugin,
      [vueJsxPlugin, {}],
      [tsPlugin, { isTSX: true, allowExtensions: true }],
      [proposalDecorators, { legacy: true }],
    ],
  });

  traverse(ast!, {
    enter({ node }: any) {
      const openingElement = node?.openingElement;
      // JSXElement.openingElement.name can be a JSXIdentifier (<div>),
      // a JSXMemberExpression (<Foo.Bar>) or a JSXNamespacedName (<svg:g>).
      // We only need a display name for the inspector payload; any of
      // those are fine because we rely on the source range of the name
      // node rather than its textual form.
      const nameNode = openingElement?.name;
      const nodeName = nameNode?.name || '';
      const attributes = openingElement?.attributes || [];
      if (
        node.type === 'JSXElement' &&
        nodeName &&
        !isEscapeTags(escapeTags, nodeName)
      ) {
        if (
          attributes.some(
            (attr: any) =>
              attr.type !== 'JSXSpreadAttribute' && attr.name?.name === PathName
          )
        ) {
          return;
        }

        // Insert the inspector attribute right after the tag name, *before*
        // any existing attributes or spread props. This matters for wrapper
        // components (shadcn/ui, Radix, etc.) that forward `{...props}`:
        // React merges JSX attributes left-to-right, so putting our
        // definition-site path first lets the caller's usage-site path —
        // which was inserted at the `<Button …>` call site — spread in
        // afterwards and override it. Net result: clicking a shadcn Button
        // in the DOM jumps to where you *wrote* it, not to the library
        // component file. When no spread is present we gracefully fall
        // back to the definition-site path.
        const typeParameters =
          openingElement.typeParameters || openingElement.typeArguments;
        const insertPosition = typeParameters?.end || nameNode.end;
        const { line, column } = node.loc.start;
        const addition = ` ${PathName}="${filePath}:${line}:${
          column + 1
        }:${nodeName}"`;

        s.appendRight(insertPosition, addition);
      }
    },
  });

  return s.toString();
}
