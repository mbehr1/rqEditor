import { Editable, Slate, withReact, ReactEditor, DefaultElement, RenderElementProps, RenderLeafProps } from "slate-react";
import { isKeyHotkey } from "is-hotkey";
import { createEditor, Descendant, BaseEditor, Range, Transforms, Node, Path, Editor as SlateEditor } from "slate";
import { useCallback, useMemo, useState } from "react";
import { withHistory } from 'slate-history';

import React from "react";

import { Editor as JSONEditor } from "json-editor"
import { TSJSONValue } from "json-editor/dist/Editor";

export type RQValue = string;

/**
 * // parse as regex: ^\/(?<cmd>.*?)\/(?<path>.*?)($|\?(?<options>.+)$)
        var re = /^\/(?<cmd>.*?)\/(?<path>.*?)($|\?(?<options>.+)$)/;
        // options are splitted/separated by & but then decodeURIComponent... on part after =
 * example:
 ext:mbehr1.dlt-logs/get/docs/0/filters?
delete={
  "tmpFb": 1
}
 &
disableAll=view &
add={
  "lifecycles": "${attributes.lifecycles.id}",
  "name": "not selected lifecycles",
  "not": true,
  "tmpFb": 1,
  "type": 1
}
 */

type RQText = {
    children: { text: string }[],
}

type RQJson = {
    type: 'RQJson',
    jsonValue: TSJSONValue,
    children: ({ text: string })[]
}

type RQDoc = {
    type: 'RQDoc',
    children: (RQText | RQJson)[]
}


declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor
        Element: RQDoc | RQJson | RQText,
        Text: { text: string }//, type?: string }
    }
}

const deserialize = (obj: RQValue | undefined): Descendant[] => {
    console.log(`rq.deserialize(${JSON.stringify(obj)})...`)
    return [{ type: 'RQDoc', children: [{ children: [{ text: 'ext:mbehr1.dlt-logs/get/docs/0/filters?delete=' }] }, { type: 'RQJson', jsonValue: { 'foo': true }, children: [{ text: '' }/* needed for selection*/] }] }]
}

export const serialize = (value: Descendant[]): RQValue | undefined => {
    console.log(`rq.serialize(value=${JSON.stringify(value)})...`)
    return undefined
}

const debugObj = (v: Descendant | Descendant[], indent: number): string => {
    const indentOffset = (' '.repeat(indent));
    if (Array.isArray(v)) {
        return indentOffset + v.map(e => debugObj(e, indent)).join('\n' + indentOffset);
    }
    if (typeof (v) === 'object' && 'children' in v) {
        const isValid = 'type' in v && v.type !== 'RQDoc' ? true : false; // todo
        const type = 'type' in v ? v.type : undefined;
        return (isValid ? '+' : '-') + indentOffset + `${type}:[(#children=${v.children.length})\n` + debugObj(v.children, indent + 1);
    }
    if (typeof (v) === 'object' && 'type' in v) {
        const isValid = true;
        const type = v.type;
        return (isValid ? '+' : '-') + indentOffset + `${type}: '${'text' in v ? v.text : JSON.stringify(v)}'`;
    }
    if (typeof (v) === 'object' && 'text' in v) {
        return indentOffset + `text: '${v.text}'`;
    }
    return indentOffset + JSON.stringify(v, undefined)
}


const debugHtml = (value: Descendant[]) => {
    return debugObj('children' in value[0] ? value[0].children : value, 0);
}

const withRQElements = (editor: ReactEditor) => {
    const { normalizeNode, isVoid, isInline } = editor;
    editor.normalizeNode = ([node, path]) => {
        return normalizeNode([node, path])
    }

    editor.isInline = element => ('type' in element && element.type === 'RQJson' ? false : isInline(element))
    editor.isVoid = element => ('type' in element && element.type === 'RQJson' ? true : isVoid(element)) // no text

    return editor
}

export default function RQEditor({ object, getEditor }: { object: RQValue | undefined, onChange?: ((v: RQValue | undefined) => void), getEditor?: (ed: ReactEditor) => void }) {
    const editor = useMemo(() => withRQElements(withHistory(withReact(createEditor()))), []);
    const [document, setDocument] = useState(deserialize(object));

    if (getEditor) { getEditor(editor); }

    const renderElement = useCallback((props: RenderElementProps) => {
        if ('type' in props.element) {
        switch (props.element.type) {
            case 'RQJson': {
                //console.log(`renderElement JsonObject called`, props.element.children[0].children[0]);
                // <div contentEditable={false} style={{ userSelect: "none" }}>{'}'}</div>
                const je = JSONEditor.default({ object: props.element.jsonValue });
                return <div {...props.attributes}><div contentEditable={false}>{je}</div>{props.children}</div>;
            }
            default:
                //console.log(`renderElement ${props.element.type}...`);
                return <DefaultElement {...props} />
        }
        } else {
            return <DefaultElement {...props} />
        }
    }, []);

    const renderLeaf = useCallback(({ attributes, children, leaf }: RenderLeafProps) => {
        let el = <>{children}</>;
        if ('type' in leaf) {
            switch (leaf.type) {
                default: el = <u>{el}</u>; break;
            }
        } else {
            return <span {...attributes}>{el}</span >;
        }

        return <span {...attributes} title={'' + leaf.type}>{el}</span >;
    }, []);

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = event => {
        const { selection } = editor
        // Default left/right behavior is unit:'character'.
        // This fails to distinguish between two cursor positions, such as
        // <inline>foo<cursor/></inline> vs <inline>foo</inline><cursor/>.
        // Here we modify the behavior to unit:'offset'.
        // This lets the user step into and out of the inline without stepping over characters.
        // You may wish to customize this further to only use unit:'offset' in specific cases.
        if (selection && Range.isCollapsed(selection)) {
            const { nativeEvent } = event
            if (isKeyHotkey('left', nativeEvent)) {
                //console.log(`onKeyDown(left)...`, selection);
                event.preventDefault()
                Transforms.move(editor, { unit: 'character', reverse: true })
                return
            }
            if (isKeyHotkey('right', nativeEvent)) {
                //console.log(`onKeyDown(right)...path=${selection.anchor.path.join('/')}:${selection.anchor.offset}`);
                event.preventDefault()
                Transforms.move(editor, { unit: 'character' })
                return
            }
        }
    }

    return (
        <React.Fragment>
            <Slate editor={editor} value={document} onChange={value => { /*console.log('onChange...'); */setDocument(value); }} /*const serialized = serialize(value); if (serialized !== undefined) { onChange(serialized); } }}*/>
                <Editable
                    renderElement={renderElement}
                    renderLeaf={renderLeaf}
                    onKeyDown={onKeyDown}
                />
            </Slate>
            <pre style={{ whiteSpace: 'pre', textAlign: 'left' }}>
                <code>
                    {debugHtml(document)}
                </code>
            </pre>
            As JSON:
            <pre style={{ whiteSpace: 'pre', textAlign: 'left' }}>
                <code>
                    {JSON.stringify(serialize(document), null, 2)}
                </code>
            </pre>
        </React.Fragment>
    );
}