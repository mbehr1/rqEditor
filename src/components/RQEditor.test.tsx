import RQEditor from './RQEditor';
import { serialize, RQValue } from './RQEditor';
import { create, act /*, ReactTestRenderer*/ } from 'react-test-renderer';
import { withReact, ReactEditor } from 'slate-react';
import { BaseEditor, createEditor, Transforms, Node, Editor as SlateEditor } from 'slate';

/* bugs:
 [ ] enter to use line breaks doesn't work
 [ ] editing arrays (partly works. change of type does not. e.g. [1,2]-> [1,false,2])
 [ ] deleting an array member leads to normalization loop
 [ ] enter while typing a string (so at the end of the string)
*/


const createNodeMock = () => ({
    ownerDocument: global.document,
    getRootNode: () => global.document,
})

const testInputText = async (editor: BaseEditor & ReactEditor, inputChars: string, expectedObj: RQValue | undefined, expectedText: string) => {
    console.warn(`testInputText :'${inputChars}'`, expectedObj);
    // first: input char by char

    // slate updates at next tick, so we need this to be async
    await act(async () => {
        //Transforms.splitNodes(editor, { at: { path: [0, 0], offset: 2 } })
        Transforms.select(editor, { anchor: SlateEditor.start(editor, []), focus: SlateEditor.start(editor, []) });
        console.log(`sending: '${inputChars.slice(0, 1)}'`);
        Transforms.insertText(editor, inputChars.slice(0, 1)); // , { at: firstPath });
        for (let i = 1; i < inputChars.length; ++i) {
            console.log(`sending: '${inputChars.slice(i, i + 1)}'`);
            Transforms.insertText(editor, inputChars.slice(i, i + 1));
        }
    })
    console.log(`editor.children=${JSON.stringify(editor.children)}`);
    //console.log(`expectedText='${expectedText}'`);
    expect(editor.children.length).toBe(1);
    expect(Node.string(editor)).toBe(expectedText);
    if (expectedObj !== undefined) {
        // expect(isValidJson(editor.children[0])).toBeTruthy();
        const convObj = serialize(editor.children);
        expect(convObj).toEqual(expectedObj);
    }
}


test('editor enter valid rq', async () => {
    const editor: (BaseEditor & ReactEditor) = withReact(createEditor());// only to avoid undefined issues...

    const testInput = async (obj: RQValue, expectedText?: string) => {
        const inputChars = JSON.stringify(obj);
        return testInputText(editor, inputChars, obj, expectedText ? expectedText : inputChars)
    }

    await testInput("")
})
