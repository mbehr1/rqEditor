import { Editable, Slate, withReact, ReactEditor, DefaultElement, RenderElementProps, RenderLeafProps } from "slate-react";
import { isKeyHotkey } from "is-hotkey";
import { createEditor, Descendant, BaseEditor, Range, Transforms, Node, Path, Editor as SlateEditor } from "slate";
import { useCallback, useMemo, useState } from "react";
import { withHistory } from 'slate-history';

import React from "react";

export type RQValue = string;

type RQJson = {
    type: 'RQJson',
    children: ({ text: string })[]
}

type RQDoc = {
    type: 'RQDoc',
    children: (RQJson)[]
}


declare module 'slate' {
    interface CustomTypes {
        Editor: BaseEditor & ReactEditor
        Element: RQDoc | RQJson,
        Text: { text: string }//, type?: string }
    }
}

const withRQElements = (editor: ReactEditor) => {
    const { normalizeNode } = editor;
    editor.normalizeNode = ([node, path]) => {
        return normalizeNode([node, path])
    }

    return editor
}

const deserialize = (obj: RQValue | undefined): Descendant[] => {
    console.log(`rq.deserialize(${JSON.stringify(obj)})...`)
    return [{ type: 'RQDoc', children: [{ type: 'RQJson', children: [{ text: "" }] }] }]
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
        const isValid = v.type === 'RQJson' ? true : false; // todo
        const type = v.type;
        return (isValid ? '+' : '-') + indentOffset + `${type}:[(#children=${v.children.length})\n` + debugObj(v.children, indent + 1);
    }
    if (typeof (v) === 'object' && 'type' in v) {
        const isValid = true;
        const type = v.type;
        return (isValid ? '+' : '-') + indentOffset + `${type}: '${v.text}'`;
    }
    if (typeof (v) === 'object' && 'text' in v) {
        return indentOffset + `text: '${v.text}'`;
    }
    return indentOffset + JSON.stringify(v, undefined)
}


const debugHtml = (value: Descendant[]) => {
    return debugObj('children' in value[0] ? value[0].children : value, 0);
}

export default function RQEditor({ object, getEditor }: { object: RQValue | undefined, onChange?: ((v: RQValue | undefined) => void), getEditor?: (ed: ReactEditor) => void }) {
    const editor = useMemo(() => withRQElements(withHistory(withReact(createEditor()))), []);
    const [document, setDocument] = useState(deserialize(object));

    if (getEditor) { getEditor(editor); }

    const renderElement = useCallback((props: RenderElementProps) => {
        switch (props.element.type) {
            case 'RQJson':
                //console.log(`renderElement JsonObject called`, props.element.children[0].children[0]);
                // <div contentEditable={false} style={{ userSelect: "none" }}>{'}'}</div>
                return (<pre style={{ backgroundColor: 'lightgrey' }}{...props.attributes}><code>{props.children}</code></pre >);
            default:
                //console.log(`renderElement ${props.element.type}...`);
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